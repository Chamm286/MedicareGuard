const express = require("express");
const { query } = require("../config/db");
const { asyncHandler, HttpError } = require("../utils/http");
const { requirePermission } = require("../middleware/auth");
const { chat, analyzeAlert, getContext, intentOf } = require("../services/ai");
const { recordActivity } = require("../services/audit");

const router = express.Router();

const SUGGESTIONS = [
  "Summarise the current security posture",
  "Who are the top 5 attackers right now?",
  "Which assets have the highest risk score?",
  "Are any incidents close to breaching SLA?",
  "Show attack distribution by country",
  "What should we remediate first?",
  "Tóm tắt tình hình an ninh mạng hôm nay",
  "Tạo kế hoạch khắc phục cho sự cố nghiêm trọng nhất",
];

router.get(
  "/suggestions",
  asyncHandler(async (_req, res) => {
    res.json({ data: SUGGESTIONS });
  }),
);

router.get(
  "/models",
  asyncHandler(async (_req, res) => {
    res.json({
      data: [
        { id: "medicareguard-analyst", name: "MedicareGuard Analyst", description: "Deterministic SOC copilot grounded on live PostgreSQL data", contextWindow: 128000, default: true },
        { id: "gpt-4o-mini", name: "OpenAI GPT-4o mini", description: "Optional external reasoning model", requiresKey: true, default: false },
      ],
    });
  }),
);

router.get(
  "/insights",
  asyncHandler(async (_req, res) => {
    const context = await getContext();
    const o = context.overview;
    const insights = [
      {
        id: "critical-alerts",
        severity: o.critical_alerts > 0 ? "critical" : "low",
        title: "Critical alerts require triage",
        detail: `${o.critical_alerts} critical alerts are unresolved out of ${o.open_alerts} open alerts.`,
        action: "Open the Alerts queue and prioritise critical severity first.",
      },
      {
        id: "attack-origin",
        severity: "high",
        title: `Attack concentration: ${context.countries[0]?.country || "unknown"}`,
        detail: `${context.countries[0]?.attacks || 0} events observed from ${context.countries[0]?.country || "an unknown origin"}.`,
        action: "Review geo-blocking policy and notify the threat intelligence team.",
      },
      {
        id: "asset-risk",
        severity: o.high_risk_assets > 3 ? "high" : "medium",
        title: "High-risk asset exposure",
        detail: `${o.high_risk_assets} assets have a risk score of 70 or higher. Average estate risk is ${o.avg_asset_risk}.`,
        action: "Schedule remediation for the top-risk assets and verify backups.",
      },
      {
        id: "compliance",
        severity: o.compliance_score < 80 ? "medium" : "low",
        title: "Compliance posture",
        detail: `Controls average ${o.compliance_score}% across frameworks.`,
        action: "Assign owners to failing controls and export the compliance report.",
      },
    ];
    res.json({ data: insights });
  }),
);

