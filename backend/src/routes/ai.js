const express = require("express");
const { query } = require("../config/db");
const { asyncHandler, HttpError } = require("../utils/http");
const { requirePermission } = require("../middleware/auth");
const { chat, analyzeAlert, getContext, intentOf } = require("../services/ai");
const { recordActivity } = require("../services/audit");

const router = express.Router();

const SUGGESTIONS = [
  "Tóm tắt tình hình an ninh hiện tại",
  "Ai là 5 kẻ tấn công hàng đầu hiện nay?",
  "Tài sản nào có điểm rủi ro cao nhất?",
  "Có sự cố nào sắp vi phạm SLA không?",
  "Hiển thị phân bố tấn công theo quốc gia",
  "Chúng ta nên khắc phục gì trước?",
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
        { id: "medicareguard-analyst", name: "MedicareGuard Analyst", description: "Trợ lý SOC xác định dựa trên dữ liệu PostgreSQL trực tiếp", contextWindow: 128000, default: true },
        { id: "gpt-4o-mini", name: "OpenAI GPT-4o mini", description: "Mô hình lập luận bên ngoài tùy chọn", requiresKey: true, default: false },
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
        title: "Cảnh báo nghiêm trọng cần phân loại",
        detail: `${o.critical_alerts} cảnh báo nghiêm trọng chưa được xử lý trong tổng số ${o.open_alerts} cảnh báo đang mở.`,
        action: "Mở hàng đợi Cảnh báo và ưu tiên mức nghiêm trọng trước.",
      },
      {
        id: "attack-origin",
        severity: "high",
        title: `Tập trung tấn công: ${context.countries[0]?.country || "không rõ"}`,
        detail: `${context.countries[0]?.attacks || 0} sự kiện được quan sát từ ${context.countries[0]?.country || "nguồn không rõ"}.`,
        action: "Rà soát chính sách chặn theo địa lý và thông báo nhóm tình báo mối đe dọa.",
      },
      {
        id: "asset-risk",
        severity: o.high_risk_assets > 3 ? "high" : "medium",
        title: "Phơi nhiễm tài sản rủi ro cao",
        detail: `${o.high_risk_assets} tài sản có điểm rủi ro từ 70 trở lên. Rủi ro trung bình toàn hệ thống là ${o.avg_asset_risk}.`,
        action: "Lên lịch khắc phục cho các tài sản rủi ro nhất và xác minh bản sao lưu.",
      },
      {
        id: "compliance",
        severity: o.compliance_score < 80 ? "medium" : "low",
        title: "Tình trạng tuân thủ",
        detail: `Điểm trung bình các kiểm soát là ${o.compliance_score}% trên các khung.`,
        action: "Giao người phụ trách cho các kiểm soát không đạt và xuất báo cáo tuân thủ.",
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
    if (!conversation.rows.length) throw new HttpError(404, "Không tìm thấy cuộc trò chuyện");
    const messages = await query("SELECT * FROM ai_messages WHERE conversation_id = $1 ORDER BY created_at ASC", [req.params.id]);
    res.json({ data: { ...conversation.rows[0], messages: messages.rows } });
  }),
);

router.delete(
  "/conversations/:id",
  asyncHandler(async (req, res) => {
    const result = await query("DELETE FROM ai_conversations WHERE id = $1 RETURNING id", [req.params.id]);
    if (!result.rows.length) throw new HttpError(404, "Không tìm thấy cuộc trò chuyện");
    res.json({ deleted: true, id: req.params.id });
  }),
);

