const crypto = require("node:crypto");
const express = require("express");
const { query, withTransaction } = require("../config/db");
const { asyncHandler, HttpError } = require("../utils/http");
const { authorize, requirePermission } = require("../middleware/auth");
const { recordActivity, recordAudit } = require("../services/audit");
const { workflows, byId } = require("../config/automation");
const { n8nBaseUrl, probeN8n, simulateAction, finalizeExecution } = require("../services/automationRuntime");

const router = express.Router();

const readOverrides = async () => {
  const result = await query("SELECT key, value FROM settings WHERE key LIKE 'automation.workflow.%'");
  return Object.fromEntries(
    result.rows.map((row) => {
      const id = row.key.replace("automation.workflow.", "").replace(".enabled", "");
      return [id, Boolean(row.value)];
    }),
  );
};

let runtimeCache = { value: null, expires: 0 };

const runtimeStatus = async () => {
  if (runtimeCache.value && runtimeCache.expires > Date.now()) return runtimeCache.value;
  const value = await probeN8n();
  runtimeCache = { value, expires: Date.now() + 10000 };
  return value;
};

const identityExecutionId = (value) => {
  const executionId = String(value || "");
  if (!/^[a-zA-Z0-9._:-]{1,64}$/.test(executionId)) throw new HttpError(400, "executionId không hợp lệ");
  return executionId;
};

const identityEmail = (value) => {
  const email = String(value || "").trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@'";]+@[^\s@'";]+\.[^\s@'";]+$/.test(email)) {
    throw new HttpError(400, "userEmail không hợp lệ");
  }
  return email;
};

const loadStats = async () => {
  const result = await query(
    `SELECT resource_id,
            count(*)::int AS runs,
            count(*) FILTER (WHERE metadata->>'status' IN ('success','dispatched'))::int AS successful_runs,
            count(*) FILTER (WHERE metadata->>'status' IN ('success','dispatched','failed'))::int AS attempted_runs,
            max(created_at) AS last_run,
            round(avg(NULLIF(metadata->>'durationMs','')::numeric))::int AS avg_duration_ms
     FROM activity_logs
     WHERE event_type = 'automation' AND action = 'run' AND resource = 'automation_workflow'
     GROUP BY resource_id`,
  );
  return Object.fromEntries(result.rows.map((row) => [row.resource_id, row]));
};

const sampleEntity = async (workflowId) => {
  if (workflowId === "ransomware-containment") {
    const result = await query("SELECT id FROM alerts WHERE severity = 'critical' AND status IN ('open','investigating') ORDER BY detected_at DESC LIMIT 1");
    return result.rows[0]?.id || null;
  }
  if (workflowId === "phishing-triage") {
    const result = await query("SELECT id FROM alerts WHERE (source ILIKE '%email%' OR title ILIKE '%phish%' OR tags && ARRAY['phishing']) ORDER BY (title ILIKE '%phish%') DESC, detected_at DESC LIMIT 1");
    if (result.rows[0]?.id) return result.rows[0].id;
    const fallback = await query("SELECT id FROM alerts ORDER BY detected_at DESC LIMIT 1");
    return fallback.rows[0]?.id || null;
  }
  if (workflowId === "vulnerability-sla") {
    const result = await query("SELECT id FROM vulnerabilities WHERE status = 'open' ORDER BY cvss_score DESC LIMIT 1");
    return result.rows[0]?.id || null;
  }
  if (workflowId === "compliance-evidence") {
    const result = await query("SELECT id FROM compliance_controls ORDER BY score ASC LIMIT 1");
    return result.rows[0]?.id || null;
  }
  if (workflowId === "live-attack-monitor") {
    const result = await query("SELECT id FROM alerts WHERE severity IN ('critical','high') ORDER BY detected_at DESC LIMIT 1");
    return result.rows[0]?.id || null;
  }
  if (workflowId === "ecommerce-fraud-response") {
    const result = await query("SELECT id FROM store_orders WHERE status = 'on_hold' OR risk_score >= 50 ORDER BY risk_score DESC, created_at DESC LIMIT 1");
    return result.rows[0]?.id || null;
  }
  if (workflowId === "identity-attack") {
    const result = await query(
      `SELECT u.email FROM users u LEFT JOIN roles r ON r.id = u.role_id
       WHERE u.status = 'active' AND COALESCE(r.name, '') <> 'admin'
       ORDER BY CASE WHEN u.email = 'viewer@medicareguard.io' THEN 0 ELSE 1 END, u.email
       LIMIT 1`,
    );
    return result.rows[0]?.email || null;
  }
  if (workflowId === "impossible-travel") {
    const result = await query(
      `SELECT u.email FROM users u
       JOIN sessions s ON s.user_id = u.id
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE u.status = 'active' AND s.revoked = false AND COALESCE(r.name, '') <> 'admin'
       GROUP BY u.id, u.email
       HAVING count(*) >= 2
       ORDER BY CASE WHEN u.email = 'viewer@medicareguard.io' THEN 0 ELSE 1 END, u.email
       LIMIT 1`,
    );
    return result.rows[0]?.email || null;
  }
  return null;
};

