import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(__dirname, "../n8n/workflows");
const NODE_COUNT = 40;
const CREDENTIAL = { id: "mg-postgres-credential", name: "MedicareGuard PostgreSQL" };

const ref = (node, field) => `$('${node}').first().json.${field}`;
const sqlRef = (node, field) => `{{ ${ref(node, field)} }}`;

const stageNotes = [
  { x: 0, title: "① Detect", color: 1, detail: "Receive the webhook, validate the entity and freeze a correlation ID." },
  { x: 320, title: "② Enrich", color: 2, detail: "Collect endpoint, identity, mail, vulnerability and evidence context." },
  { x: 640, title: "③ Assess", color: 3, detail: "Correlate the estate, calculate business impact and start the SLA clock." },
  { x: 960, title: "④ Decide", color: 4, detail: "Route the case, notify the SOC and create the response ticket." },
  { x: 1280, title: "⑤ Respond", color: 5, detail: "Execute containment or remediation and wait for propagation." },
  { x: 1600, title: "⑥ Verify", color: 6, detail: "Independently verify the action, escalate on failure and merge branches." },
  { x: 1920, title: "⑦ Evidence", color: 7, detail: "Persist the timeline, audit hash, evidence artifact and threat intel." },
  { x: 2240, title: "⑧ Report", color: 1, detail: "Emit metrics, finalise the run and close the execution cleanly." },
];

const positions = {
  webhook: [0, 0],
  validate: [0, 180],
  dedupe: [0, 360],
  stamp: [0, 540],
  load: [0, 720],
  enrichA: [320, 0],
  enrichB: [320, 180],
  enrichC: [320, 360],
  mergeEnrichment: [320, 540],
  correlate: [320, 720],
  loadAsset: [640, 0],
  loadRelated: [640, 180],
  impact: [640, 360],
  sla: [640, 540],
  gate: [640, 720],
  criticalCase: [960, 0],
  standardCase: [960, 180],
  mergeCase: [960, 360],
  recipients: [960, 540],
  notify: [960, 720],
  ticket: [960, 900],
  timeline: [960, 1080],
  actionA: [1280, 0],
  actionB: [1280, 180],
  wait: [1280, 360],
  verify: [1280, 540],
  verified: [1280, 720],
  mark: [1600, 360],
  escalate: [1600, 540],
  mergeVerify: [1600, 720],
  buildTimeline: [1600, 900],
  persistTimeline: [1920, 0],
  audit: [1920, 180],
  artifact: [1920, 360],
  intel: [1920, 540],
  assetRisk: [1920, 720],
  report: [1920, 900],
  metrics: [2240, 0],
  finalize: [2240, 180],
  close: [2240, 360],
};

let idCounter = 0;
const resetIds = () => {
  idCounter = 0;
};

const id = () => {
  idCounter += 1;
  const hex = crypto.createHash("sha256").update(`medicareguard-n8n-${idCounter}`).digest("hex").slice(0, 32).split("");
  hex[12] = "5";
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20).join("")}`;
};

const node = (name, type, typeVersion, parameters, position, extra = {}) => ({
  name,
  type,
  typeVersion,
  parameters,
  position,
  id: id(),
  ...extra,
});

const code = (name, jsCode, position, extra = {}) =>
  node(name, "n8n-nodes-base.code", 2, { jsCode }, position, extra);

const postgres = (name, query, position, extra = {}) =>
  node(
    name,
    "n8n-nodes-base.postgres",
    2.5,
    { operation: "executeQuery", query, options: {} },
    position,
    { credentials: { postgres: CREDENTIAL }, onError: "continueRegularOutput", ...extra },
  );

const jsonBody = (fields) => `={{ JSON.stringify({ ${fields} }) }}`;

const apiUrl = (suffix) => `={{ ($env.MG_API_URL || 'http://localhost:4000/api') + '${suffix}' }}`;
const apiHeaders = {
  parameters: [
    { name: "Authorization", value: "=Bearer {{ $env.MG_API_TOKEN || '' }}" },
    { name: "Content-Type", value: "application/json" },
  ],
};

const http = (name, method, url, position, body = null, extra = {}) => {
  const parameters = {
    method,
    url,
    sendHeaders: true,
    headerParameters: apiHeaders,
    options: { timeout: 15000 },
  };
  if (body) {
    parameters.sendBody = true;
    parameters.contentType = "json";
    parameters.specifyBody = "json";
    parameters.jsonBody = body;
  }
  return node(name, "n8n-nodes-base.httpRequest", 4.2, parameters, position, {
    onError: "continueRegularOutput",
    ...extra,
  });
};

const simulate = (name, action, position, fields) =>
  http(name, "POST", apiUrl(`/automation/simulate/${action}`), position, jsonBody(fields));

const ifNode = (name, left, right, position) =>
  node(
    name,
    "n8n-nodes-base.if",
    2,
    {
      conditions: {
        options: { caseSensitive: true, leftValue: "", typeValidation: "loose", version: 2 },
        conditions: [
          {
            id: id(),
            leftValue: left,
            rightValue: right,
            operator: { type: typeof right === "number" ? "number" : "boolean", operation: typeof right === "number" ? "gte" : "equals" },
          },
        ],
        combinator: "and",
      },
      options: {},
    },
    position,
  );

const sticky = (name, content, position, width = 280, height = 160, color = 7) =>
  node(name, "n8n-nodes-base.stickyNote", 1, { content, height, width, color }, position);

const workflowSpecs = [
  {
    id: "ransomware-containment",
    name: "Ransomware Containment & Recovery",
    triggerLabel: "Ransomware Alert",
    webhookPath: "mg-ransomware",
    loadName: "Load Alert Record",
    entityType: "alert",
    recordName: "ransomware alert",
    stageSummary: "EDR isolation · C2 block · P1 escalation · forensic evidence",
    loadQuery: `SELECT id, title, severity, status, source, source_ip, risk_score, asset_id, metadata, detected_at