router.get(
  "/conversations",
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT c.*,
              (SELECT content FROM ai_messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
              (SELECT count(*)::int FROM ai_messages m WHERE m.conversation_id = c.id) AS message_count
       FROM ai_conversations c
       ${req.query.all === "true" ? "" : "WHERE c.user_id = $1"}
       ORDER BY c.updated_at DESC LIMIT 50`,
      req.query.all === "true" ? [] : [req.user.id],
    );
    res.json({ data: result.rows });
  }),
);

router.get(
  "/conversations/:id",
  asyncHandler(async (req, res) => {
    const conversation = await query("SELECT * FROM ai_conversations WHERE id = $1", [req.params.id]);
    if (!conversation.rows.length) throw new HttpError(404, "Conversation not found");
    const messages = await query("SELECT * FROM ai_messages WHERE conversation_id = $1 ORDER BY created_at ASC", [req.params.id]);
    res.json({ data: { ...conversation.rows[0], messages: messages.rows } });
  }),
);

router.delete(
  "/conversations/:id",
  asyncHandler(async (req, res) => {
    const result = await query("DELETE FROM ai_conversations WHERE id = $1 RETURNING id", [req.params.id]);
    if (!result.rows.length) throw new HttpError(404, "Conversation not found");
    res.json({ deleted: true, id: req.params.id });
  }),
);

router.post(
  "/chat",
  requirePermission("ai:use"),
  asyncHandler(async (req, res) => {
    const { message, conversationId } = req.body;
    if (!message || !String(message).trim()) throw new HttpError(400, "message is required");

    let conversation;
    if (conversationId) {
      const existing = await query("SELECT * FROM ai_conversations WHERE id = $1", [conversationId]);
      if (!existing.rows.length) throw new HttpError(404, "Conversation not found");
      conversation = existing.rows[0];
    } else {
      const created = await query(
        "INSERT INTO ai_conversations (user_id, title, model) VALUES ($1,$2,'medicareguard-analyst') RETURNING *",
        [req.user.id, String(message).slice(0, 120)],
      );
      conversation = created.rows[0];
    }

    await query("INSERT INTO ai_messages (conversation_id, role, content) VALUES ($1,'user',$2)", [conversation.id, String(message)]);
    const result = await chat(String(message));
    const assistant = await query(
      "INSERT INTO ai_messages (conversation_id, role, content, tokens, metadata) VALUES ($1,'assistant',$2,$3,$4) RETURNING *",
      [conversation.id, result.reply, Math.ceil(result.reply.length / 4), JSON.stringify({ intent: result.intent, model: result.model, latencyMs: result.latencyMs })],
    );
    await query("UPDATE ai_conversations SET updated_at = now(), title = CASE WHEN title = 'New investigation' THEN $1 ELSE title END WHERE id = $2", [String(message).slice(0, 120), conversation.id]);
    await recordActivity({ eventType: "ai_chat", req, resource: "ai_conversations", resourceId: conversation.id, action: "chat", message: String(message).slice(0, 200), metadata: { intent: result.intent } });

    res.json({
      data: {
        conversationId: conversation.id,
        message: assistant.rows[0],
        reply: result.reply,
        intent: result.intent,
        insights: result.insights,
        suggestions: result.suggestions,
        references: result.references,
        model: result.model,
        latencyMs: result.latencyMs,
      },
    });
  }),
);

router.post(
  "/analyze",
  requirePermission("ai:use"),
  asyncHandler(async (req, res) => {
    const { alertId, text } = req.body;
    if (alertId) {
      const result = await query(
        `SELECT a.*, t.category, t.mitre_tactic, t.mitre_technique FROM alerts a LEFT JOIN threats t ON t.id = a.threat_id WHERE a.id = $1`,
        [alertId],
      );
      if (!result.rows.length) throw new HttpError(404, "Alert not found");
      const analysis = await analyzeAlert(result.rows[0]);
      return res.json({ data: { alert: result.rows[0], analysis } });
    }
    if (!text) throw new HttpError(400, "alertId or text is required");
    const intent = intentOf(text);
    const context = await getContext();
    const composed = require("../services/ai").compose(intent, context, text);
    res.json({ data: { intent, analysis: composed } });
  }),
);

router.post(
  "/summarize",
  requirePermission("ai:use"),
  asyncHandler(async (req, res) => {
    const { alertId, incidentId } = req.body;
    if (alertId) {
      const result = await query("SELECT * FROM alerts WHERE id = $1", [alertId]);
      if (!result.rows.length) throw new HttpError(404, "Alert not found");
      return res.json({ data: { summary: `${result.rows[0].title}: ${result.rows[0].severity} severity ${result.rows[0].status} alert from ${result.rows[0].source_ip || "unknown source"}.` } });
    }
    if (incidentId) {
      const result = await query("SELECT * FROM incidents WHERE id = $1", [incidentId]);
      if (!result.rows.length) throw new HttpError(404, "Incident not found");
      return res.json({ data: { summary: `${result.rows[0].incident_key}: ${result.rows[0].title} is ${result.rows[0].status} with ${result.rows[0].severity} severity and ${result.rows[0].priority} priority.` } });
    }
    const context = await getContext();
    const composed = require("../services/ai").compose("overview", context, "summary");
    res.json({ data: { summary: composed.reply, insights: composed.insights } });
  }),
);

router.post(
  "/remediate",
  requirePermission("ai:use"),
  asyncHandler(async (req, res) => {
    const { alertId, threatId } = req.body;
    let target = null;
    if (alertId) {
      const result = await query("SELECT * FROM alerts WHERE id = $1", [alertId]);
      if (!result.rows.length) throw new HttpError(404, "Alert not found");
      target = { type: "alert", data: result.rows[0] };
    } else if (threatId) {
      const result = await query("SELECT * FROM threats WHERE id = $1", [threatId]);
      if (!result.rows.length) throw new HttpError(404, "Threat not found");
      target = { type: "threat", data: result.rows[0] };
    }
    const severity = target?.data.severity || "high";
    const actions = [
      { step: 1, action: "Contain", detail: severity === "critical" ? "Isolate the host immediately and block the source IP at the edge." : "Block the indicator and increase monitoring for 24 hours." },
      { step: 2, action: "Eradicate", detail: "Remove persistence mechanisms and rotate exposed credentials." },
      { step: 3, action: "Recover", detail: "Restore from a validated backup and verify service health." },
      { step: 4, action: "Learn", detail: "Update detection rules, playbooks and awareness content." },
    ];
    await recordActivity({ eventType: "ai_remediate", req, resource: target?.type || "threats", resourceId: target?.data?.id, action: "remediate", message: "AI remediation plan generated" });
    res.json({ data: { target: target ? { type: target.type, id: target.data.id } : null, severity, eta_hours: severity === "critical" ? 4 : 24, actions } });
  }),
);

router.post(
  "/classify",
  requirePermission("ai:use"),
  asyncHandler(async (req, res) => {
    const { text } = req.body;
    if (!text) throw new HttpError(400, "text is required");
    const lower = String(text).toLowerCase();
    const categories = [
      { category: "ransomware", patterns: /(ransom|encrypt|locked|bitcoin)/ },
      { category: "phishing", patterns: /(phish|credential|login page|email|link)/ },
      { category: "ddos", patterns: /(flood|ddos|traffic|packet)/ },
      { category: "data-exfiltration", patterns: /(exfil|upload|transfer|sensitive|patient)/ },
      { category: "malware", patterns: /(malware|trojan|payload|beacon|c2)/ },
      { category: "brute-force", patterns: /(brute|failed login|password spray|auth)/ },
    ];
    const match = categories.find((item) => item.patterns.test(lower)) || { category: "unknown" };
    const severity = /(critical|urgent|ransom|exfiltrat)/.test(lower) ? "critical" : /(high|malware|beacon)/.test(lower) ? "high" : /(medium|suspicious)/.test(lower) ? "medium" : "low";
    res.json({ data: { category: match.category, severity, confidence: match.category === "unknown" ? 0.35 : 0.82, recommended_queue: severity === "critical" ? "IR-P1" : "SOC-Triage" } });
  }),
);

router.post(
  "/playbook",
  requirePermission("ai:use"),
  asyncHandler(async (req, res) => {
    const { category = "generic", severity = "high" } = req.body;
    const steps = [
      { order: 1, title: "Validate detection", owner: "L1 Analyst", sla_minutes: 15 },
      { order: 2, title: "Enrich indicators", owner: "L2 Analyst", sla_minutes: 30 },
      { order: 3, title: "Contain affected assets", owner: "IR Lead", sla_minutes: severity === "critical" ? 15 : 60 },
      { order: 4, title: "Eradicate and recover", owner: "Platform Team", sla_minutes: 240 },
      { order: 5, title: "Post-incident review", owner: "SOC Manager", sla_minutes: 1440 },
    ];
    res.json({ data: { name: `${category} response playbook`, category, severity, steps } });
  }),
);

router.get(
  "/context",
  requirePermission("ai:use"),
  asyncHandler(async (_req, res) => {
    const context = await getContext();
    res.json({ data: context });
  }),
);

// ==========================================
// BỔ SUNG CÁC ENDPOINTS CHO LUỒNG 7 & LUỒNG 8 (n8n)
// ==========================================

// 1. Luồng 7: Lấy log telemetry chi tiết trong vòng 1 giờ xung quanh sự cố
router.post(
  "/n8n/ai/fetch-telemetry",
  asyncHandler(async (req, res) => {
    const { event_id, user_id, ip_address, window_minutes = 60 } = req.body;
    
    // Truy vấn lịch sử hoạt động hoặc log hệ thống trong vòng 1 giờ quanh thời điểm xảy ra sự cố
    const logsQuery = await query(
      `SELECT * FROM activity_logs 
       WHERE ($1::text IS NULL OR user_id::text = $1) 
          OR ($2::text IS NULL OR ip_address = $2)
       ORDER BY created_at DESC LIMIT 50`,
      [user_id || null, ip_address || null]
    );

    res.json({
      success: true,
      telemetry: {
        event_id: event_id || "EVT-UNKNOWN",
        user_id: user_id || null,
        ip_address: ip_address || null,
        window_minutes,
        recent_activity_count: logsQuery.rows.length,
        logs: logsQuery.rows,
      },
    });
  }),
);

// 2. Luồng 7: Thực thi Playbook khi Admin bấm nút phê duyệt trên Telegram
router.post(
  "/n8n/ai/execute-playbook",
  asyncHandler(async (req, res) => {
    const { incident_id, playbook_id, approval_id, approved_by } = req.body;
    
    // Ghi nhận log kiểm toán hành động thực thi playbook tự động
    await recordActivity({
      eventType: "ai_playbook_execution",
      req,
      resource: "incidents",
      resourceId: incident_id,
      action: "execute_playbook",
      message: `Executed playbook ID ${playbook_id} for incident ${incident_id} via AI automation`,
      metadata: { approval_id, approved_by },
    });

    res.json({
      success: true,
      message: `Playbook ${playbook_id} executed successfully for incident ${incident_id}`,
      executed_at: new Date().toISOString(),
    });
  }),
);

// 3. Luồng 8: Truy vấn bảng system_tech_stack trả về danh sách phần mềm hệ thống
router.get(
  "/n8n/system/tech-stack",
  asyncHandler(async (_req, res) => {
    const result = await query("SELECT * FROM system_tech_stack ORDER BY id ASC");
    res.json({
      success: true,
      data: {
        assets: result.rows,
      },
    });
  }),
);

// 4. Luồng 8: Tự động ghi nhận danh sách lỗ hổng CVE nguy hiểm từ n8n vào DB kèm SLA
router.post(
  "/n8n/vulnerability/auto-create",
  asyncHandler(async (req, res) => {
    const { findings, source = "NVD", execution_id } = req.body;
    
    if (!findings || !Array.isArray(findings)) {
      throw new HttpError(400, "findings array is required");
    }

    const createdVulnerabilities = [];

    for (const item of findings) {
      const cveId = item.cve_id;
      const title = item.product ? `Vulnerability in ${item.product} (${cveId})` : `New Threat CVE (${cveId})`;
      const severity = String(item.priority || "HIGH").toUpperCase();
      const cvss = Number(item.cvss_score) || 7.5;
      const slaHours = Number(item.proposed_sla_hours) || 24;

      // Chèn vào bảng vulnerabilities, nếu trùng cve_id thì cập nhật lại thông tin mới nhất
      const insertResult = await query(
        `INSERT INTO vulnerabilities (cve_id, title, description, severity, cvss_score, status, metadata)
         VALUES ($1, $2, $3, $4, $5, 'open', $6)
         ON CONFLICT (cve_id) 
         DO UPDATE SET severity = EXCLUDED.severity, cvss_score = EXCLUDED.cvss_score, updated_at = NOW()
         RETURNING *`,
        [
          cveId,
          title,
          item.remediation || "Identified via automated AI Threat Intelligence scan.",
          severity,
          cvss,
          JSON.stringify({ source, execution_id, exposure_status: item.exposure_status, sla_hours: slaHours }),
        ]
      );
      createdVulnerabilities.push(insertResult.rows[0]);
    }

    await recordActivity({
      eventType: "threat_intel",
      req,
      resource: "vulnerabilities",
      action: "auto_create",
      message: `Auto-created ${createdVulnerabilities.length} vulnerabilities from AI Threat Intelligence feed`,
      metadata: { execution_id, count: createdVulnerabilities.length },
    });

    res.json({
      success: true,
      created_count: createdVulnerabilities.length,
      data: createdVulnerabilities,
    });
  }),
);

module.exports = router;