router.get(
  "/workflows",
  asyncHandler(async (_req, res) => {
    const [stats, overrides] = await Promise.all([loadStats(), readOverrides()]);
    const data = workflows.map((workflow) => {
      const stat = stats[workflow.id] || {};
      const enabled = overrides[workflow.id] ?? workflow.enabled;
      return {
        ...workflow,
        enabled,
        status: enabled ? "active" : "paused",
        runs: stat.runs || 0,
        successful_runs: stat.successful_runs || 0,
        success_rate: stat.attempted_runs ? Math.round((stat.successful_runs / stat.attempted_runs) * 100) : 100,
        last_run: stat.last_run || null,
        avg_duration_ms: stat.avg_duration_ms || null,
        n8n_url: `${n8nBaseUrl()}/workflow/${workflow.id}`,
      };
    });
    const runtime = await runtimeStatus();
    res.json({
      data,
      summary: {
        total: data.length,
        active: data.filter((workflow) => workflow.enabled).length,
        nodes: data.reduce((sum, workflow) => sum + workflow.nodeCount, 0),
        runs: data.reduce((sum, workflow) => sum + workflow.runs, 0),
        n8n: n8nBaseUrl(),
        runtime,
      },
    });
  }),
);

router.get(
  "/executions",
  asyncHandler(async (req, res) => {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const result = await query(
      `SELECT id, level, actor_email, resource_id, action, message, metadata, created_at
       FROM activity_logs
       WHERE event_type = 'automation' AND action = 'run'
       ORDER BY CASE
         WHEN metadata->>'status' = 'awaiting_approval'
           AND metadata->>'approvalDecision' = 'pending' THEN 0
         ELSE 1
       END, created_at DESC
       LIMIT $1`,
      [limit],
    );
    res.json({
      data: result.rows.map((row) => ({
        id: row.metadata?.executionId || row.id,
        workflowId: row.resource_id,
        workflowName: row.metadata?.workflowName || byId(row.resource_id)?.name || row.resource_id,
        status: row.metadata?.status || "success",
        mode: row.metadata?.mode || "manual",
        durationMs: row.metadata?.durationMs || null,
        nodeCount: row.metadata?.nodeCount || null,
        approvalDecision: row.metadata?.approvalDecision || null,
        approvalUserEmail: row.metadata?.approvalUserEmail || null,
        approvalRiskScore: row.metadata?.approvalRiskScore ?? null,
        triggeredBy: row.actor_email || "system",
        message: row.message,
        created_at: row.created_at,
      })),
    });
  }),
);

router.get(
  "/identity/context",
  requirePermission("write"),
  asyncHandler(async (req, res) => {
    const userEmail = identityEmail(req.query.userEmail);
    const result = await query(
      `SELECT u.id AS user_id, u.email, u.full_name, u.department, r.name AS role_name,
              COALESCE(r.level, 0)::int AS role_level,
              (SELECT count(*)::int FROM activity_logs al
               WHERE lower(al.actor_email) = lower(u.email) AND al.event_type = 'auth'
                 AND al.action = 'login' AND al.created_at > now() - interval '30 days') AS successful_logins_30d,
              (SELECT count(*)::int FROM activity_logs al
               WHERE lower(al.actor_email) = lower(u.email) AND al.event_type = 'auth'
                 AND al.action = 'login_failed' AND al.created_at > now() - interval '15 minutes') AS failed_logins_15m,
              (SELECT COALESCE(json_agg(DISTINCT al.source_ip) FILTER (WHERE al.source_ip IS NOT NULL), '[]'::json)
               FROM activity_logs al
               WHERE lower(al.actor_email) = lower(u.email) AND al.event_type = 'auth'
                 AND al.action = 'login' AND al.created_at > now() - interval '30 days') AS known_ips
       FROM users u LEFT JOIN roles r ON r.id = u.role_id
       WHERE lower(u.email) = lower($1) AND u.status = 'active' LIMIT 1`,
      [userEmail],
    );
    if (!result.rows.length) throw new HttpError(404, "Không tìm thấy tài khoản đang hoạt động");
    res.json({ data: result.rows[0] });
  }),
);

