const crypto = require("node:crypto");
const express = require("express");
const { query } = require("../config/db");
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
       ORDER BY created_at DESC LIMIT $1`,
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
         AND resource_id = 'identity-attack'
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
         AND resource_id = 'identity-attack'
         AND metadata->>'executionId' = $4
         AND metadata->>'status' = 'awaiting_approval'
         AND metadata->>'approvalDecision' = 'pending'
       RETURNING metadata`,
      [
        decision === "approved" ? "info" : "warn",
        decision === "approved" ? "Quản trị viên đã duyệt phát hiện tấn công danh tính" : "Quản trị viên đã từ chối phát hiện tấn công danh tính",
        JSON.stringify(metadata),
        req.params.executionId,
      ],
    );
    if (!updated.rows.length) throw new HttpError(409, "Yêu cầu duyệt không còn chờ xử lý");
    await recordAudit({
      req,
      action: decision === "approved" ? "approve_identity_detection" : "reject_identity_detection",
      resource: "automation",
      resourceId: req.params.executionId,
      details: { workflowId: "identity-attack", decision, riskScore: updated.rows[0].metadata.approvalRiskScore },
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

    const executionId = crypto.randomUUID();
    const startedAt = new Date().toISOString();
    const entityId = await sampleEntity(workflow.id);
    const payload = { executionId, workflowId: workflow.id, entityId, mode: "manual", triggeredBy: req.user?.email, startedAt, source: "medicareguard-console" };
    let status = "queued";
    let dispatched = false;

    try {
      const response = await fetch(`${n8nBaseUrl()}${workflow.webhook}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
