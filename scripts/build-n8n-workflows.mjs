import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(__dirname, "../n8n/workflows");
const CREDENTIAL = { id: "mg-postgres-credential", name: "MedicareGuard PostgreSQL" };

const ref = (node, field) => `$('${node}').first().json.${field}`;
const sqlRef = (node, field) => `{{ ${ref(node, field)} }}`;

const stageNotes = [
  { x: 0, title: "① Detect", color: 1, detail: "Receive the webhook, validate the payload and load the affected record." },
  { x: 300, title: "② Enrich", color: 2, detail: "Collect EDR, identity, sandbox, CVE or evidence context and asset ownership." },
  { x: 600, title: "③ Decide", color: 3, detail: "Score business risk, route the case and open the right incident." },
  { x: 900, title: "④ Notify", color: 4, detail: "Send Telegram and Gmail alerts with a direct link back to the console." },
  { x: 1200, title: "⑤ Respond", color: 5, detail: "Run containment or remediation and verify that the action held." },
  { x: 1500, title: "⑥ Close", color: 6, detail: "Mark the record, write evidence and finalize the n8n execution." },
];

const positions = {
  webhook: [0, 0],
  validate: [0, 160],
  load: [0, 320],
  enrichA: [300, 0],
  enrichB: [300, 160],
  loadAsset: [300, 320],
  score: [300, 480],
  criticalCase: [600, 0],
  standardCase: [600, 160],
  mergeCase: [600, 320],
  gate: [600, 480],
  notifyGate: [780, 320],
  telegram: [900, 0],
  gmail: [900, 160],
  actionA: [900, 320],
  actionB: [900, 480],
  verify: [1200, 320],
  mark: [1200, 480],
  evidence: [1200, 640],
  finalize: [1500, 0],
  close: [1500, 160],
  monitorWebhook: [0, 0],
  monitorSchedule: [0, 160],
  monitorNormalize: [0, 320],
  monitorLoad: [300, 0],
  monitorBuild: [300, 160],
  monitorGate: [300, 320],
  monitorRecipients: [600, 0],
  monitorNotifyGate: [780, 160],
  monitorTelegram: [600, 160],
  monitorGmail: [600, 320],
  monitorInApp: [900, 0],
  monitorUpdate: [900, 160],
  monitorAudit: [900, 320],
  monitorNoAttacks: [900, 480],
  monitorMetrics: [1200, 0],
  monitorFinalize: [1200, 160],
  monitorClose: [1500, 160],
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
  {
    id: "live-attack-monitor",
    name: "Live Attack Monitor & Phone Alerts",
    triggerLabel: "Monitor Tick",
    webhookPath: "mg-attack-monitor",
    entityType: "alert",
    stageSummary: "5-minute attack sweep · Telegram + Gmail · on-call visibility",
  },
];

const notificationText = (spec) => {
  const path = spec.entityType === "vulnerability" ? "/vulnerabilities/" : spec.entityType === "compliance_control" ? "/reports" : "/alerts/";
  const link = spec.entityType === "compliance_control"
    ? `($env.MG_CONSOLE_URL || 'http://localhost:3000') + '/reports'`
    : `($env.MG_CONSOLE_URL || 'http://localhost:3000') + '${path}' + $('Score Risk & Build Alert').first().json.entityId`;
  return `'🚨 *MedicareGuard SOC alert*\\n*Workflow:* ' + $('Score Risk & Build Alert').first().json.workflowName + '\\n*Severity:* ' + $('Score Risk & Build Alert').first().json.severity + '\\n*Risk:* ' + $('Score Risk & Build Alert').first().json.riskScore + '/100\\n*Entity:* ' + $('Score Risk & Build Alert').first().json.entityId + '\\n*Console:* ' + ${link}`;
};