router.get(
  "/identity/sessions",
  requirePermission("write"),
  asyncHandler(async (req, res) => {
    const userEmail = identityEmail(req.query.userEmail);
    const result = await query(
      `SELECT s.id, s.ip_address, s.user_agent, s.expires_at, s.revoked, s.created_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE lower(u.email) = lower($1) AND u.status = 'active' AND s.revoked = false
       ORDER BY s.created_at DESC
       LIMIT 50`,
      [userEmail],
    );
    res.json({ data: result.rows });
  }),
);

router.post(
  "/impossible-travel/alerts",
  requirePermission("write"),
  asyncHandler(async (req, res) => {
    const executionId = identityExecutionId(req.body?.executionId);
    const userEmail = identityEmail(req.body?.userEmail);
    const title = String(req.body?.title || "").trim();
    const description = String(req.body?.description || "");
    const severity = String(req.body?.severity || "").toLowerCase();
    const sourceIp = String(req.body?.sourceIp || "").slice(0, 64);
    const riskScore = Number(req.body?.riskScore);
    const evidence = req.body?.evidence;
    if (!title || title.length > 200) throw new HttpError(400, "title là bắt buộc và không vượt quá 200 ký tự");
    if (!["critical", "high", "medium", "low"].includes(severity)) throw new HttpError(400, "severity không hợp lệ");
    if (!Number.isFinite(riskScore) || riskScore < 0 || riskScore > 100) throw new HttpError(400, "riskScore phải từ 0 đến 100");
    if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) throw new HttpError(400, "evidence phải là một object");
    if (Buffer.byteLength(JSON.stringify(evidence), "utf8") > 32768) throw new HttpError(400, "evidence vượt quá 32 KB");
    const approvalSessionId = String(evidence.previousSessionId || req.body?.sessionId || "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(approvalSessionId)) {
      throw new HttpError(400, "evidence phải chứa sessionId hợp lệ để chờ duyệt");
    }

    const existing = await query(
      `SELECT id, title, severity, risk_score, source_ip FROM alerts
       WHERE source = 'Phát hiện di chuyển bất khả thi'
         AND metadata->>'executionId' = $1
       ORDER BY created_at DESC LIMIT 1`,
      [executionId],
    );

    const alert = existing.rows[0] || (await query(
       `INSERT INTO alerts
          (title, description, severity, status, source, source_ip, risk_score, confidence, tags, metadata)
        VALUES ($1, $2, $3, 'open', 'Phát hiện di chuyển bất khả thi', $4, $5, 85,
                ARRAY['identity','impossible_travel'], $6::jsonb)
        RETURNING id, title, severity, risk_score, source_ip`,
       [
         title,
         description.slice(0, 12000),
         severity,
         sourceIp || null,
         riskScore,
         JSON.stringify({ ...evidence, workflowId: "impossible-travel", executionId, userEmail }),
       ],
    )).rows[0];
    const approvalMetadata = {
       workflowId: "impossible-travel",
       workflowName: byId("impossible-travel").name,
       status: "awaiting_approval",
       approvalDecision: "pending",
       approvalRequestedAt: new Date().toISOString(),
       approvalUserEmail: userEmail,
       approvalRiskScore: riskScore,
       approvalAlertId: alert.id,
       approvalSessionId,
    };
    const pending = await query(
       `UPDATE activity_logs
        SET level = 'warn', message = 'Đang chờ quản trị viên duyệt phát hiện di chuyển bất khả thi',
            metadata = metadata || $1::jsonb, updated_at = now()
        WHERE event_type = 'automation' AND action = 'run'
          AND resource_id = 'impossible-travel' AND metadata->>'executionId' = $2
          AND metadata->>'approvalDecision' IS NULL
        RETURNING id`,
       [JSON.stringify(approvalMetadata), executionId],
    );
    if (!pending.rows.length) {
       const current = await query(
         `SELECT id FROM activity_logs
          WHERE event_type = 'automation' AND action = 'run'
            AND resource_id = 'impossible-travel' AND metadata->>'executionId' = $1
          ORDER BY created_at DESC LIMIT 1`,
         [executionId],
       );
       if (!current.rows.length) {
         await query(
           `INSERT INTO activity_logs
             (level, event_type, actor_email, source_ip, resource, resource_id, action, message, metadata)
            VALUES ('warn', 'automation', $1, $2, 'automation_workflow', 'impossible-travel', 'run', $3, $4::jsonb)`,
           [
             userEmail,
             sourceIp || null,
             "Đang chờ quản trị viên duyệt phát hiện di chuyển bất khả thi",
             JSON.stringify({ executionId, ...approvalMetadata, mode: "webhook", nodeCount: byId("impossible-travel").nodeCount }),
           ],
         );
       }
    }
    res.status(existing.rows.length ? 200 : 201).json({ data: alert, created: !existing.rows.length, approval: "pending" });
  }),
);