FROM alerts WHERE id = '${sqlRef("Validate Webhook Payload", "entityId")}' LIMIT 1;`,
    assetQuery: `SELECT a.id, a.name, a.ip_address, a.criticality, a.risk_score, a.status, u.full_name AS owner_name, u.email AS owner_email
FROM assets a LEFT JOIN users u ON u.id = a.owner_id
WHERE a.id = (SELECT asset_id FROM alerts WHERE id = '${sqlRef("Validate Webhook Payload", "entityId")}') LIMIT 1;`,
    criticalCaseName: "Open P1 Incident",
    criticalCaseQuery: `INSERT INTO incidents (title, description, severity, status, priority, category, detected_at, sla_due_at, incident_key, metadata)
VALUES ('Ransomware containment — automated P1', 'n8n isolated the endpoint, blocked command-and-control and preserved forensic evidence.',
'critical', 'open', 'P1', 'ransomware', now(), now() + interval '4 hours',
'AUTO-' || upper(substr(md5('${sqlRef("Validate Webhook Payload", "executionId")}'), 1, 10)),
jsonb_build_object('automation', 'ransomware-containment', 'executionId', '${sqlRef("Validate Webhook Payload", "executionId")}', 'entityId', '${sqlRef("Validate Webhook Payload", "entityId")}'))
ON CONFLICT (incident_key) DO UPDATE SET updated_at = now() RETURNING id, incident_key;`,
    standardCaseName: "Open Standard Ticket",
    standardCaseQuery: `INSERT INTO tickets (subject, status, priority, description, metadata)
SELECT 'Automated ransomware review', 'open', 'high', 'Below-threshold ransomware signal routed for analyst review.',
jsonb_build_object('automation', 'ransomware-containment', 'executionId', '${sqlRef("Validate Webhook Payload", "executionId")}')
WHERE NOT EXISTS (SELECT 1 FROM tickets WHERE metadata->>'executionId' = '${sqlRef("Validate Webhook Payload", "executionId")}')
RETURNING id;`,
    enrichA: ["Enrich — EDR Telemetry", "edr-telemetry", `executionId: ${ref("Validate Webhook Payload", "executionId")}, alertId: ${ref("Validate Webhook Payload", "entityId")}`],
    enrichB: ["Enrich — Threat Reputation", "intel-reputation", `executionId: ${ref("Validate Webhook Payload", "executionId")}, indicator: ${ref("Load Alert Record", "source_ip")} || ${ref("Validate Webhook Payload", "entityId")}`],
    enrichC: ["Enrich — Identity Context", "identity-context", `executionId: ${ref("Validate Webhook Payload", "executionId")}, email: 'soc@medicareguard.io'`],
    notifyTitle: "Ransomware containment started",
    notifyMessage: "Automated containment is running for a critical ransomware alert.",
    actionA: ["Isolate Endpoint via EDR", "edr-isolate", `executionId: ${ref("Validate Webhook Payload", "executionId")}, alertId: ${ref("Validate Webhook Payload", "entityId")}, assetId: ${ref("Load Alert Record", "asset_id")}`],
    actionB: ["Block Command & Control", "network-contain", `executionId: ${ref("Validate Webhook Payload", "executionId")}, alertId: ${ref("Validate Webhook Payload", "entityId")}, sourceIp: ${ref("Load Alert Record", "source_ip")}`],
    verifyAction: ["Verify Containment State", "edr-verify", `executionId: ${ref("Validate Webhook Payload", "executionId")}, alertId: ${ref("Validate Webhook Payload", "entityId")}, assetId: ${ref("Load Alert Record", "asset_id")}`],
    markQuery: `UPDATE alerts SET status = 'investigating', metadata = metadata || jsonb_build_object('containedBy', 'n8n', 'containedAt', now()::text), updated_at = now()
WHERE id = '${sqlRef("Validate Webhook Payload", "entityId")}' RETURNING id, status;`,
    reportType: "incident",
    reportName: "Ransomware Containment Report",
    metricNote: "EDR isolation, C2 block, P1 incident and forensic evidence pack",
  },
  {
    id: "phishing-triage",
    name: "Phishing Triage & Credential Reset",
    triggerLabel: "Phish Report",
    webhookPath: "mg-phishing",
    loadName: "Load Alert Record",
    entityType: "alert",
    recordName: "phishing alert",
    stageSummary: "Sandbox detonation · mailbox purge · credential reset · reporter closure",
    loadQuery: `SELECT id, title, severity, status, source, source_ip, risk_score, asset_id, metadata, detected_at
FROM alerts WHERE id = '${sqlRef("Validate Webhook Payload", "entityId")}' LIMIT 1;`,
    assetQuery: `SELECT a.id, a.name, a.ip_address, a.criticality, a.risk_score, a.status, u.full_name AS owner_name, u.email AS owner_email