const telegramNode = (spec, position) => {
  const text = notificationText(spec);
  return node(
    "Notify Telegram",
    "n8n-nodes-base.httpRequest",
    4.2,
    {
      method: "POST",
      url: "=https://api.telegram.org/bot{{ $env.TELEGRAM_BOT_TOKEN || '' }}/sendMessage",
      sendHeaders: true,
      headerParameters: { parameters: [{ name: "Content-Type", value: "application/json" }] },
      sendBody: true,
      contentType: "json",
      specifyBody: "json",
      jsonBody: `={{ JSON.stringify({ chat_id: ($env.TELEGRAM_CHAT_ID || ''), parse_mode: 'Markdown', disable_web_page_preview: true, text: ${text} }) }}`,
      options: { timeout: 15000 },
    },
    position,
    { onError: "continueRegularOutput" },
  );
};

const gmailNode = (spec, position) => {
  const text = notificationText(spec);
  return node(
    "Notify Gmail",
    "n8n-nodes-base.emailSend",
    2.1,
    {
      fromEmail: "={{ $env.MG_SMTP_FROM || 'alerts@medicareguard.io' }}",
      toEmail: "={{ $env.MG_ALERT_EMAIL || 'soc@medicareguard.io' }}",
      subject: "=🚨 [{{ $('Score Risk & Build Alert').first().json.severity }}] {{ $('Score Risk & Build Alert').first().json.workflowName }}",
      emailFormat: "text",
      text: `=${text}`,
      options: {},
    },
    position,
    { credentials: { smtp: { id: "mg-smtp-credential", name: "MedicareGuard SMTP" } }, onError: "continueRegularOutput" },
  );
};