router.post(
  "/impossible-travel/sessions/:sessionId/revoke",
  requirePermission("write"),
  asyncHandler(async (req, res) => {
    const executionId = identityExecutionId(req.body?.executionId);
    const userEmail = identityEmail(req.body?.userEmail);
    const sessionId = String(req.params.sessionId || "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
      throw new HttpError(400, "sessionId không hợp lệ");
    }
    const outcome = await withTransaction(async (client) => {
      const approvalResult = await client.query(
        `SELECT id, metadata FROM activity_logs
         WHERE event_type = 'automation' AND action = 'run'
           AND resource_id = 'impossible-travel' AND metadata->>'executionId' = $1
         ORDER BY created_at DESC LIMIT 1
         FOR UPDATE`,
        [executionId],
      );
      const approval = approvalResult.rows[0];
      if (!approval) throw new HttpError(404, "Không tìm thấy yêu cầu duyệt cho execution này");
      if (approval.metadata.approvalUserEmail?.toLowerCase() !== userEmail || approval.metadata.approvalSessionId !== sessionId) {
        throw new HttpError(403, "Phiên đăng nhập không khớp với yêu cầu đã được duyệt");
      }
      if (approval.metadata.approvalDecision === "rejected") {
        return { sessionId, revoked: false, decision: "rejected" };
      }
      if (approval.metadata.approvalDecision !== "approved") {
        await client.query(
          `UPDATE activity_logs
           SET level = 'warn', message = 'Yêu cầu di chuyển bất khả thi đã hết hạn chờ duyệt',
               metadata = metadata || '{"status":"approval_expired","approvalDecision":"expired"}'::jsonb,
               updated_at = now()
           WHERE id = $1`,
          [approval.id],
        );
        return { sessionId, revoked: false, decision: "expired" };
      }

      const revoked = await client.query(
        `UPDATE sessions s
         SET revoked = true
         FROM users u
         WHERE s.id = $1 AND s.user_id = u.id AND lower(u.email) = lower($2) AND s.revoked = false
         RETURNING s.id`,
        [sessionId, userEmail],
      );
      if (!revoked.rows.length) {
        const priorAudit = await client.query(
          `SELECT id FROM audit_logs
           WHERE action = 'impossible_travel_revoke_session'
             AND resource_id = $1 AND details->>'executionId' = $2
           LIMIT 1`,
          [sessionId, executionId],
        );
        if (!priorAudit.rows.length) throw new HttpError(404, "Không tìm thấy phiên đang hoạt động của tài khoản");
      } else {
        await client.query(
          `INSERT INTO audit_logs (actor_email, action, resource, resource_id, ip_address, details)
           VALUES ($1, 'impossible_travel_revoke_session', 'sessions', $2, $3, $4::jsonb)`,
          [
            approval.metadata.approvalReviewer || "n8n@medicareguard.io",
            sessionId,
            String(req.body?.sourceIp || "").slice(0, 64) || null,
            JSON.stringify({ executionId, userEmail, workflowId: "impossible-travel", approval: "approved", reviewer: approval.metadata.approvalReviewer }),
          ],
        );
      }
      await client.query(
        `UPDATE activity_logs
         SET level = 'info', message = 'Quản trị viên đã duyệt và thu hồi phiên đăng nhập đáng ngờ',
             metadata = metadata || '{"status":"success","sessionRevoked":true}'::jsonb,
             updated_at = now()
         WHERE id = $1`,
        [approval.id],
      );
      return { sessionId, revoked: true, alreadyRevoked: !revoked.rows.length, decision: "approved" };
    });
    res.json({ data: outcome });
  }),
);