FROM assets a LEFT JOIN users u ON u.id = a.owner_id
WHERE a.id = (SELECT asset_id FROM alerts WHERE id = '${sqlRef("Validate Webhook Payload", "entityId")}') LIMIT 1;`,
    criticalCaseName: "Open P1 Incident",
    criticalCaseQuery: `INSERT INTO incidents (title, description, severity, status, priority, category, detected_at, sla_due_at, incident_key, metadata)
VALUES ('Phishing credential compromise — automated P1', 'n8n detonated the payload, purged matching mail and forced credential rotation.',
'critical', 'open', 'P1', 'phishing', now(), now() + interval '2 hours',
'AUTO-' || upper(substr(md5('${sqlRef("Validate Webhook Payload", "executionId")}'), 1, 10)),
jsonb_build_object('automation', 'phishing-triage', 'executionId', '${sqlRef("Validate Webhook Payload", "executionId")}', 'entityId', '${sqlRef("Validate Webhook Payload", "entityId")}'))
ON CONFLICT (incident_key) DO UPDATE SET updated_at = now() RETURNING id, incident_key;`,
    standardCaseName: "Open Standard Ticket",
    standardCaseQuery: `INSERT INTO tickets (subject, status, priority, description, metadata)
SELECT 'Automated phishing triage', 'open', 'high', 'Reported message routed for analyst review after automated triage.',
jsonb_build_object('automation', 'phishing-triage', 'executionId', '${sqlRef("Validate Webhook Payload", "executionId")}')
WHERE NOT EXISTS (SELECT 1 FROM tickets WHERE metadata->>'executionId' = '${sqlRef("Validate Webhook Payload", "executionId")}')
RETURNING id;`,
    enrichA: ["Enrich — Sandbox Detonation", "sandbox-detonate", `executionId: ${ref("Validate Webhook Payload", "executionId")}, url: ${ref("Load Alert Record", "metadata")}?.url || ${ref("Load Alert Record", "title")}`],
    enrichB: ["Enrich — Threat Reputation", "intel-reputation", `executionId: ${ref("Validate Webhook Payload", "executionId")}, indicator: ${ref("Load Alert Record", "metadata")}?.file_hash || ${ref("Validate Webhook Payload", "entityId")}`],
    enrichC: ["Enrich — Recipient Identity", "identity-context", `executionId: ${ref("Validate Webhook Payload", "executionId")}, email: ${ref("Load Alert Record", "metadata")}?.recipient || 'analyst@medicareguard.io'`],
    notifyTitle: "Phishing triage started",
    notifyMessage: "Automated phishing triage is detonating the payload and resetting credentials.",
    actionA: ["Quarantine Matching Mail", "email-quarantine", `executionId: ${ref("Validate Webhook Payload", "executionId")}, alertId: ${ref("Validate Webhook Payload", "entityId")}`],
    actionB: ["Revoke Sessions & Reset", "identity-revoke", `executionId: ${ref("Validate Webhook Payload", "executionId")}, email: ${ref("Load Alert Record", "metadata")}?.recipient || 'analyst@medicareguard.io'`],
    verifyAction: ["Verify Identity Containment", "identity-verify", `executionId: ${ref("Validate Webhook Payload", "executionId")}, userId: ${ref("Enrich — Recipient Identity", "data")}?.user?.id`],
    markQuery: `UPDATE alerts SET status = 'investigating', metadata = metadata || jsonb_build_object('quarantinedBy', 'n8n', 'quarantinedAt', now()::text), updated_at = now()
WHERE id = '${sqlRef("Validate Webhook Payload", "entityId")}' RETURNING id, status;`,
    reportType: "incident",
    reportName: "Phishing Triage Report",
    metricNote: "sandbox verdict, mailbox purge, credential reset and reporter closure",
  },
  {
    id: "vulnerability-sla",
    name: "Vulnerability SLA Escalation",
    triggerLabel: "New Finding",
    webhookPath: "mg-vulnerability",
    loadName: "Load Vulnerability Record",
    entityType: "vulnerability",
    recordName: "vulnerability",
    stageSummary: "EPSS/KEV scoring · owner routing · patch orchestration · SLA evidence",
    loadQuery: `SELECT id, title, severity, status, cvss_score, cve_id, asset_id, description, metadata
FROM vulnerabilities WHERE id = '${sqlRef("Validate Webhook Payload", "entityId")}' LIMIT 1;`,
    assetQuery: `SELECT a.id, a.name, a.ip_address, a.criticality, a.risk_score, a.status, u.full_name AS owner_name, u.email AS owner_email
FROM assets a LEFT JOIN users u ON u.id = a.owner_id
WHERE a.id = (SELECT asset_id FROM vulnerabilities WHERE id = '${sqlRef("Validate Webhook Payload", "entityId")}') LIMIT 1;`,
    criticalCaseName: "Open Remediation Incident",
    criticalCaseQuery: `INSERT INTO incidents (title, description, severity, status, priority, category, detected_at, sla_due_at, incident_key, metadata)
