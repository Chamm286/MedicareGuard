const crypto = require("node:crypto");
const express = require("express");
const { query } = require("../config/db");
const { asyncHandler, HttpError } = require("../utils/http");
const { requirePermission } = require("../middleware/auth");
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
        triggeredBy: row.actor_email || "system",
        message: row.message,
        created_at: row.created_at,
      })),
    });
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
    if (!allowed.has(req.params.action)) throw new HttpError(404, "Unknown automation action");
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
    if (!workflow) throw new HttpError(404, "Workflow not found");
    const enabled = (await readOverrides())[workflow.id] ?? workflow.enabled;
    if (!enabled) throw new HttpError(409, "Workflow is paused. Enable it before running.");

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
      message: dispatched ? `Workflow dispatched to n8n: ${workflow.name}` : `Workflow queued (n8n offline): ${workflow.name}`,
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
        message: dispatched ? "Workflow dispatched to n8n" : "Workflow queued — n8n is not reachable from the API",
      },
    });
  }),
);

router.patch(
  "/workflows/:id",
  requirePermission("write"),
  asyncHandler(async (req, res) => {
    const workflow = byId(req.params.id);
    if (!workflow) throw new HttpError(404, "Workflow not found");
    if (typeof req.body.enabled !== "boolean") throw new HttpError(400, "enabled must be a boolean");
    const key = `automation.workflow.${workflow.id}.enabled`;
    await query(
      `INSERT INTO settings (key, value, scope, description, updated_by) VALUES ($1,$2,'automation',$3,$4)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`,
      [key, JSON.stringify(req.body.enabled), `Enable or pause ${workflow.name}`, req.user?.id || null],
    );
    await recordAudit({ req, action: req.body.enabled ? "enable_workflow" : "pause_workflow", resource: "automation", resourceId: workflow.id });
    res.json({ data: { id: workflow.id, enabled: req.body.enabled, status: req.body.enabled ? "active" : "paused" } });
  }),
);

module.exports = router;