router.post(
  "/identity/evidence",
  requirePermission("write"),
  asyncHandler(async (req, res) => {
    const executionId = identityExecutionId(req.body?.executionId);
    const userEmail = identityEmail(req.body?.userEmail);
    const sourceIp = String(req.body?.sourceIp || "").slice(0, 64);
    const evidence = req.body?.evidence;
    if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) throw new HttpError(400, "evidence phải là một object");
    if (Buffer.byteLength(JSON.stringify(evidence), "utf8") > 32768) throw new HttpError(400, "evidence vượt quá 32 KB");

    const existing = await query(
      `SELECT id FROM activity_logs
       WHERE event_type = 'security' AND resource = 'identity_detection'
         AND action = 'detect' AND resource_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [executionId],
    );
    if (existing.rows.length) return res.json({ data: { id: existing.rows[0].id, executionId, created: false } });

    const inserted = await query(
      `INSERT INTO activity_logs
         (level, event_type, actor_email, source_ip, resource, resource_id, action, message, metadata)
       VALUES ('warn', 'security', $1, $2, 'identity_detection', $3, 'detect',
               'Đã ghi nhận bằng chứng phát hiện tấn công danh tính', $4::jsonb)
       RETURNING id`,
      [userEmail, sourceIp || null, executionId, JSON.stringify(evidence)],
    );
    res.status(201).json({ data: { id: inserted.rows[0].id, executionId, created: true } });
  }),
);

router.post(
  "/identity/alerts",
  requirePermission("write"),
  asyncHandler(async (req, res) => {
    const executionId = identityExecutionId(req.body?.executionId);
    const title = String(req.body?.title || "").trim();
    const description = String(req.body?.description || "");
    const severity = String(req.body?.severity || "").toLowerCase();
    const sourceIp = String(req.body?.sourceIp || "").slice(0, 64);
    const riskScore = Number(req.body?.riskScore);
    const evidence = req.body?.evidence;
    if (!title || title.length > 200) throw new HttpError(400, "title là bắt buộc và không vượt quá 200 ký tự");
    if (!["critical", "high", "medium", "low"].includes(severity)) throw new HttpError(400, "severity không hợp lệ");
    if (!Number.isFinite(riskScore) || riskScore < 0 || riskScore > 100) throw new HttpError(400, "riskScore phải từ 0 đến 100");
    if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) throw new HttpError(400, "evidence phải là một object");
    if (Buffer.byteLength(JSON.stringify(evidence), "utf8") > 32768) throw new HttpError(400, "evidence vượt quá 32 KB");

    const existing = await query(
      `SELECT id, title, severity, risk_score, source_ip FROM alerts
       WHERE source = 'Phát hiện tấn công danh tính bằng Groq AI'
         AND metadata->>'executionId' = $1
       ORDER BY created_at DESC LIMIT 1`,
      [executionId],
    );
    if (existing.rows.length) return res.json({ data: existing.rows[0], created: false });

    const inserted = await query(
      `INSERT INTO alerts
         (title, description, severity, status, source, source_ip, mitre_tactic, mitre_technique,
          risk_score, confidence, tags, metadata)
       VALUES ($1, $2, $3, 'open', 'Phát hiện tấn công danh tính bằng Groq AI', $4, $5, $6,
               $7, 85, ARRAY['identity','brute_force','privilege_escalation'], $8::jsonb)
       RETURNING id, title, severity, risk_score, source_ip`,
      [
        title,
        description.slice(0, 12000),
        severity,
        sourceIp || null,
        String(req.body?.mitreTactic || "").slice(0, 200),
        String(req.body?.mitreTechnique || "").slice(0, 200),
        riskScore,
        JSON.stringify({ ...evidence, workflowId: "identity-attack", executionId }),
      ],
    );
    res.status(201).json({ data: inserted.rows[0], created: true });
  }),
);

router.post(
  "/identity/audit",
  requirePermission("write"),
  asyncHandler(async (req, res) => {
    const executionId = identityExecutionId(req.body?.executionId);
    const userEmail = identityEmail(req.body?.userEmail);
    const adminDecision = String(req.body?.adminDecision || "");
    if (!["approved", "rejected", "not_required"].includes(adminDecision)) throw new HttpError(400, "adminDecision không hợp lệ");
    const riskScore = Number(req.body?.riskScore);
    if (!Number.isFinite(riskScore) || riskScore < 0 || riskScore > 100) throw new HttpError(400, "riskScore phải từ 0 đến 100");
    const alertId = String(req.body?.alertId || "").slice(0, 64);
    const reviewer = req.body?.reviewer ? String(req.body.reviewer).slice(0, 254) : null;
    const sourceIp = String(req.body?.sourceIp || "").slice(0, 64);

    const existing = await query(
      `SELECT id FROM audit_logs
       WHERE action = 'identity_detection_review' AND details->>'executionId' = $1
       ORDER BY created_at DESC LIMIT 1`,
      [executionId],
    );
    if (existing.rows.length) return res.json({ data: { id: existing.rows[0].id, executionId, created: false } });

    const details = { workflowId: "identity-attack", executionId, riskScore, adminDecision, reviewer };
    const inserted = await query(
      `INSERT INTO audit_logs (actor_email, action, resource, resource_id, ip_address, details)
       VALUES ($1, 'identity_detection_review', 'alerts', $2, $3, $4::jsonb)
       RETURNING id`,
      [userEmail, alertId || null, sourceIp || null, JSON.stringify(details)],
    );
    res.status(201).json({ data: { id: inserted.rows[0].id, executionId, created: true } });
  }),
);

router.post(
  "/executions/:executionId/approval-request",
  requirePermission("write"),
  asyncHandler(async (req, res) => {
    const executionId = String(req.params.executionId);
    const { workflowId, userEmail, riskScore, alertId } = req.body || {};
    if (workflowId !== "identity-attack") throw new HttpError(400, "Yêu cầu duyệt không hợp lệ");
    if (typeof userEmail !== "string" || userEmail.length > 254) throw new HttpError(400, "Tài khoản cần duyệt không hợp lệ");
    if (!Number.isFinite(Number(riskScore)) || Number(riskScore) < 70 || Number(riskScore) > 100) {
      throw new HttpError(400, "Điểm rủi ro phải từ 70 đến 100");
    }

    const approvalMetadata = {
      workflowId,
      workflowName: byId(workflowId).name,
      status: "awaiting_approval",
      approvalDecision: "pending",
      approvalRequestedAt: new Date().toISOString(),
      approvalUserEmail: userEmail,
      approvalRiskScore: Number(riskScore),
      approvalAlertId: alertId ? String(alertId).slice(0, 64) : null,
    };
    const updated = await query(
      `UPDATE activity_logs
       SET level = 'warn', message = 'Đang chờ quản trị viên duyệt phát hiện tấn công danh tính',
           metadata = metadata || $1::jsonb, updated_at = now()
       WHERE event_type = 'automation' AND action = 'run' AND metadata->>'executionId' = $2
       RETURNING id`,
      [JSON.stringify(approvalMetadata), executionId],
    );
    if (!updated.rows.length) {
      await query(
        `INSERT INTO activity_logs
          (level, event_type, actor_email, resource, resource_id, action, message, metadata)
         VALUES ('warn', 'automation', 'n8n@medicareguard.io', 'automation_workflow', $1, 'run', $2, $3)`,
        [
          workflowId,
          "Đang chờ quản trị viên duyệt phát hiện tấn công danh tính",
          JSON.stringify({ executionId, ...approvalMetadata, mode: "webhook", nodeCount: byId(workflowId).nodeCount }),
        ],
      );
    }

    res.status(202).json({ data: { executionId, status: "awaiting_approval", decision: "pending" } });
  }),
);

router.get(
  "/executions/:executionId/approval",
  requirePermission("write"),
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT metadata
       FROM activity_logs
       WHERE event_type = 'automation' AND action = 'run'
         AND resource_id IN ('identity-attack', 'impossible-travel')
         AND metadata->>'executionId' = $1
       ORDER BY created_at DESC LIMIT 1`,
      [req.params.executionId],
    );
    const metadata = result.rows[0]?.metadata;
    if (!metadata?.approvalDecision) throw new HttpError(404, "Không tìm thấy yêu cầu duyệt");
    res.json({
      data: {
        executionId: req.params.executionId,
        decision: metadata.approvalDecision,
        reviewer: metadata.approvalReviewer || null,
        decidedAt: metadata.approvalDecidedAt || null,
      },
    });
  }),
);