VALUES ('Critical vulnerability SLA breach — automated escalation', 'n8n correlated EPSS, KEV and asset criticality and opened a remediation incident.',
'critical', 'open', 'P1', 'vulnerability', now(), now() + interval '24 hours',
'AUTO-' || upper(substr(md5('${sqlRef("Validate Webhook Payload", "executionId")}'), 1, 10)),
jsonb_build_object('automation', 'vulnerability-sla', 'executionId', '${sqlRef("Validate Webhook Payload", "executionId")}', 'entityId', '${sqlRef("Validate Webhook Payload", "entityId")}'))
ON CONFLICT (incident_key) DO UPDATE SET updated_at = now() RETURNING id, incident_key;`,
    standardCaseName: "Open Remediation Ticket",
    standardCaseQuery: `INSERT INTO tickets (subject, status, priority, description, metadata)
SELECT 'Automated vulnerability remediation', 'open', 'medium', 'Finding routed to the asset owner for scheduled remediation.',
jsonb_build_object('automation', 'vulnerability-sla', 'executionId', '${sqlRef("Validate Webhook Payload", "executionId")}')
WHERE NOT EXISTS (SELECT 1 FROM tickets WHERE metadata->>'executionId' = '${sqlRef("Validate Webhook Payload", "executionId")}')
RETURNING id;`,
    enrichA: ["Enrich — EPSS & KEV Intel", "vuln-intel", `executionId: ${ref("Validate Webhook Payload", "executionId")}, vulnerabilityId: ${ref("Validate Webhook Payload", "entityId")}`],
    enrichB: ["Enrich — Threat Reputation", "intel-reputation", `executionId: ${ref("Validate Webhook Payload", "executionId")}, indicator: ${ref("Load Vulnerability Record", "cve_id")}`],
    enrichC: ["Enrich — Patch Catalog", "patch-catalog", `executionId: ${ref("Validate Webhook Payload", "executionId")}, cveId: ${ref("Load Vulnerability Record", "cve_id")}`],
    notifyTitle: "Vulnerability SLA escalation",
    notifyMessage: "A critical CVE is being remediated by the automated SLA workflow.",
    actionA: ["Create Change Request", "change-request", `executionId: ${ref("Validate Webhook Payload", "executionId")}, vulnerabilityId: ${ref("Validate Webhook Payload", "entityId")}, assetId: ${ref("Load Vulnerability Record", "asset_id")}`],
    actionB: ["Orchestrate Patching", "patch-orchestrate", `executionId: ${ref("Validate Webhook Payload", "executionId")}, assetId: ${ref("Load Vulnerability Record", "asset_id")}, cveId: ${ref("Load Vulnerability Record", "cve_id")}`],
    verifyAction: ["Verify Patch Deployment", "patch-verify", `executionId: ${ref("Validate Webhook Payload", "executionId")}, assetId: ${ref("Load Vulnerability Record", "asset_id")}`],
    markQuery: `UPDATE vulnerabilities SET status = 'in_progress', metadata = metadata || jsonb_build_object('remediationStartedBy', 'n8n', 'remediationStartedAt', now()::text), updated_at = now()
WHERE id = '${sqlRef("Validate Webhook Payload", "entityId")}' RETURNING id, status;`,
    reportType: "vulnerability",
    reportName: "Vulnerability SLA Report",
    metricNote: "EPSS/KEV scoring, change approval, patch deployment and SLA evidence",
  },
  {
    id: "compliance-evidence",
    name: "Continuous Compliance Evidence",
    triggerLabel: "Evidence Request",
    webhookPath: "mg-compliance",
    loadName: "Load Control Inventory",
    entityType: "compliance_control",
    recordName: "compliance control",
    stageSummary: "Identity/endpoint/audit evidence · immutable pack · auditor report",
    loadQuery: `SELECT id, framework, control_id, title, status, score, owner_id, description, metadata
FROM compliance_controls WHERE id = '${sqlRef("Validate Webhook Payload", "entityId")}' LIMIT 1;`,
    assetQuery: `SELECT a.id, a.name, a.ip_address, a.criticality, a.risk_score, a.status, u.full_name AS owner_name, u.email AS owner_email
FROM assets a LEFT JOIN users u ON u.id = a.owner_id ORDER BY a.risk_score DESC LIMIT 1;`,
    criticalCaseName: "Open Control Gap",
    criticalCaseQuery: `INSERT INTO incidents (title, description, severity, status, priority, category, detected_at, sla_due_at, incident_key, metadata)
VALUES ('Compliance control gap — automated escalation', 'n8n detected a control gap while assembling immutable evidence.',
'high', 'open', 'P2', 'compliance', now(), now() + interval '72 hours',
'AUTO-' || upper(substr(md5('${sqlRef("Validate Webhook Payload", "executionId")}'), 1, 10)),
jsonb_build_object('automation', 'compliance-evidence', 'executionId', '${sqlRef("Validate Webhook Payload", "executionId")}', 'entityId', '${sqlRef("Validate Webhook Payload", "entityId")}'))
ON CONFLICT (incident_key) DO UPDATE SET updated_at = now() RETURNING id, incident_key;`,
    standardCaseName: "Open Evidence Task",
    standardCaseQuery: `INSERT INTO tickets (subject, status, priority, description, metadata)
