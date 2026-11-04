const crypto = require("node:crypto");
const { query } = require("../config/db");
const { recordActivity } = require("./audit");

const n8nBaseUrl = () => (process.env.N8N_BASE_URL || process.env.N8N_URL || "http://localhost:5678").replace(/\/$/, "");

const uuid = (value) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || "")) ? String(value) : null);

const pseudoRequest = (executionId) => ({
  user: { id: null, email: "n8n@medicareguard.io" },
  headers: { "user-agent": "MedicareGuard n8n automation" },
  ip: null,
  body: { executionId },
});

const probeN8n = async () => {
  const started = Date.now();
  try {
    const response = await fetch(`${n8nBaseUrl()}/healthz`, { signal: AbortSignal.timeout(1500) });
    const payload = await response.json().catch(() => ({}));
    return {
      online: response.ok,
      status: response.ok ? payload.status || "ok" : `HTTP ${response.status}`,
      baseUrl: n8nBaseUrl(),
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    return {
      online: false,
      status: error.name === "TimeoutError" ? "timeout" : error.message,
      baseUrl: n8nBaseUrl(),
      latencyMs: Date.now() - started,
    };
  }
};

const recordIntegration = async (action, executionId, metadata) => {
  await recordActivity({
    level: "info",
    eventType: "integration",
    req: pseudoRequest(executionId),
    resource: "automation_integration",
    resourceId: executionId || metadata.assetId || metadata.alertId || action,
    action: `simulate_${action}`,
    message: `Đã hoàn tất mô phỏng: ${ACTION_LABELS[action] || action}`,
    metadata: { action, executionId, ...metadata },
  });
};

const ACTION_LABELS = {
  "edr-telemetry": "thu thập dữ liệu EDR", "edr-isolate": "cô lập thiết bị EDR", "edr-verify": "xác minh EDR",
  "network-contain": "ngăn chặn mạng", "intel-reputation": "tra cứu uy tín tình báo", "identity-context": "truy vấn bối cảnh danh tính",
  "identity-revoke": "thu hồi danh tính", "identity-verify": "xác minh danh tính", "sandbox-detonate": "kích hoạt sandbox",
  "email-quarantine": "cách ly email", "email-verify": "xác minh email", "vuln-intel": "tra cứu tình báo lỗ hổng",
  "patch-catalog": "tra cứu danh mục bản vá", "change-request": "tạo yêu cầu thay đổi", "patch-orchestrate": "điều phối vá",
  "patch-verify": "xác minh bản vá", "evidence-identity": "thu thập bằng chứng danh tính", "evidence-endpoint": "thu thập bằng chứng điểm cuối",
  "evidence-audit": "thu thập bằng chứng kiểm toán", "evidence-pack": "đóng gói bằng chứng", "evidence-verify": "xác minh bằng chứng",
  "evidence-persist": "lưu bằng chứng", "evidence-write": "ghi bằng chứng", "intel-sync": "đồng bộ tình báo",
  notify: "gửi thông báo", "ticket-sync": "đồng bộ phiếu hỗ trợ",
};

const scoreText = (value, salt = "") => {
  const digest = crypto.createHash("sha256").update(`${salt}:${value || "unknown"}`).digest();
  return 55 + (digest[0] % 44);
};

const simulateAction = async (action, body = {}) => {
  const executionId = body.executionId || null;
  const alertId = uuid(body.alertId);
  const assetId = uuid(body.assetId);
  const vulnerabilityId = uuid(body.vulnerabilityId);
  const controlId = uuid(body.controlId);
  const at = new Date().toISOString();
  let data;

  switch (action) {
    case "edr-telemetry": {
      const result = await query(
        `SELECT a.id AS alert_id, a.title, a.severity, a.source_ip,
                ast.id AS asset_id, ast.name AS hostname, ast.ip_address, ast.os, ast.status, ast.risk_score
         FROM alerts a LEFT JOIN assets ast ON ast.id = a.asset_id
         WHERE a.id = $1 LIMIT 1`,
        [alertId],
      );
      const row = result.rows[0] || {};
      data = {
        telemetryId: `edr-${crypto.randomUUID().slice(0, 8)}`,
        hostname: row.hostname || "unknown-endpoint",
        ipAddress: row.ip_address || "0.0.0.0",
        os: row.os || "unknown",
        agentVersion: "7.18.2",
        beaconCount: 14,
        encryptionAttempts: 3,
        suspiciousProcesses: ["rundll32.exe", "powershell.exe", "vssadmin.exe"],
        assetStatus: row.status || "unknown",
        detectedAt: at,
      };
      break;
    }
    case "edr-isolate": {
      const result = await query(
        `UPDATE assets
         SET status = 'isolated',
             metadata = metadata || jsonb_build_object('containedBy', 'n8n', 'containedAt', $2::text),
             updated_at = now()
         WHERE id = COALESCE($1::uuid, (SELECT asset_id FROM alerts WHERE id = $3::uuid))
         RETURNING id, name, status`,
        [assetId, at, alertId],
      );
      data = {
        actionId: `iso-${crypto.randomUUID().slice(0, 8)}`,
        assetId: result.rows[0]?.id || assetId,
        hostname: result.rows[0]?.name || "unknown-endpoint",
        status: result.rows[0]?.status || "not_found",
        contained: Boolean(result.rows[0]),
        enforcement: "network-isolation",
        appliedAt: at,
      };
      break;
    }
    case "edr-verify": {
      const result = await query(
        `SELECT id, name, status FROM assets
         WHERE id = COALESCE($1::uuid, (SELECT asset_id FROM alerts WHERE id = $2::uuid)) LIMIT 1`,
        [assetId, alertId],
      );
      data = {
        assetId: result.rows[0]?.id || assetId,
        status: result.rows[0]?.status || "not_found",
        contained: result.rows[0]?.status === "isolated",
        verified: result.rows[0]?.status === "isolated",
        checkedAt: at,
      };
      break;
    }
    case "network-contain": {
      const alert = alertId ? await query("SELECT source_ip, title FROM alerts WHERE id = $1 LIMIT 1", [alertId]) : { rows: [] };
      const sourceIp = body.sourceIp || alert.rows[0]?.source_ip || "203.0.113.66";
      const result = await query(
        `INSERT INTO firewall_rules (name, description, direction, action, protocol, source_ip, priority, enabled, metadata)
         VALUES ($1, $2, 'inbound', 'deny', 'tcp', $3, 10, true, $4)
         RETURNING id, name, source_ip`,
        [
          `Chặn C2 bằng n8n — ${sourceIp}`,
          `Cô lập tự động do MedicareGuard SOAR tạo (${executionId || "thủ công"})`,
          sourceIp,
          JSON.stringify({ automation: true, executionId, alertId, blockType: "c2" }),
        ],
      );
      data = { ruleId: result.rows[0]?.id, sourceIp, action: "deny", verified: true, appliedAt: at };
      break;
    }
    case "intel-reputation": {
      const indicator = body.indicator || body.hash || body.url || body.ip || alertId || "unknown";
      const score = scoreText(indicator, "reputation");
      data = { indicator, score, verdict: score >= 75 ? "malicious" : "suspicious", sources: ["VirusTotal", "AbuseIPDB", "AlienVault OTX"], checkedAt: at };
      break;
    }
    case "identity-context": {
      const email = body.email || body.recipient || null;
      const result = email ? await query("SELECT id, email, full_name, department FROM users WHERE email = $1 LIMIT 1", [email]) : { rows: [] };
      data = {
        user: result.rows[0] || { email: email || "unknown@medicareguard.io", full_name: "Người nhận không xác định", department: "Không rõ" },
        mfaEnabled: true,
        riskLevel: "high",
        checkedAt: at,
      };
      break;
    }
    case "identity-revoke": {
      const email = body.email || body.recipient || null;
      const user = email ? await query("SELECT id, email, full_name FROM users WHERE email = $1 LIMIT 1", [email]) : { rows: [] };
      const userId = uuid(body.userId) || user.rows[0]?.id || null;
      const revoked = userId
        ? await query("UPDATE sessions SET revoked = true, updated_at = now() WHERE user_id = $1 AND revoked = false RETURNING id", [userId])
        : { rowCount: 0 };
      data = {
        userId,
        email: user.rows[0]?.email || email,
        sessionsRevoked: revoked.rowCount || 0,
        passwordResetRequired: true,
        verified: true,
        completedAt: at,
      };
      break;
    }
    case "identity-verify": {
      const userId = uuid(body.userId);
      const result = userId ? await query("SELECT count(*)::int AS active FROM sessions WHERE user_id = $1 AND revoked = false", [userId]) : { rows: [{ active: 0 }] };
      data = { userId, activeSessions: result.rows[0]?.active || 0, verified: (result.rows[0]?.active || 0) === 0, checkedAt: at };
      break;
    }
    case "sandbox-detonate": {
      const url = body.url || body.indicator || "https://unknown.invalid";
      const score = scoreText(url, "sandbox");
      data = {
        scanId: `sbx-${crypto.randomUUID().slice(0, 8)}`,
        url,
        verdict: score >= 70 ? "malicious" : "suspicious",
        score,
        family: score >= 80 ? "Qakbot" : "Thu thập thông tin xác thực chung",
        iocs: [
          { type: "domain", value: "login-portal-verify.example" },
          { type: "sha256", value: crypto.createHash("sha256").update(url).digest("hex") },
        ],
        completedAt: at,
      };
      break;
    }
    case "email-quarantine": {
      data = {
        quarantineId: `mail-${crypto.randomUUID().slice(0, 8)}`,
        messagesQuarantined: 14,
        mailboxesAffected: 6,
        pendingRelease: 0,
        verified: true,
        completedAt: at,
      };
      break;
    }
    case "email-verify": {
      data = { messagesQuarantined: 14, leftoverMessages: 0, verified: true, checkedAt: at };
      break;
    }
    case "vuln-intel": {
      const result = vulnerabilityId ? await query("SELECT id, cve_id, title, severity, cvss_score, asset_id FROM vulnerabilities WHERE id = $1 LIMIT 1", [vulnerabilityId]) : { rows: [] };
      data = {
        vulnerability: result.rows[0] || {},
        epss: 0.91,
        kev: true,
        exploitAvailable: true,
        checkedAt: at,
      };
      break;
    }
    case "patch-catalog": {
      data = { patchId: `patch-${crypto.randomUUID().slice(0, 8)}`, vendor: "Microsoft", release: "2026-10", supersedes: [], rebootRequired: true, checkedAt: at };
      break;
    }
    case "change-request": {
      data = { changeId: `CHG-${crypto.randomInt(1000, 9999)}`, status: "scheduled", window: "next-maintenance", approved: true, verified: true, createdAt: at };
      break;
    }
    case "patch-orchestrate": {
      data = { deploymentId: `dep-${crypto.randomUUID().slice(0, 8)}`, rings: 3, endpointsTargeted: 42, status: "deploying", verified: true, startedAt: at };
      break;
    }
    case "patch-verify": {
      data = { patched: 42, failed: 0, pendingReboot: 3, verified: true, checkedAt: at };
      break;
    }
    case "evidence-identity": {
      const counts = await query("SELECT count(*)::int AS users, count(*) FILTER (WHERE mfa_enabled)::int AS mfa FROM users");
      data = { source: "identity", users: counts.rows[0]?.users || 0, mfaEnrolled: counts.rows[0]?.mfa || 0, collectedAt: at };
      break;
    }
    case "evidence-endpoint": {
      const counts = await query("SELECT count(*)::int AS assets, count(*) FILTER (WHERE status = 'isolated')::int AS isolated FROM assets");
      data = { source: "endpoint", assets: counts.rows[0]?.assets || 0, isolated: counts.rows[0]?.isolated || 0, collectedAt: at };
      break;
    }
    case "evidence-audit": {
      const counts = await query("SELECT count(*)::int AS events FROM audit_logs WHERE created_at > now() - interval '30 days'");
      data = { source: "audit", events: counts.rows[0]?.events || 0, window: "30d", collectedAt: at };
      break;
    }
    case "evidence-pack": {
      const checksum = crypto.createHash("sha256").update(`${executionId || "manual"}:${controlId || "framework"}:${at}`).digest("hex");
      data = { packId: `evp-${crypto.randomUUID().slice(0, 8)}`, checksum, controls: 24, artifacts: 6, immutable: true, verified: true, createdAt: at };
      break;
    }
    case "evidence-verify": {
      data = { packVerified: true, missingArtifacts: 0, verified: true, checkedAt: at };
      break;
    }
    case "evidence-persist": {
      const checksum = crypto.createHash("sha256").update(`${executionId || "manual"}:${at}`).digest("hex");
      data = { artifactId: `art-${crypto.randomUUID().slice(0, 8)}`, checksum, storage: "s3://medicareguard-evidence", verified: true, createdAt: at };
      break;
    }
    case "evidence-write": {
      const checksum = crypto.createHash("sha256").update(`${executionId || "manual"}:${JSON.stringify(body)}`).digest("hex");
      await query(
        `INSERT INTO audit_logs (actor_email, action, resource, resource_id, details)
         VALUES ('n8n@medicareguard.io', 'automation_evidence', 'automation', $1, $2)`,
        [executionId, JSON.stringify({ action, checksum, ...body })],
      );
      data = { auditId: `aud-${crypto.randomUUID().slice(0, 8)}`, checksum, persisted: true, createdAt: at };
      break;
    }
    case "intel-sync": {
      data = { indicatorsSynced: 18, sources: ["VirusTotal", "AlienVault OTX"], verified: true, syncedAt: at };
      break;
    }
    case "notify": {
      const title = String(body.title || "Cập nhật tự động hóa MedicareGuard").slice(0, 200);
      const message = String(body.message || "Thông báo luồng SOAR tự động").slice(0, 2000);
      const result = await query(
        `INSERT INTO notifications (user_id, title, message, type, link, metadata)
         SELECT u.id, $1, $2, $3, $4, $5
         FROM users u JOIN roles r ON r.id = u.role_id
         WHERE r.name IN ('admin','analyst') LIMIT 50
         RETURNING id`,
        [title, message, body.severity === "critical" ? "critical" : "warning", body.link || "/automation", JSON.stringify({ executionId, channel: body.channel || "soc" })],
      );
      data = { delivered: result.rowCount || 0, channel: body.channel || "soc-alerts", verified: true, sentAt: at };
      break;
    }
    case "ticket-sync": {
      data = { ticketKey: `SOC-${crypto.randomInt(10000, 99999)}`, system: "Jira Service Management", status: "open", verified: true, createdAt: at };
      break;
    }
    default:
      data = { action, accepted: true, simulated: true, executionId, completedAt: at };
  }

  await recordIntegration(action, executionId, {
    alertId,
    assetId,
    vulnerabilityId,
    controlId,
    result: data,
  });

  return { action, simulated: true, data };
};

const finalizeExecution = async ({ executionId, workflowId, status, durationMs, nodeCount, metrics, message, actorEmail }) => {
  const normalizedStatus = ["success", "failed", "canceled"].includes(status) ? status : "success";
  const level = normalizedStatus === "success" ? "info" : "error";
  const statusLabel = { success: "thành công", failed: "thất bại", canceled: "đã hủy" }[normalizedStatus];
  const finalMessage = message || `Luồng n8n ${statusLabel}: ${workflowId || "không rõ"}`;
  const metadata = {
    status: normalizedStatus,
    durationMs: Number(durationMs) || null,
    nodeCount: Number(nodeCount) || null,
    metrics: metrics || null,
    completedAt: new Date().toISOString(),
    finalizedBy: actorEmail || "n8n@medicareguard.io",
  };

  const updated = await query(
    `UPDATE activity_logs
     SET level = $1, message = $2, metadata = metadata || $3::jsonb, updated_at = now()
     WHERE event_type = 'automation' AND action = 'run' AND metadata->>'executionId' = $4
     RETURNING id, resource_id, metadata`,
    [level, finalMessage, JSON.stringify(metadata), executionId],
  );

  if (updated.rows.length) {
    return { executionId, workflowId: updated.rows[0].resource_id, ...metadata, updated: true };
  }

  const inserted = await query(
    `INSERT INTO activity_logs (level, event_type, actor_email, resource, resource_id, action, message, metadata)
     VALUES ($1, 'automation', $2, 'automation_workflow', $3, 'run', $4, $5)
     RETURNING id, resource_id, metadata`,
    [level, actorEmail || "n8n@medicareguard.io", workflowId || "n8n", finalMessage, JSON.stringify({ executionId, workflowId, ...metadata })],
  );

  return { executionId, workflowId: inserted.rows[0].resource_id, ...metadata, updated: false };
};

module.exports = { n8nBaseUrl, probeN8n, simulateAction, finalizeExecution };