router.post(
  "/executions/:executionId/approval",
  authorize("admin"),
  asyncHandler(async (req, res) => {
    const decision = String(req.body?.decision || "").toLowerCase();
    if (!["approved", "rejected"].includes(decision)) throw new HttpError(400, "decision phải là approved hoặc rejected");
    const metadata = {
      status: decision === "approved" ? "approval_approved" : "approval_rejected",
      approvalDecision: decision,
      approvalReviewer: req.user?.email,
      approvalDecidedAt: new Date().toISOString(),
    };
    const updated = await query(
      `UPDATE activity_logs
       SET level = $1, message = $2, metadata = metadata || $3::jsonb, updated_at = now()
       WHERE event_type = 'automation' AND action = 'run'
         AND resource_id IN ('identity-attack', 'impossible-travel')
         AND metadata->>'executionId' = $4
         AND metadata->>'status' = 'awaiting_approval'
         AND metadata->>'approvalDecision' = 'pending'
       RETURNING metadata`,
      [
        decision === "approved" ? "info" : "warn",
        decision === "approved" ? "Quản trị viên đã duyệt yêu cầu tự động hóa" : "Quản trị viên đã từ chối yêu cầu tự động hóa",
        JSON.stringify(metadata),
        req.params.executionId,
      ],
    );
    if (!updated.rows.length) throw new HttpError(409, "Yêu cầu duyệt không còn chờ xử lý");
    const workflowId = updated.rows[0].metadata.workflowId;
    await recordAudit({
      req,
      action: decision === "approved"
        ? workflowId === "impossible-travel" ? "approve_impossible_travel" : "approve_identity_detection"
        : workflowId === "impossible-travel" ? "reject_impossible_travel" : "reject_identity_detection",
      resource: "automation",
      resourceId: req.params.executionId,
      details: { workflowId, decision, riskScore: updated.rows[0].metadata.approvalRiskScore },
    });
    res.json({ data: { executionId: req.params.executionId, decision, reviewer: req.user?.email, decidedAt: metadata.approvalDecidedAt } });
  }),
);