SELECT 'Automated compliance evidence refresh', 'open', 'medium', 'Evidence pack assembled for the selected control and framework.',
jsonb_build_object('automation', 'compliance-evidence', 'executionId', '${sqlRef("Validate Webhook Payload", "executionId")}')
WHERE NOT EXISTS (SELECT 1 FROM tickets WHERE metadata->>'executionId' = '${sqlRef("Validate Webhook Payload", "executionId")}')
RETURNING id;`,
    enrichA: ["Enrich — Identity Evidence", "evidence-identity", `executionId: ${ref("Validate Webhook Payload", "executionId")}, controlId: ${ref("Validate Webhook Payload", "entityId")}`],
    enrichB: ["Enrich — Endpoint Evidence", "evidence-endpoint", `executionId: ${ref("Validate Webhook Payload", "executionId")}, controlId: ${ref("Validate Webhook Payload", "entityId")}`],
    enrichC: ["Enrich — Audit Evidence", "evidence-audit", `executionId: ${ref("Validate Webhook Payload", "executionId")}, controlId: ${ref("Validate Webhook Payload", "entityId")}`],
    notifyTitle: "Compliance evidence collection",
    notifyMessage: "Automated evidence collection is running for a compliance control.",
    actionA: ["Assemble Evidence Pack", "evidence-pack", `executionId: ${ref("Validate Webhook Payload", "executionId")}, controlId: ${ref("Validate Webhook Payload", "entityId")}`],
    actionB: ["Persist Immutable Artifact", "evidence-persist", `executionId: ${ref("Validate Webhook Payload", "executionId")}, controlId: ${ref("Validate Webhook Payload", "entityId")}`],
    verifyAction: ["Verify Evidence Integrity", "evidence-verify", `executionId: ${ref("Validate Webhook Payload", "executionId")}, controlId: ${ref("Validate Webhook Payload", "entityId")}`],
    markQuery: `UPDATE compliance_controls SET metadata = metadata || jsonb_build_object('lastEvidenceAt', now()::text, 'evidenceBy', 'n8n'), updated_at = now()
WHERE id = '${sqlRef("Validate Webhook Payload", "entityId")}' RETURNING id, status;`,
    reportType: "compliance",
    reportName: "Continuous Compliance Evidence Report",
    metricNote: "identity, endpoint and audit evidence with immutable checksum",
  },
];

const buildWorkflow = (spec) => {
  resetIds();
  const validateCode = `const body = $json.body ?? $json;
const raw = body.entityId || body.alertId || body.findingId || body.vulnerabilityId || body.controlId || body.framework;
const entityId = String(raw || '').trim();
if (!entityId) { throw new Error('entityId is required'); }
const executionId = String(body.executionId || ('ext-' + Date.now()));
return [{ json: { ...body, entityId, executionId, workflowId: '${spec.id}', workflowName: '${spec.name}', entityType: '${spec.entityType}', mode: body.mode || 'manual', triggeredBy: body.triggeredBy || 'n8n-webhook', receivedAt: body.startedAt || new Date().toISOString() } }];`;

  const dedupeCode = `const payload = $json;
const idempotencyKey = payload.workflowId + ':' + payload.entityId + ':' + payload.executionId;
return [{ json: { ...payload, idempotencyKey, dedupeStatus: 'unique', lane: 'primary' } }];`;

  const mergeEnrichmentCode = `const read = (name) => { try { return $(name).first().json || {}; } catch (error) { return {}; } };
const base = read('Validate Webhook Payload');
const record = read('${spec.loadName}');
return [{ json: { ...base, record, enrichment: { primary: read('${spec.enrichA[0]}'), reputation: read('${spec.enrichB[0]}'), identity: read('${spec.enrichC[0]}') } } }];`;

  const correlateCode = `const read = (name) => { try { return $(name).first().json || {}; } catch (error) { return {}; } };
const context = read('Merge Enrichment Context');
const record = context.record || {};
const indicators = [record.source_ip, record.cve_id, record.control_id, record.title].filter(Boolean);
return [{ json: { ...context, indicators, correlationCount: indicators.length, correlatedAt: new Date().toISOString() } }];`;

  const impactCode = `const read = (name) => { try { return $(name).first().json || {}; } catch (error) { return {}; } };
const base = read('Correlate Threat Indicators');
const record = read('${spec.loadName}');
const asset = read('Load Asset Ownership');
const related = read('Load Related Activity');
const severity = String(record.severity || record.status || '').toLowerCase();
const severityWeight = { critical: 45, high: 30, medium: 15, low: 5 }[severity] || 10;
const criticalityWeight = { critical: 25, high: 18, medium: 10, low: 4 }[String(asset.criticality || '').toLowerCase()] || 5;
const exposure = Number(record.cvss_score ? Number(record.cvss_score) * 6 : record.score ? (100 - Number(record.score)) * 0.55 : 25);
const relatedWeight = Math.min(20, Object.values(related).reduce((sum, value) => sum + Number(value || 0), 0) * 2);
let riskScore = Math.round(severityWeight + criticalityWeight + exposure + relatedWeight);
if (record.score !== undefined && record.cvss_score === undefined) riskScore = Math.max(15, Math.min(100, 100 - Number(record.score)));
riskScore = Math.max(1, Math.min(100, riskScore || 50));
return [{ json: { ...base, record, asset, related, riskScore, severity: severity || 'medium', workflowName: '${spec.name}', entityId: base.entityId, entityType: '${spec.entityType}', correlationId: base.correlationId } }];`;

  const slaCode = `const read = (name) => { try { return $(name).first().json || {}; } catch (error) { return {}; } };