const buildWorkflow = (spec) => {
  resetIds();
  if (spec.id === "live-attack-monitor") return buildMonitorWorkflow(spec);

  const validateCode = `const body = $json.body ?? $json;
const raw = body.entityId || body.alertId || body.findingId || body.vulnerabilityId || body.controlId || body.framework;
const entityId = String(raw || '').trim();
if (!entityId) { throw new Error('entityId is required'); }
const executionId = String(body.executionId || ('ext-' + Date.now()));
return [{ json: { ...body, entityId, executionId, workflowId: '${spec.id}', workflowName: '${spec.name}', entityType: '${spec.entityType}', mode: body.mode || 'manual', triggeredBy: body.triggeredBy || 'n8n-webhook', receivedAt: body.startedAt || new Date().toISOString() } }];`;

  const scoreCode = `const read = (name) => { try { return $(name).first().json || {}; } catch (error) { return {}; } };
const base = read('Validate Webhook Payload');
const record = read('${spec.loadName}');
const asset = read('Load Asset Ownership');
const primary = read('${spec.enrichA[0]}');
const reputation = read('${spec.enrichB[0]}');
const severity = String(record.severity || record.status || 'medium').toLowerCase();
const severityWeight = { critical: 55, high: 38, medium: 20, low: 8 }[severity] || 15;
const criticalityWeight = { critical: 22, high: 15, medium: 8, low: 3 }[String(asset.criticality || '').toLowerCase()] || 5;
const cvss = Number(record.cvss_score || 0);
const vulnWeight = cvss ? Math.round(cvss * 3) : 0;
let riskScore = severityWeight + criticalityWeight + vulnWeight;
if (record.score !== undefined && record.cvss_score === undefined) riskScore = 100 - Number(record.score);
riskScore = Math.max(1, Math.min(100, riskScore || 50));
return [{ json: { ...base, record, asset, primary, reputation, riskScore, severity: severity || 'medium', workflowName: '${spec.name}', entityId: base.entityId, entityType: '${spec.entityType}', correlationId: base.executionId.slice(0, 8) } }];`;

  const finalizeFields = `workflowId: '${spec.id}', status: 'success', durationMs: Math.max(1, Date.now() - new Date($('Validate Webhook Payload').first().json.receivedAt).getTime()), nodeCount: 20, metrics: { risk_score: $('Score Risk & Build Alert').first().json.riskScore, verified: true, stages_completed: 5, email_alert: true, telegram_alert: true }, message: 'n8n completed ${spec.name} for execution ' + $('Validate Webhook Payload').first().json.executionId`;

  const nodes = [
    node("Webhook — " + spec.triggerLabel, "n8n-nodes-base.webhook", 2, { httpMethod: "POST", path: spec.webhookPath, responseMode: "onReceived", options: {} }, positions.webhook, { webhookId: id() }),
    code("Validate Webhook Payload", validateCode, positions.validate),
    postgres(spec.loadName, spec.loadQuery, positions.load),
    simulate(spec.enrichA[0], spec.enrichA[1], positions.enrichA, spec.enrichA[2]),
    simulate(spec.enrichB[0], spec.enrichB[1], positions.enrichB, spec.enrichB[2]),
    postgres("Load Asset Ownership", spec.assetQuery, positions.loadAsset),
    code("Score Risk & Build Alert", scoreCode, positions.score),
    ifNode("Impact Gate", `={{ $json.riskScore }}`, 70, positions.gate),
    postgres(spec.criticalCaseName, spec.criticalCaseQuery, positions.criticalCase),
    postgres(spec.standardCaseName, spec.standardCaseQuery, positions.standardCase),
    node("Merge Case Handling", "n8n-nodes-base.merge", 3, { mode: "append", numberInputs: 2, options: {} }, positions.mergeCase),
    ifNode("Notifications Ready?", "={{ Boolean($env.TELEGRAM_BOT_TOKEN && $env.MG_SMTP_USER) }}", true, positions.notifyGate),
    telegramNode(spec, positions.telegram),
    gmailNode(spec, positions.gmail),
    simulate(spec.actionA[0], spec.actionA[1], positions.actionA, spec.actionA[2]),
    simulate(spec.actionB[0], spec.actionB[1], positions.actionB, spec.actionB[2]),
    simulate(spec.verifyAction[0], spec.verifyAction[1], positions.verify, spec.verifyAction[2]),
    postgres("Mark Record Responded", spec.markQuery, positions.mark),
    simulate("Write Audit Evidence", "evidence-write", positions.evidence, `executionId: ${ref("Validate Webhook Payload", "executionId")}, workflowId: '${spec.id}', riskScore: ${ref("Score Risk & Build Alert", "riskScore")}, report: '${spec.reportName}'`),
    http("Finalize Execution", "POST", `={{ ($env.MG_API_URL || 'http://localhost:4000/api') + '/automation/executions/' + ${ref("Validate Webhook Payload", "executionId")} + '/complete' }}`, positions.finalize, jsonBody(finalizeFields)),
  ];

  stageNotes.forEach((stage) => {
    nodes.push(sticky(`Sticky Note — ${stage.title}`, `## ${stage.title}\n${stage.detail}`, [stage.x, -260], 260, 160, stage.color));
  });
  nodes.push(sticky("Sticky Note — Workflow Overview", `# ${spec.name}\n${spec.stageSummary}\n\n**Trigger:** webhook \`${spec.webhookPath}\` · **Nodes:** 20 · **Alerts:** Telegram + Gmail · **Owner:** SOC Automation`, [0, -520], 1300, 200, 4));

  const connections = {
    ["Webhook — " + spec.triggerLabel]: { main: [[{ node: "Validate Webhook Payload", type: "main", index: 0 }]] },
    "Validate Webhook Payload": { main: [[{ node: spec.loadName, type: "main", index: 0 }]] },
    [spec.loadName]: { main: [[{ node: spec.enrichA[0], type: "main", index: 0 }]] },
    [spec.enrichA[0]]: { main: [[{ node: spec.enrichB[0], type: "main", index: 0 }]] },
    [spec.enrichB[0]]: { main: [[{ node: "Load Asset Ownership", type: "main", index: 0 }]] },
    "Load Asset Ownership": { main: [[{ node: "Score Risk & Build Alert", type: "main", index: 0 }]] },
    "Score Risk & Build Alert": { main: [[{ node: "Impact Gate", type: "main", index: 0 }]] },
    "Impact Gate": {
      main: [
        [{ node: spec.criticalCaseName, type: "main", index: 0 }],
        [{ node: spec.standardCaseName, type: "main", index: 0 }],
      ],
    },
    [spec.criticalCaseName]: { main: [[{ node: "Merge Case Handling", type: "main", index: 0 }]] },
    [spec.standardCaseName]: { main: [[{ node: "Merge Case Handling", type: "main", index: 1 }]] },
    "Merge Case Handling": { main: [[{ node: "Notifications Ready?", type: "main", index: 0 }]] },
    "Notifications Ready?": {
      main: [
        [{ node: "Notify Telegram", type: "main", index: 0 }],
        [{ node: spec.actionA[0], type: "main", index: 0 }],
      ],
    },
    "Notify Telegram": { main: [[{ node: "Notify Gmail", type: "main", index: 0 }]] },
    "Notify Gmail": { main: [[{ node: spec.actionA[0], type: "main", index: 0 }]] },
    [spec.actionA[0]]: { main: [[{ node: spec.actionB[0], type: "main", index: 0 }]] },
    [spec.actionB[0]]: { main: [[{ node: spec.verifyAction[0], type: "main", index: 0 }]] },
    [spec.verifyAction[0]]: { main: [[{ node: "Mark Record Responded", type: "main", index: 0 }]] },
    "Mark Record Responded": { main: [[{ node: "Write Audit Evidence", type: "main", index: 0 }]] },
    "Write Audit Evidence": { main: [[{ node: "Finalize Execution", type: "main", index: 0 }]] },
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

const buildMonitorWorkflow = (spec) => {
  resetIds();

  const normalizeCode = `const body = $json.body ?? $json;
const executionId = String(body.executionId || ('monitor-' + Date.now()));
return [{ json: { ...body, executionId, workflowId: 'live-attack-monitor', workflowName: 'Live Attack Monitor & Phone Alerts', mode: body.mode || 'scheduled', startedAt: body.startedAt || new Date().toISOString() } }];`;

  const buildMessageCode = `const attacks = Array.isArray($json.attacks) ? $json.attacks : [];
const lines = attacks.map(function (a) { return '• [' + a.severity + '] ' + a.title + ' — ' + (a.source_ip || 'unknown') + ' (' + (a.risk_score || 0) + '/100)'; });
const text = '🚨 MedicareGuard live attack monitor\\n' + attacks.length + ' new high-risk attack(s) detected in the last 24h.\\n\\n' + lines.join('\\n') + '\\n\\nConsole: http://localhost:3000/alerts';
const base = $('Normalize Monitor Trigger').first().json;
return [{ json: { ...base, count: attacks.length, attacks, summary: lines.join(' | '), text } }];`;

  const metricsCode = `const base = $('Normalize Monitor Trigger').first().json;
const built = $('Build Phone Message').first().json;
const count = Number(built.count || 0);
return [{ json: { workflowId: 'live-attack-monitor', status: 'success', durationMs: Math.max(1, Date.now() - new Date(base.startedAt).getTime()), nodeCount: 17, metrics: { attack_count: count, channels: ['telegram','gmail'], lookback_hours: 24 }, message: 'n8n live attack monitor found ' + count + ' new attack(s)' } }];`;

  const alertText = `$('Build Phone Message').first().json.text`;
  const nodes = [
    node("Webhook — " + spec.triggerLabel, "n8n-nodes-base.webhook", 2, { httpMethod: "POST", path: spec.webhookPath, responseMode: "onReceived", options: {} }, positions.monitorWebhook, { webhookId: id() }),
    node("Schedule — Every 5 Minutes", "n8n-nodes-base.scheduleTrigger", 1.2, { rule: { interval: [{ field: "minutes", minutesInterval: 5 }] } }, positions.monitorSchedule),
    code("Normalize Monitor Trigger", normalizeCode, positions.monitorNormalize),
    postgres("Load Recent Attacks", `SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) AS attacks, count(*)::int AS count
FROM (
  SELECT id, title, severity, source_ip, risk_score, detected_at
  FROM alerts
  WHERE severity IN ('critical','high')
    AND detected_at > now() - interval '24 hours'
    AND COALESCE(metadata->>'phoneNotifiedAt','') = ''
  ORDER BY detected_at DESC LIMIT 5
) t;`, positions.monitorLoad),
    code("Build Phone Message", buildMessageCode, positions.monitorBuild),
    ifNode("New Attacks?", `={{ $json.count }}`, 1, positions.monitorGate),
    postgres("Load Alert Recipients", "SELECT u.id, u.email, u.full_name FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name IN ('admin','analyst') ORDER BY r.level DESC LIMIT 1;", positions.monitorRecipients),
    ifNode("Notifications Ready?", "={{ Boolean($env.TELEGRAM_BOT_TOKEN && $env.MG_SMTP_USER) }}", true, positions.monitorNotifyGate),
    node("Notify Telegram", "n8n-nodes-base.httpRequest", 4.2, {
      method: "POST",
      url: "=https://api.telegram.org/bot{{ $env.TELEGRAM_BOT_TOKEN || '' }}/sendMessage",
      sendHeaders: true,
      headerParameters: { parameters: [{ name: "Content-Type", value: "application/json" }] },
      sendBody: true,
      contentType: "json",
      specifyBody: "json",
      jsonBody: `={{ JSON.stringify({ chat_id: ($env.TELEGRAM_CHAT_ID || ''), parse_mode: 'Markdown', disable_web_page_preview: true, text: ${alertText} }) }}`,
      options: { timeout: 15000 },
    }, positions.monitorTelegram, { onError: "continueRegularOutput" }),
    node("Notify Gmail", "n8n-nodes-base.emailSend", 2.1, {
      fromEmail: "={{ $env.MG_SMTP_FROM || 'alerts@medicareguard.io' }}",
      toEmail: "={{ $('Load Alert Recipients').first().json.email || $env.MG_ALERT_EMAIL || 'soc@medicareguard.io' }}",
      subject: "=🚨 MedicareGuard live attack monitor — {{ $('Build Phone Message').first().json.count }} new attack(s)",
      emailFormat: "text",
      text: `={{ ${alertText} }}`,
      options: {},
    }, positions.monitorGmail, { credentials: { smtp: { id: "mg-smtp-credential", name: "MedicareGuard SMTP" } }, onError: "continueRegularOutput" }),
    simulate("Notify In-App", "notify", positions.monitorInApp, `executionId: ${ref("Normalize Monitor Trigger", "executionId")}, title: 'Live attack monitor: ' + $('Build Phone Message').first().json.count + ' new attack(s)', message: $('Build Phone Message').first().json.summary, severity: 'critical', channel: 'phone'`),
    postgres("Mark Attacks Notified", `UPDATE alerts SET metadata = metadata || jsonb_build_object('phoneNotifiedAt', now()::text), updated_at = now()
WHERE severity IN ('critical','high')
  AND detected_at > now() - interval '24 hours'
  AND COALESCE(metadata->>'phoneNotifiedAt','') = ''
RETURNING id;`, positions.monitorUpdate),
    simulate("Write Audit Evidence", "evidence-write", positions.monitorAudit, `executionId: ${ref("Normalize Monitor Trigger", "executionId")}, workflowId: 'live-attack-monitor', report: 'Live Attack Monitor'`),
    code("Emit Monitor Metrics", metricsCode, positions.monitorMetrics),
    http("Finalize Execution", "POST", `={{ ($env.MG_API_URL || 'http://localhost:4000/api') + '/automation/executions/' + ${ref("Normalize Monitor Trigger", "executionId")} + '/complete' }}`, positions.monitorFinalize, jsonBody(`workflowId: 'live-attack-monitor', status: 'success', durationMs: $json.durationMs, nodeCount: 17, metrics: $json.metrics, message: $json.message`)),
    node("Close Run", "n8n-nodes-base.noOp", 1, {}, positions.monitorClose),
    node("No New Attacks", "n8n-nodes-base.noOp", 1, {}, positions.monitorNoAttacks),
  ];

  nodes.push(sticky("Sticky Note — Monitor", "## ① Monitor\nEvery 5 minutes, scan alerts from the last 24 hours that have not been sent to the on-call phone.", [0, -260], 280, 160, 1));
  nodes.push(sticky("Sticky Note — Build Digest", "## ② Build digest\nAggregate up to five high-risk attacks into a readable Telegram and Gmail message.", [300, -260], 280, 160, 2));
  nodes.push(sticky("Sticky Note — Phone alerts", "## ③ Phone alerts\nTelegram for instant mobile push; Gmail for the audit-friendly inbox copy.", [600, -260], 280, 160, 3));
  nodes.push(sticky("Sticky Note — Close", "## ④ Close\nMark alerts as notified, write evidence and finalize the SOC execution log.", [900, -260], 280, 160, 5));
  nodes.push(sticky("Sticky Note — Overview", "# Live Attack Monitor & Phone Alerts\n5-minute sweep · 17 nodes · Telegram + Gmail · no laptop required\n\n**Trigger:** webhook `mg-attack-monitor` + schedule `*/5 * * * *` · **Owner:** SOC Automation", [0, -520], 1300, 200, 4));

  const connections = {
    ["Webhook — " + spec.triggerLabel]: { main: [[{ node: "Normalize Monitor Trigger", type: "main", index: 0 }]] },
    "Schedule — Every 5 Minutes": { main: [[{ node: "Normalize Monitor Trigger", type: "main", index: 0 }]] },
    "Normalize Monitor Trigger": { main: [[{ node: "Load Recent Attacks", type: "main", index: 0 }]] },
    "Load Recent Attacks": { main: [[{ node: "Build Phone Message", type: "main", index: 0 }]] },
    "Build Phone Message": { main: [[{ node: "New Attacks?", type: "main", index: 0 }]] },
    "New Attacks?": {
      main: [
        [{ node: "Load Alert Recipients", type: "main", index: 0 }],
        [{ node: "No New Attacks", type: "main", index: 0 }],
      ],
    },
    "Load Alert Recipients": { main: [[{ node: "Notifications Ready?", type: "main", index: 0 }]] },
    "Notifications Ready?": {
      main: [
        [{ node: "Notify Telegram", type: "main", index: 0 }],
        [{ node: "Notify In-App", type: "main", index: 0 }],
      ],
    },
    "Notify Telegram": { main: [[{ node: "Notify Gmail", type: "main", index: 0 }]] },
    "Notify Gmail": { main: [[{ node: "Notify In-App", type: "main", index: 0 }]] },
    "Notify In-App": { main: [[{ node: "Mark Attacks Notified", type: "main", index: 0 }]] },
    "Mark Attacks Notified": { main: [[{ node: "Write Audit Evidence", type: "main", index: 0 }]] },
    "Write Audit Evidence": { main: [[{ node: "Emit Monitor Metrics", type: "main", index: 0 }]] },
    "Emit Monitor Metrics": { main: [[{ node: "Finalize Execution", type: "main", index: 0 }]] },
    "Finalize Execution": { main: [[{ node: "Close Run", type: "main", index: 0 }]] },
    "No New Attacks": { main: [[{ node: "Emit Monitor Metrics", type: "main", index: 0 }]] },
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
const totalExecutable = manifest.reduce((sum, item) => sum + item.executable, 0);
fs.writeFileSync(path.join(outputDir, "manifest.json"), JSON.stringify({ nodeCount: totalExecutable, workflows: manifest }, null, 2) + "\n");