router.get(
  "/runtime",
  asyncHandler(async (_req, res) => {
    res.json({ data: await runtimeStatus() });
  }),
);

router.post(
  "/simulate/:action",
  requirePermission("write"),
  asyncHandler(async (req, res) => {
    const allowed = new Set([
      "edr-telemetry", "edr-isolate", "edr-verify", "network-contain", "intel-reputation",
      "identity-context", "identity-revoke", "identity-verify", "sandbox-detonate",
      "email-quarantine", "email-verify", "vuln-intel", "patch-catalog", "change-request",
      "patch-orchestrate", "patch-verify", "evidence-identity", "evidence-endpoint",
      "evidence-audit", "evidence-pack", "evidence-verify", "evidence-persist",
      "evidence-write", "intel-sync", "notify", "ticket-sync",
    ]);
    if (!allowed.has(req.params.action)) throw new HttpError(404, "Hành động tự động hóa không xác định");
    const result = await simulateAction(req.params.action, req.body || {});
    res.json({ data: { action: result.action, simulated: result.simulated, ...result.data } });
  }),
);

router.post(
  "/executions/:executionId/complete",
  requirePermission("write"),
  asyncHandler(async (req, res) => {
    const { status, durationMs, nodeCount, metrics, message, workflowId } = req.body || {};
    const result = await finalizeExecution({
      executionId: req.params.executionId,
      workflowId,
      status,
      durationMs,
      nodeCount,
      metrics,
      message,
      actorEmail: req.user?.email,
    });
    await recordAudit({
      req,
      action: "complete_workflow",
      resource: "automation",
      resourceId: result.workflowId || workflowId,
      details: { executionId: req.params.executionId, status: result.status, durationMs: result.durationMs },
    });
    res.json({ data: result });
  }),
);