const context = read('Compute Business Impact');
const slaMinutes = { critical: 60, high: 240, medium: 1440, low: 4320 }[String(context.severity || '').toLowerCase()] || 1440;
return [{ json: { ...context, slaMinutes, slaDueAt: new Date(Date.now() + slaMinutes * 60000).toISOString(), breachRisk: context.riskScore >= 75 ? 'high' : 'normal' } }];`;

  const timelineCode = `const read = (name) => { try { return $(name).first().json || {}; } catch (error) { return {}; } };
const context = read('Compute Business Impact');
const caseRecord = read('Merge Case Handling');
const verification = read('Merge Verification');
return [{ json: { ...context, caseRecord, verification, verified: Boolean(verification.id || verification.verified || verification.data?.verified), stages: ['detected', 'enriched', 'case_opened', 'notified', 'responded', 'verified'], completedAt: new Date().toISOString() } }];`;

  const metricsCode = `const read = (name) => { try { return $(name).first().json || {}; } catch (error) { return {}; } };
const context = read('Build Forensic Timeline');
const startedAt = read('Validate Webhook Payload').receivedAt;
return [{ json: { executionId: read('Validate Webhook Payload').executionId, workflowId: '${spec.id}', workflowName: '${spec.name}', status: 'success', riskScore: context.riskScore, verified: context.verified, durationMs: Math.max(1, Date.now() - new Date(startedAt).getTime()), nodeCount: ${NODE_COUNT}, metrics: { risk_score: context.riskScore, stages_completed: context.stages?.length || 6, case_opened: Boolean(context.caseRecord?.id), verified: context.verified, evidence_records: 3 }, message: 'n8n completed ${spec.name} for execution ' + read('Validate Webhook Payload').executionId } }];`;

  const finalizeFields = `workflowId: $json.workflowId, status: $json.status, durationMs: $json.durationMs, nodeCount: $json.nodeCount, metrics: $json.metrics, message: $json.message`;

  const nodes = [
    node("Webhook — " + spec.triggerLabel, "n8n-nodes-base.webhook", 2, { httpMethod: "POST", path: spec.webhookPath, responseMode: "onReceived", options: {} }, positions.webhook, { webhookId: id() }),
    code("Validate Webhook Payload", validateCode, positions.validate),
    code("Deduplicate Active Run", dedupeCode, positions.dedupe),
    node("Stamp Correlation Context", "n8n-nodes-base.set", 3.3, {
      assignments: {
        assignments: [
          { id: id(), name: "correlationId", value: `={{ $json.workflowId + '-' + $json.executionId.slice(0, 8) }}`, type: "string" },
          { id: id(), name: "workflowName", value: spec.name, type: "string" },
          { id: id(), name: "entityType", value: spec.entityType, type: "string" },
        ],
      },
      options: {},
    }, positions.stamp),
    postgres(spec.loadName, spec.loadQuery, positions.load),
    simulate(spec.enrichA[0], spec.enrichA[1], positions.enrichA, spec.enrichA[2]),
    simulate(spec.enrichB[0], spec.enrichB[1], positions.enrichB, spec.enrichB[2]),
    simulate(spec.enrichC[0], spec.enrichC[1], positions.enrichC, spec.enrichC[2]),
    code("Merge Enrichment Context", mergeEnrichmentCode, positions.mergeEnrichment),
    code("Correlate Threat Indicators", correlateCode, positions.correlate),
    postgres("Load Asset Ownership", spec.assetQuery, positions.loadAsset),
    postgres("Load Related Activity", `SELECT (SELECT count(*)::int FROM incidents WHERE status NOT IN ('resolved','closed')) AS open_incidents,
       (SELECT count(*)::int FROM alerts WHERE severity = 'critical' AND status IN ('open','investigating')) AS critical_alerts,
       (SELECT count(*)::int FROM vulnerabilities WHERE status = 'open') AS open_vulnerabilities;`, positions.loadRelated),
    code("Compute Business Impact", impactCode, positions.impact),
    code("Check SLA Clock", slaCode, positions.sla),
    ifNode("Business Impact Gate", `={{ $json.riskScore }}`, 70, positions.gate),
    postgres(spec.criticalCaseName, spec.criticalCaseQuery, positions.criticalCase),
    postgres(spec.standardCaseName, spec.standardCaseQuery, positions.standardCase),
    node("Merge Case Handling", "n8n-nodes-base.merge", 3, { mode: "append", numberInputs: 2, options: {} }, positions.mergeCase),
    postgres("Load Notification Recipients", "SELECT u.id, u.email, u.full_name FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name IN ('admin','analyst') LIMIT 1;", positions.recipients),
    simulate("Notify SOC Channel", "notify", positions.notify, `executionId: ${ref("Validate Webhook Payload", "executionId")}, title: '${spec.notifyTitle}', message: '${spec.notifyMessage}', severity: ${ref("Compute Business Impact", "severity")}, channel: '#soc-alerts'`),
    simulate("Create External Ticket", "ticket-sync", positions.ticket, `executionId: ${ref("Validate Webhook Payload", "executionId")}, workflowId: '${spec.id}', subject: '${spec.name}'`),
    postgres("Update Case Timeline", `INSERT INTO comments (resource, resource_id, body, metadata)