router.post(
  "/chat",
  requirePermission("ai:use"),
  asyncHandler(async (req, res) => {
    const { message, conversationId } = req.body;
    if (!message || !String(message).trim()) throw new HttpError(400, "Nội dung tin nhắn là bắt buộc");

    let conversation;
    if (conversationId) {
      const existing = await query("SELECT * FROM ai_conversations WHERE id = $1", [conversationId]);
      if (!existing.rows.length) throw new HttpError(404, "Không tìm thấy cuộc trò chuyện");
      conversation = existing.rows[0];
    } else {
      const created = await query(
        "INSERT INTO ai_conversations (user_id, title, model) VALUES ($1,$2,'medicareguard-analyst') RETURNING *",
        [req.user.id, String(message).slice(0, 120)],
      );
      conversation = created.rows[0];
    }

    await query("INSERT INTO ai_messages (conversation_id, role, content) VALUES ($1,'user',$2)", [conversation.id, String(message)]);
    const result = await chat(String(message), conversation.id);
    const assistant = await query(
      "INSERT INTO ai_messages (conversation_id, role, content, tokens, metadata) VALUES ($1,'assistant',$2,$3,$4) RETURNING *",
      [conversation.id, result.reply, Math.ceil(result.reply.length / 4), JSON.stringify({ intent: result.intent, model: result.model, provider: result.provider, latencyMs: result.latencyMs })],
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
        provider: result.provider,
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
      if (!result.rows.length) throw new HttpError(404, "Không tìm thấy cảnh báo");
      const analysis = await analyzeAlert(result.rows[0]);
      return res.json({ data: { alert: result.rows[0], analysis } });
    }
    if (!text) throw new HttpError(400, "alertId hoặc text là bắt buộc");
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
      if (!result.rows.length) throw new HttpError(404, "Không tìm thấy cảnh báo");
      return res.json({ data: { summary: `${result.rows[0].title}: cảnh báo mức ${result.rows[0].severity}, trạng thái ${result.rows[0].status}, nguồn ${result.rows[0].source_ip || "không rõ"}.` } });
    }
    if (incidentId) {
      const result = await query("SELECT * FROM incidents WHERE id = $1", [incidentId]);
      if (!result.rows.length) throw new HttpError(404, "Không tìm thấy sự cố");
      return res.json({ data: { summary: `${result.rows[0].incident_key}: ${result.rows[0].title} đang ở trạng thái ${result.rows[0].status}, mức ${result.rows[0].severity}, ưu tiên ${result.rows[0].priority}.` } });
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
      if (!result.rows.length) throw new HttpError(404, "Không tìm thấy cảnh báo");
      target = { type: "alert", data: result.rows[0] };
    } else if (threatId) {
      const result = await query("SELECT * FROM threats WHERE id = $1", [threatId]);
      if (!result.rows.length) throw new HttpError(404, "Không tìm thấy mối đe dọa");
      target = { type: "threat", data: result.rows[0] };
    }
    const severity = target?.data.severity || "high";
    const actions = [
      { step: 1, action: "Cô lập", detail: severity === "critical" ? "Cô lập máy chủ ngay lập tức và chặn IP nguồn tại biên." : "Chặn chỉ báo và tăng cường giám sát trong 24 giờ." },
      { step: 2, action: "Loại bỏ", detail: "Loại bỏ cơ chế duy trì và xoay vòng thông tin xác thực bị lộ." },
      { step: 3, action: "Phục hồi", detail: "Khôi phục từ bản sao lưu đã xác thực và kiểm tra sức khỏe dịch vụ." },
      { step: 4, action: "Rút kinh nghiệm", detail: "Cập nhật quy tắc phát hiện, cẩm nang và nội dung nâng cao nhận thức." },
    ];
    await recordActivity({ eventType: "ai_remediate", req, resource: target?.type || "threats", resourceId: target?.data?.id, action: "remediate", message: "Đã tạo kế hoạch khắc phục AI" });
    res.json({ data: { target: target ? { type: target.type, id: target.data.id } : null, severity, eta_hours: severity === "critical" ? 4 : 24, actions } });
  }),
);

router.post(
  "/classify",
  requirePermission("ai:use"),
  asyncHandler(async (req, res) => {
    const { text } = req.body;
    if (!text) throw new HttpError(400, "Nội dung văn bản là bắt buộc");
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
      { order: 1, title: "Xác thực phát hiện", owner: "Chuyên viên L1", sla_minutes: 15 },
      { order: 2, title: "Làm giàu chỉ báo", owner: "Chuyên viên L2", sla_minutes: 30 },
      { order: 3, title: "Cô lập tài sản bị ảnh hưởng", owner: "Trưởng nhóm IR", sla_minutes: severity === "critical" ? 15 : 60 },
      { order: 4, title: "Loại bỏ và phục hồi", owner: "Nhóm nền tảng", sla_minutes: 240 },
      { order: 5, title: "Rà soát sau sự cố", owner: "Quản lý SOC", sla_minutes: 1440 },
    ];
    res.json({ data: { name: `Cẩm nang ứng phó ${category}`, category, severity, steps } });
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

module.exports = router;