router.post(
  "/workflows/:id/run",
  requirePermission("write"),
  asyncHandler(async (req, res) => {
    const workflow = byId(req.params.id);
    if (!workflow) throw new HttpError(404, "Không tìm thấy quy trình");
    const enabled = (await readOverrides())[workflow.id] ?? workflow.enabled;
    if (!enabled) throw new HttpError(409, "Quy trình đang tạm dừng. Hãy bật trước khi chạy.");
    if (workflow.id === "impossible-travel" && !process.env.MG_API_TOKEN) {
      throw new HttpError(503, "Thiếu MG_API_TOKEN để xác thực webhook di chuyển bất khả thi");
    }

    const executionId = crypto.randomUUID();
    const startedAt = new Date().toISOString();
    const entityId = await sampleEntity(workflow.id);
    if (workflow.id === "impossible-travel" && !entityId) {
      throw new HttpError(409, "Cần tài khoản không phải quản trị có ít nhất hai phiên hoạt động để chạy mô phỏng");
    }
    const payload = { executionId, workflowId: workflow.id, entityId, mode: "manual", triggeredBy: req.user?.email, startedAt, source: "medicareguard-console" };
    if (workflow.id === "impossible-travel") {
      const currentSession = await query(
        `SELECT s.id FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE lower(u.email) = lower($1) AND s.revoked = false
         ORDER BY s.created_at DESC LIMIT 1`,
        [entityId],
      );
      if (!currentSession.rows.length) {
        throw new HttpError(409, "Không tìm thấy phiên hiện tại để chạy mô phỏng di chuyển bất khả thi");
      }
      payload.ipAddress = "198.51.100.55";
      payload.deviceFingerprint = "medicareguard-demo-device";
      payload.sessionId = currentSession.rows[0].id;
      payload.geoMode = "demo";
      payload.timestamp = startedAt;
    }
    let status = "queued";
    let dispatched = false;

    try {
      const headers = { "Content-Type": "application/json" };
      if (workflow.id === "impossible-travel") {
        headers.Authorization = `Bearer ${process.env.MG_API_TOKEN}`;
      }
      const response = await fetch(`${n8nBaseUrl()}${workflow.webhook}`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(2500),
      });
      if (response.ok) {
        status = "dispatched";
        dispatched = true;
      }
    } catch (_error) {
      status = "queued";
    }

    const durationMs = Math.max(1, Date.now() - new Date(startedAt).getTime());
    await recordActivity({
      level: dispatched ? "info" : "warn",
      eventType: "automation",
      req,
      resource: "automation_workflow",
      resourceId: workflow.id,
      action: "run",
      message: dispatched ? `Đã gửi quy trình tới n8n: ${workflow.name}` : `Đã xếp hàng quy trình (n8n ngoại tuyến): ${workflow.name}`,
      metadata: { executionId, workflowId: workflow.id, workflowName: workflow.name, status, mode: "manual", durationMs, nodeCount: workflow.nodeCount, triggeredBy: req.user?.email },
    });
    await recordAudit({ req, action: "run_workflow", resource: "automation", resourceId: workflow.id, details: { executionId, status } });

    res.status(202).json({
      data: {
        executionId,
        workflowId: workflow.id,
        workflowName: workflow.name,
        status,
        dispatched,
        n8n: n8nBaseUrl(),
        nodeCount: workflow.nodeCount,
        startedAt,
        durationMs,
        message: dispatched ? "Đã gửi quy trình tới n8n" : "Đã xếp hàng quy trình — API không thể kết nối tới n8n",
      },
    });
  }),
);

router.patch(
  "/workflows/:id",
  requirePermission("write"),
  asyncHandler(async (req, res) => {
    const workflow = byId(req.params.id);
    if (!workflow) throw new HttpError(404, "Không tìm thấy quy trình");
    if (typeof req.body.enabled !== "boolean") throw new HttpError(400, "enabled phải là kiểu boolean");
    const key = `automation.workflow.${workflow.id}.enabled`;
    await query(
      `INSERT INTO settings (key, value, scope, description, updated_by) VALUES ($1,$2,'automation',$3,$4)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`,
      [key, JSON.stringify(req.body.enabled), `Bật hoặc tạm dừng ${workflow.name}`, req.user?.id || null],
    );
    await recordAudit({ req, action: req.body.enabled ? "enable_workflow" : "pause_workflow", resource: "automation", resourceId: workflow.id });
    res.json({ data: { id: workflow.id, enabled: req.body.enabled, status: req.body.enabled ? "active" : "paused" } });
  }),
);

module.exports = router;