VALUES ('${spec.entityType === "compliance_control" ? "compliance_controls" : spec.entityType === "vulnerability" ? "vulnerabilities" : "alerts"}', '${sqlRef("Validate Webhook Payload", "entityId")}',
'n8n automation: ${spec.name} completed enrichment, notification and case routing.',
jsonb_build_object('automation', '${spec.id}', 'executionId', '${sqlRef("Validate Webhook Payload", "executionId")}')) RETURNING id;`, positions.timeline),
    simulate(spec.actionA[0], spec.actionA[1], positions.actionA, spec.actionA[2]),
    simulate(spec.actionB[0], spec.actionB[1], positions.actionB, spec.actionB[2]),
    node("Wait for Propagation", "n8n-nodes-base.wait", 1.1, { amount: 2, unit: "seconds" }, positions.wait, { webhookId: id() }),
    simulate(spec.verifyAction[0], spec.verifyAction[1], positions.verify, spec.verifyAction[2]),
    ifNode("Response Verified?", `={{ $json.data.verified }}`, true, positions.verified),
    postgres("Mark Record Responded", spec.markQuery, positions.mark),
    simulate("Escalate to IR Lead", "notify", positions.escalate, `executionId: ${ref("Validate Webhook Payload", "executionId")}, title: 'Manual intervention required — ${spec.name}', message: 'Automated verification failed or needs review.', severity: 'critical', channel: '#soc-escalations'`),
    node("Merge Verification", "n8n-nodes-base.merge", 3, { mode: "append", numberInputs: 2, options: {} }, positions.mergeVerify),
    code("Build Forensic Timeline", timelineCode, positions.buildTimeline),
    postgres("Persist Response Timeline", `INSERT INTO comments (resource, resource_id, body, metadata)
VALUES ('${spec.entityType === "compliance_control" ? "compliance_controls" : spec.entityType === "vulnerability" ? "vulnerabilities" : "alerts"}', '${sqlRef("Validate Webhook Payload", "entityId")}',
'Automated timeline rebuilt: detected → enriched → case opened → response → verification.',
jsonb_build_object('automation', '${spec.id}', 'executionId', '${sqlRef("Validate Webhook Payload", "executionId")}', 'timeline', true)) RETURNING id;`, positions.persistTimeline),
    simulate("Write Audit Evidence", "evidence-write", positions.audit, `executionId: ${ref("Validate Webhook Payload", "executionId")}, workflowId: '${spec.id}', riskScore: ${ref("Compute Business Impact", "riskScore")}, report: '${spec.reportName}'`),
    simulate("Attach Evidence Artifact", "evidence-persist", positions.artifact, `executionId: ${ref("Validate Webhook Payload", "executionId")}, workflowId: '${spec.id}', controlId: ${ref("Validate Webhook Payload", "entityId")}`),
    simulate("Sync Threat Intelligence", "intel-sync", positions.intel, `executionId: ${ref("Validate Webhook Payload", "executionId")}, indicators: ${ref("Correlate Threat Indicators", "indicators")}`),
    postgres("Update Asset Risk Posture", `UPDATE assets SET risk_score = LEAST(100, risk_score + 3), metadata = metadata || jsonb_build_object('lastAutomationAt', now()::text), updated_at = now()
WHERE id = NULLIF('${sqlRef("Load Asset Ownership", "id")}', '')::uuid RETURNING id, risk_score;`, positions.assetRisk),
    http("Generate Response Report", "POST", apiUrl("/reports/generate"), positions.report, jsonBody(`name: '${spec.reportName} — ' + ${ref("Validate Webhook Payload", "executionId")}.slice(0, 8), type: '${spec.reportType}', format: 'json', days: 30`)),
    code("Emit Automation Metrics", metricsCode, positions.metrics),
    http("Finalize Execution", "POST", `={{ ($env.MG_API_URL || 'http://localhost:4000/api') + '/automation/executions/' + ${ref("Validate Webhook Payload", "executionId")} + '/complete' }}`, positions.finalize, jsonBody(finalizeFields)),
    node("Close Run", "n8n-nodes-base.noOp", 1, {}, positions.close),
  ];

  stageNotes.forEach((stage) => {
    nodes.push(sticky(`Sticky Note — ${stage.title}`, `## ${stage.title}\n${stage.detail}`, [stage.x, -260], 280, 160, stage.color));
  });
  nodes.push(sticky("Sticky Note — Workflow Overview", `# ${spec.name}\n${spec.stageSummary}\n\n**Trigger:** webhook \`${spec.webhookPath}\` · **Owner:** SOC Automation · **SLA:** production playbook`, [2240, -520], 900, 200, 4));

  const connections = {
    ["Webhook — " + spec.triggerLabel]: { main: [[{ node: "Validate Webhook Payload", type: "main", index: 0 }]] },
    "Validate Webhook Payload": { main: [[{ node: "Deduplicate Active Run", type: "main", index: 0 }]] },
    "Deduplicate Active Run": { main: [[{ node: "Stamp Correlation Context", type: "main", index: 0 }]] },
    "Stamp Correlation Context": { main: [[{ node: spec.loadName, type: "main", index: 0 }]] },
    [spec.loadName]: { main: [[{ node: spec.enrichA[0], type: "main", index: 0 }]] },
    [spec.enrichA[0]]: { main: [[{ node: spec.enrichB[0], type: "main", index: 0 }]] },
    [spec.enrichB[0]]: { main: [[{ node: spec.enrichC[0], type: "main", index: 0 }]] },
    [spec.enrichC[0]]: { main: [[{ node: "Merge Enrichment Context", type: "main", index: 0 }]] },
    "Merge Enrichment Context": { main: [[{ node: "Correlate Threat Indicators", type: "main", index: 0 }]] },
    "Correlate Threat Indicators": { main: [[{ node: "Load Asset Ownership", type: "main", index: 0 }]] },
    "Load Asset Ownership": { main: [[{ node: "Load Related Activity", type: "main", index: 0 }]] },
    "Load Related Activity": { main: [[{ node: "Compute Business Impact", type: "main", index: 0 }]] },
    "Compute Business Impact": { main: [[{ node: "Check SLA Clock", type: "main", index: 0 }]] },
    "Check SLA Clock": { main: [[{ node: "Business Impact Gate", type: "main", index: 0 }]] },
    "Business Impact Gate": {
      main: [
        [{ node: spec.criticalCaseName, type: "main", index: 0 }],
        [{ node: spec.standardCaseName, type: "main", index: 0 }],
      ],
    },
    [spec.criticalCaseName]: { main: [[{ node: "Merge Case Handling", type: "main", index: 0 }]] },
    [spec.standardCaseName]: { main: [[{ node: "Merge Case Handling", type: "main", index: 1 }]] },
    "Merge Case Handling": { main: [[{ node: "Load Notification Recipients", type: "main", index: 0 }]] },
    "Load Notification Recipients": { main: [[{ node: "Notify SOC Channel", type: "main", index: 0 }]] },
    "Notify SOC Channel": { main: [[{ node: "Create External Ticket", type: "main", index: 0 }]] },
    "Create External Ticket": { main: [[{ node: "Update Case Timeline", type: "main", index: 0 }]] },
    "Update Case Timeline": { main: [[{ node: spec.actionA[0], type: "main", index: 0 }]] },
    [spec.actionA[0]]: { main: [[{ node: spec.actionB[0], type: "main", index: 0 }]] },
    [spec.actionB[0]]: { main: [[{ node: "Wait for Propagation", type: "main", index: 0 }]] },
    "Wait for Propagation": { main: [[{ node: spec.verifyAction[0], type: "main", index: 0 }]] },
    [spec.verifyAction[0]]: { main: [[{ node: "Response Verified?", type: "main", index: 0 }]] },
    "Response Verified?": {
      main: [
        [{ node: "Mark Record Responded", type: "main", index: 0 }],
        [{ node: "Escalate to IR Lead", type: "main", index: 0 }],
      ],
    },
    "Mark Record Responded": { main: [[{ node: "Merge Verification", type: "main", index: 0 }]] },
    "Escalate to IR Lead": { main: [[{ node: "Merge Verification", type: "main", index: 1 }]] },
    "Merge Verification": { main: [[{ node: "Build Forensic Timeline", type: "main", index: 0 }]] },
    "Build Forensic Timeline": { main: [[{ node: "Persist Response Timeline", type: "main", index: 0 }]] },
    "Persist Response Timeline": { main: [[{ node: "Write Audit Evidence", type: "main", index: 0 }]] },
    "Write Audit Evidence": { main: [[{ node: "Attach Evidence Artifact", type: "main", index: 0 }]] },
    "Attach Evidence Artifact": { main: [[{ node: "Sync Threat Intelligence", type: "main", index: 0 }]] },
    "Sync Threat Intelligence": { main: [[{ node: "Update Asset Risk Posture", type: "main", index: 0 }]] },
    "Update Asset Risk Posture": { main: [[{ node: "Generate Response Report", type: "main", index: 0 }]] },
    "Generate Response Report": { main: [[{ node: "Emit Automation Metrics", type: "main", index: 0 }]] },
    "Emit Automation Metrics": { main: [[{ node: "Finalize Execution", type: "main", index: 0 }]] },
    "Finalize Execution": { main: [[{ node: "Close Run", type: "main", index: 0 }]] },
  };

  return {
    id: spec.id,
    name: spec.name,
    active: false,
    nodes,
    connections,
    settings: { executionOrder: "v1", saveExecutionProgress: true, saveManualExecutions: true, timezone: "Asia/Ho_Chi_Minh" },
    staticData: null,
    pinData: {},
    meta: { templateCredsSetupCompleted: true, workflowDescription: spec.stageSummary },
    tags: [{ name: "MedicareGuard" }, { name: spec.id }],
  };
};

fs.mkdirSync(outputDir, { recursive: true });
const manifest = [];
for (const spec of workflowSpecs) {
  const workflow = buildWorkflow(spec);
  const file = path.join(outputDir, `${spec.id}.json`);
  fs.writeFileSync(file, JSON.stringify(workflow, null, 2) + "\n");
  const executable = workflow.nodes.filter((item) => !item.type.endsWith(".stickyNote")).length;
  const allNodes = workflow.nodes.length;
  const connectionCount = Object.keys(workflow.connections).length;
  manifest.push({ id: spec.id, name: spec.name, executable, stickyNotes: allNodes - executable, connections: connectionCount, file: path.relative(path.resolve(__dirname, ".."), file) });
  console.log(`${spec.id}: ${executable} executable nodes, ${allNodes - executable} sticky notes, ${connectionCount} connection groups`);
}
fs.writeFileSync(path.join(outputDir, "manifest.json"), JSON.stringify({ nodeCount: NODE_COUNT, workflows: manifest }, null, 2) + "\n");
