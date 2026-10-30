import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(__dirname, "../n8n/workflows");
const CREDENTIAL = { id: "mg-postgres-credential", name: "MedicareGuard PostgreSQL" };

const ref = (node, field) => `$('${node}').first().json.${field}`;
const sqlRef = (node, field) => `{{ ${ref(node, field)} }}`;

const L = {
  validate: "🔍 Kiểm tra dữ liệu",
  score: "🧮 Chấm điểm rủi ro",
  gate: "⚠️ Rủi ro cao?",
  tgGate: "📱 Telegram sẵn sàng?",
  tg: "📱 Gửi Telegram",
  gmailGate: "📧 Gmail sẵn sàng?",
  gmail: "📧 Gửi Gmail (SMTP)",
  mark: "📝 Cập nhật bản ghi",
  finalize: "🏁 Kết thúc phiên chạy",
};

const positions = {
  webhook: [0, 0],
  validate: [220, 0],
  load: [440, 0],
  enrich: [660, 0],
  score: [880, 0],
  gate: [1100, 0],
  criticalCase: [1320, -150],
  standardCase: [1320, 150],
  notifyGate: [1540, 0],
  telegram: [1760, -150],
  gmailGate: [1980, 0],
  gmail: [2200, -150],
  actionA: [2420, 0],
  actionB: [2640, 0],
  verify: [2860, 0],
  mark: [3080, 0],
  finalize: [3300, 0],
  monitorWebhook: [0, 0],
  monitorSchedule: [0, 180],
  monitorNormalize: [220, 90],
  monitorLoad: [440, 90],
  monitorBuild: [660, 90],
  monitorGate: [880, 90],
  monitorRecipients: [1100, -80],
  monitorNotifyGate: [1320, 90],
  monitorTelegram: [1540, -80],
  monitorGmailGate: [1760, 90],
  monitorGmail: [1980, -80],
  monitorInApp: [2200, 90],
  monitorUpdate: [2420, 90],
  monitorMetrics: [2640, 90],
  monitorFinalize: [2860, 90],
  monitorNoAttacks: [1320, 270],
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
    name: "Cô lập & Phục hồi Ransomware",
    triggerLabel: "Cảnh báo Ransomware",
    webhookPath: "mg-ransomware",
    loadName: "🗄️ Tải cảnh báo",
    entityType: "alert",
    recordName: "ransomware alert",
    stageSummary: "Cô lập EDR · Chặn C2 · Leo thang P1 · Bằng chứng pháp y",
    loadQuery: `SELECT al.id, al.title, al.severity, al.status, al.source, al.source_ip, al.risk_score, al.asset_id, al.metadata, al.detected_at,
  a.name AS asset_name, a.ip_address AS asset_ip, a.criticality AS asset_criticality, a.risk_score AS asset_risk_score,
  u.full_name AS asset_owner_name, u.email AS asset_owner_email
FROM alerts al LEFT JOIN assets a ON a.id = al.asset_id LEFT JOIN users u ON u.id = a.owner_id
WHERE al.id = '${sqlRef("🔍 Kiểm tra dữ liệu", "entityId")}' LIMIT 1;`,
    criticalCaseName: "🚨 Mở sự cố P1",
    criticalCaseQuery: `INSERT INTO incidents (title, description, severity, status, priority, category, detected_at, sla_due_at, incident_key, metadata)
VALUES ('Ransomware containment — automated P1', 'n8n isolated the endpoint, blocked command-and-control and preserved forensic evidence.',
'critical', 'open', 'P1', 'ransomware', now(), now() + interval '4 hours',
'AUTO-' || upper(substr(md5('${sqlRef("🔍 Kiểm tra dữ liệu", "executionId")}'), 1, 10)),
jsonb_build_object('automation', 'ransomware-containment', 'executionId', '${sqlRef("🔍 Kiểm tra dữ liệu", "executionId")}', 'entityId', '${sqlRef("🔍 Kiểm tra dữ liệu", "entityId")}'))
ON CONFLICT (incident_key) DO UPDATE SET updated_at = now() RETURNING id, incident_key;`,
    standardCaseName: "🎫 Mở ticket chuẩn",
    standardCaseQuery: `INSERT INTO tickets (subject, status, priority, description, metadata)
SELECT 'Automated ransomware review', 'open', 'high', 'Below-threshold ransomware signal routed for analyst review.',
jsonb_build_object('automation', 'ransomware-containment', 'executionId', '${sqlRef("🔍 Kiểm tra dữ liệu", "executionId")}')
WHERE NOT EXISTS (SELECT 1 FROM tickets WHERE metadata->>'executionId' = '${sqlRef("🔍 Kiểm tra dữ liệu", "executionId")}')
RETURNING id;`,
    enrichA: ["🧪 Làm giàu – Telemetry EDR", "edr-telemetry", `executionId: ${ref("🔍 Kiểm tra dữ liệu", "executionId")}, alertId: ${ref("🔍 Kiểm tra dữ liệu", "entityId")}`],
    enrichB: ["Enrich — Threat Reputation", "intel-reputation", `executionId: ${ref("🔍 Kiểm tra dữ liệu", "executionId")}, indicator: ${ref("🗄️ Tải cảnh báo", "source_ip")} || ${ref("🔍 Kiểm tra dữ liệu", "entityId")}`],
    enrichC: ["Enrich — Identity Context", "identity-context", `executionId: ${ref("🔍 Kiểm tra dữ liệu", "executionId")}, email: 'soc@medicareguard.io'`],
    notifyTitle: "Ransomware containment started",
    notifyMessage: "Automated containment is running for a critical ransomware alert.",
    actionA: ["🔒 Cô lập máy trạm (EDR)", "edr-isolate", `executionId: ${ref("🔍 Kiểm tra dữ liệu", "executionId")}, alertId: ${ref("🔍 Kiểm tra dữ liệu", "entityId")}, assetId: ${ref("🗄️ Tải cảnh báo", "asset_id")}`],
    actionB: ["🚫 Chặn máy chủ C2", "network-contain", `executionId: ${ref("🔍 Kiểm tra dữ liệu", "executionId")}, alertId: ${ref("🔍 Kiểm tra dữ liệu", "entityId")}, sourceIp: ${ref("🗄️ Tải cảnh báo", "source_ip")}`],
    verifyAction: ["✅ Xác minh cô lập", "edr-verify", `executionId: ${ref("🔍 Kiểm tra dữ liệu", "executionId")}, alertId: ${ref("🔍 Kiểm tra dữ liệu", "entityId")}, assetId: ${ref("🗄️ Tải cảnh báo", "asset_id")}`],
    markQuery: `UPDATE alerts SET status = 'investigating', metadata = metadata || jsonb_build_object('containedBy', 'n8n', 'containedAt', now()::text), updated_at = now()
WHERE id = '${sqlRef("🔍 Kiểm tra dữ liệu", "entityId")}' RETURNING id, status;`,
    reportType: "incident",
    reportName: "Báo cáo cô lập Ransomware",
    metricNote: "Cô lập EDR, chặn C2, sự cố P1 và gói bằng chứng pháp y",
  },
  {
    id: "phishing-triage",
    name: "Phân tích & Xử lý Phishing",
    triggerLabel: "Báo cáo Phishing",
    webhookPath: "mg-phishing",
    loadName: "🗄️ Tải cảnh báo",
    entityType: "alert",
    recordName: "phishing alert",
    stageSummary: "Detonate sandbox · Dọn hộp thư · Đặt lại mật khẩu · Phản hồi người báo cáo",
    loadQuery: `SELECT al.id, al.title, al.severity, al.status, al.source, al.source_ip, al.risk_score, al.asset_id, al.metadata, al.detected_at,
  a.name AS asset_name, a.ip_address AS asset_ip, a.criticality AS asset_criticality, a.risk_score AS asset_risk_score,
  u.full_name AS asset_owner_name, u.email AS asset_owner_email
FROM alerts al LEFT JOIN assets a ON a.id = al.asset_id LEFT JOIN users u ON u.id = a.owner_id
WHERE al.id = '${sqlRef("🔍 Kiểm tra dữ liệu", "entityId")}' LIMIT 1;`,
    criticalCaseName: "🚨 Mở sự cố P1",
    criticalCaseQuery: `INSERT INTO incidents (title, description, severity, status, priority, category, detected_at, sla_due_at, incident_key, metadata)
VALUES ('Phishing credential compromise — automated P1', 'n8n detonated the payload, purged matching mail and forced credential rotation.',
'critical', 'open', 'P1', 'phishing', now(), now() + interval '2 hours',
'AUTO-' || upper(substr(md5('${sqlRef("🔍 Kiểm tra dữ liệu", "executionId")}'), 1, 10)),
jsonb_build_object('automation', 'phishing-triage', 'executionId', '${sqlRef("🔍 Kiểm tra dữ liệu", "executionId")}', 'entityId', '${sqlRef("🔍 Kiểm tra dữ liệu", "entityId")}'))
ON CONFLICT (incident_key) DO UPDATE SET updated_at = now() RETURNING id, incident_key;`,
    standardCaseName: "🎫 Mở ticket chuẩn",
    standardCaseQuery: `INSERT INTO tickets (subject, status, priority, description, metadata)
SELECT 'Automated phishing triage', 'open', 'high', 'Reported message routed for analyst review after automated triage.',
jsonb_build_object('automation', 'phishing-triage', 'executionId', '${sqlRef("🔍 Kiểm tra dữ liệu", "executionId")}')
WHERE NOT EXISTS (SELECT 1 FROM tickets WHERE metadata->>'executionId' = '${sqlRef("🔍 Kiểm tra dữ liệu", "executionId")}')
RETURNING id;`,
    enrichA: ["🧪 Làm giàu – Sandbox", "sandbox-detonate", `executionId: ${ref("🔍 Kiểm tra dữ liệu", "executionId")}, url: ${ref("🗄️ Tải cảnh báo", "metadata")}?.url || ${ref("🗄️ Tải cảnh báo", "title")}`],
    enrichB: ["Enrich — Threat Reputation", "intel-reputation", `executionId: ${ref("🔍 Kiểm tra dữ liệu", "executionId")}, indicator: ${ref("🗄️ Tải cảnh báo", "metadata")}?.file_hash || ${ref("🔍 Kiểm tra dữ liệu", "entityId")}`],
    enrichC: ["Enrich — Recipient Identity", "identity-context", `executionId: ${ref("🔍 Kiểm tra dữ liệu", "executionId")}, email: ${ref("🗄️ Tải cảnh báo", "metadata")}?.recipient || 'analyst@medicareguard.io'`],
    notifyTitle: "Phishing triage started",
    notifyMessage: "Automated phishing triage is detonating the payload and resetting credentials.",
    actionA: ["🧹 Cách ly thư khớp", "email-quarantine", `executionId: ${ref("🔍 Kiểm tra dữ liệu", "executionId")}, alertId: ${ref("🔍 Kiểm tra dữ liệu", "entityId")}`],
    actionB: ["🔑 Thu hồi phiên & đặt lại mật khẩu", "identity-revoke", `executionId: ${ref("🔍 Kiểm tra dữ liệu", "executionId")}, email: ${ref("🗄️ Tải cảnh báo", "metadata")}?.recipient || 'analyst@medicareguard.io'`],
    verifyAction: ["✅ Xác minh thu hồi danh tính", "identity-verify", `executionId: ${ref("🔍 Kiểm tra dữ liệu", "executionId")}, email: ${ref("🗄️ Tải cảnh báo", "metadata")}?.recipient || 'analyst@medicareguard.io'`],
    markQuery: `UPDATE alerts SET status = 'investigating', metadata = metadata || jsonb_build_object('quarantinedBy', 'n8n', 'quarantinedAt', now()::text), updated_at = now()
WHERE id = '${sqlRef("🔍 Kiểm tra dữ liệu", "entityId")}' RETURNING id, status;`,
    reportType: "incident",
    reportName: "Báo cáo xử lý Phishing",
    metricNote: "Kết luận sandbox, dọn hộp thư, đặt lại mật khẩu và phản hồi người báo cáo",
  },
  {
    id: "vulnerability-sla",
    name: "Leo thang SLA Lỗ hổng",
    triggerLabel: "Lỗ hổng mới",
    webhookPath: "mg-vulnerability",
    schedule: { cron: "0 */6 * * *", label: "⏰ Lịch mỗi 6 giờ", pickName: "🔎 Chọn lỗ hổng ưu tiên", pickQuery: "SELECT id FROM vulnerabilities WHERE status = 'open' ORDER BY cvss_score DESC NULLS LAST LIMIT 1;" },
    loadName: "🗄️ Tải lỗ hổng",
    entityType: "vulnerability",
    recordName: "vulnerability",
    stageSummary: "Chấm EPSS/KEV · Định tuyến chủ sở hữu · Điều phối vá · Bằng chứng SLA",
    loadQuery: `SELECT v.id, v.title, v.severity, v.status, v.cvss_score, v.cve_id, v.asset_id, v.description, v.metadata,
  a.name AS asset_name, a.ip_address AS asset_ip, a.criticality AS asset_criticality, a.risk_score AS asset_risk_score,
  u.full_name AS asset_owner_name, u.email AS asset_owner_email
FROM vulnerabilities v LEFT JOIN assets a ON a.id = v.asset_id LEFT JOIN users u ON u.id = a.owner_id
WHERE v.id = '${sqlRef("🔍 Kiểm tra dữ liệu", "entityId")}' LIMIT 1;`,
    criticalCaseName: "🚨 Mở sự cố vá lỗi",
    criticalCaseQuery: `INSERT INTO incidents (title, description, severity, status, priority, category, detected_at, sla_due_at, incident_key, metadata)
VALUES ('Critical vulnerability SLA breach — automated escalation', 'n8n correlated EPSS, KEV and asset criticality and opened a remediation incident.',
'critical', 'open', 'P1', 'vulnerability', now(), now() + interval '24 hours',
'AUTO-' || upper(substr(md5('${sqlRef("🔍 Kiểm tra dữ liệu", "executionId")}'), 1, 10)),
jsonb_build_object('automation', 'vulnerability-sla', 'executionId', '${sqlRef("🔍 Kiểm tra dữ liệu", "executionId")}', 'entityId', '${sqlRef("🔍 Kiểm tra dữ liệu", "entityId")}'))
ON CONFLICT (incident_key) DO UPDATE SET updated_at = now() RETURNING id, incident_key;`,
    standardCaseName: "🎫 Mở ticket vá lỗi",
    standardCaseQuery: `INSERT INTO tickets (subject, status, priority, description, metadata)
SELECT 'Automated vulnerability remediation', 'open', 'medium', 'Finding routed to the asset owner for scheduled remediation.',
jsonb_build_object('automation', 'vulnerability-sla', 'executionId', '${sqlRef("🔍 Kiểm tra dữ liệu", "executionId")}')
WHERE NOT EXISTS (SELECT 1 FROM tickets WHERE metadata->>'executionId' = '${sqlRef("🔍 Kiểm tra dữ liệu", "executionId")}')
RETURNING id;`,
    enrichA: ["📊 Làm giàu – EPSS/KEV", "vuln-intel", `executionId: ${ref("🔍 Kiểm tra dữ liệu", "executionId")}, vulnerabilityId: ${ref("🔍 Kiểm tra dữ liệu", "entityId")}`],
    enrichB: ["Enrich — Threat Reputation", "intel-reputation", `executionId: ${ref("🔍 Kiểm tra dữ liệu", "executionId")}, indicator: ${ref("🗄️ Tải lỗ hổng", "cve_id")}`],
    enrichC: ["Enrich — Patch Catalog", "patch-catalog", `executionId: ${ref("🔍 Kiểm tra dữ liệu", "executionId")}, cveId: ${ref("🗄️ Tải lỗ hổng", "cve_id")}`],
    notifyTitle: "Vulnerability SLA escalation",
    notifyMessage: "A critical CVE is being remediated by the automated SLA workflow.",
    actionA: ["📋 Tạo yêu cầu thay đổi", "change-request", `executionId: ${ref("🔍 Kiểm tra dữ liệu", "executionId")}, vulnerabilityId: ${ref("🔍 Kiểm tra dữ liệu", "entityId")}, assetId: ${ref("🗄️ Tải lỗ hổng", "asset_id")}`],
    actionB: ["🛠️ Điều phối vá lỗi", "patch-orchestrate", `executionId: ${ref("🔍 Kiểm tra dữ liệu", "executionId")}, assetId: ${ref("🗄️ Tải lỗ hổng", "asset_id")}, cveId: ${ref("🗄️ Tải lỗ hổng", "cve_id")}`],
    verifyAction: ["✅ Xác minh bản vá", "patch-verify", `executionId: ${ref("🔍 Kiểm tra dữ liệu", "executionId")}, assetId: ${ref("🗄️ Tải lỗ hổng", "asset_id")}`],
    markQuery: `UPDATE vulnerabilities SET status = 'in_progress', metadata = metadata || jsonb_build_object('remediationStartedBy', 'n8n', 'remediationStartedAt', now()::text), updated_at = now()
WHERE id = '${sqlRef("🔍 Kiểm tra dữ liệu", "entityId")}' RETURNING id, status;`,
    reportType: "vulnerability",
    reportName: "Báo cáo SLA lỗ hổng",
    metricNote: "Chấm EPSS/KEV, phê duyệt thay đổi, triển khai bản vá và bằng chứng SLA",
  },
  {
    id: "compliance-evidence",
    name: "Bằng chứng Tuân thủ Liên tục",
    triggerLabel: "Yêu cầu bằng chứng",
    webhookPath: "mg-compliance",
    schedule: { cron: "0 2 * * *", label: "⏰ Lịch hằng đêm 02:00", pickName: "🔎 Chọn kiểm soát ưu tiên", pickQuery: "SELECT id FROM compliance_controls ORDER BY score ASC NULLS LAST LIMIT 1;" },
    loadName: "🗄️ Tải kiểm soát",
    entityType: "compliance_control",
    recordName: "compliance control",
    stageSummary: "Bằng chứng danh tính/thiết bị/audit · Gói bất biến · Báo cáo kiểm toán",
    loadQuery: `SELECT c.id, c.framework, c.control_id, c.title, c.status, c.score, c.owner_id, c.description, c.metadata,
  u.full_name AS asset_owner_name, u.email AS asset_owner_email
FROM compliance_controls c LEFT JOIN users u ON u.id = c.owner_id
WHERE c.id = '${sqlRef("🔍 Kiểm tra dữ liệu", "entityId")}' LIMIT 1;`,
    criticalCaseName: "🚨 Mở sự cố thiếu kiểm soát",
    criticalCaseQuery: `INSERT INTO incidents (title, description, severity, status, priority, category, detected_at, sla_due_at, incident_key, metadata)
VALUES ('Compliance control gap — automated escalation', 'n8n detected a control gap while assembling immutable evidence.',
'high', 'open', 'P2', 'compliance', now(), now() + interval '72 hours',
'AUTO-' || upper(substr(md5('${sqlRef("🔍 Kiểm tra dữ liệu", "executionId")}'), 1, 10)),
jsonb_build_object('automation', 'compliance-evidence', 'executionId', '${sqlRef("🔍 Kiểm tra dữ liệu", "executionId")}', 'entityId', '${sqlRef("🔍 Kiểm tra dữ liệu", "entityId")}'))
ON CONFLICT (incident_key) DO UPDATE SET updated_at = now() RETURNING id, incident_key;`,
    standardCaseName: "🎫 Mở nhiệm vụ bằng chứng",
    standardCaseQuery: `INSERT INTO tickets (subject, status, priority, description, metadata)
SELECT 'Automated compliance evidence refresh', 'open', 'medium', 'Evidence pack assembled for the selected control and framework.',
jsonb_build_object('automation', 'compliance-evidence', 'executionId', '${sqlRef("🔍 Kiểm tra dữ liệu", "executionId")}')
WHERE NOT EXISTS (SELECT 1 FROM tickets WHERE metadata->>'executionId' = '${sqlRef("🔍 Kiểm tra dữ liệu", "executionId")}')
RETURNING id;`,
    enrichA: ["🗂️ Làm giàu – Bằng chứng danh tính", "evidence-identity", `executionId: ${ref("🔍 Kiểm tra dữ liệu", "executionId")}, controlId: ${ref("🔍 Kiểm tra dữ liệu", "entityId")}`],
    enrichB: ["Enrich — Endpoint Evidence", "evidence-endpoint", `executionId: ${ref("🔍 Kiểm tra dữ liệu", "executionId")}, controlId: ${ref("🔍 Kiểm tra dữ liệu", "entityId")}`],
    enrichC: ["Enrich — Audit Evidence", "evidence-audit", `executionId: ${ref("🔍 Kiểm tra dữ liệu", "executionId")}, controlId: ${ref("🔍 Kiểm tra dữ liệu", "entityId")}`],
    notifyTitle: "Compliance evidence collection",
    notifyMessage: "Automated evidence collection is running for a compliance control.",
    actionA: ["📦 Đóng gói bằng chứng", "evidence-pack", `executionId: ${ref("🔍 Kiểm tra dữ liệu", "executionId")}, controlId: ${ref("🔍 Kiểm tra dữ liệu", "entityId")}`],
    actionB: ["🔐 Lưu trữ bất biến", "evidence-persist", `executionId: ${ref("🔍 Kiểm tra dữ liệu", "executionId")}, controlId: ${ref("🔍 Kiểm tra dữ liệu", "entityId")}`],
    verifyAction: ["✅ Xác minh toàn vẹn", "evidence-verify", `executionId: ${ref("🔍 Kiểm tra dữ liệu", "executionId")}, controlId: ${ref("🔍 Kiểm tra dữ liệu", "entityId")}`],
    markQuery: `UPDATE compliance_controls SET metadata = metadata || jsonb_build_object('lastEvidenceAt', now()::text, 'evidenceBy', 'n8n'), updated_at = now()
WHERE id = '${sqlRef("🔍 Kiểm tra dữ liệu", "entityId")}' RETURNING id, status;`,
    reportType: "compliance",
    reportName: "Báo cáo bằng chứng tuân thủ",
    metricNote: "Bằng chứng danh tính, thiết bị và audit với checksum bất biến",
  },
  {
    id: "ecommerce-fraud-response",
    name: "Phản hồi Gian lận Thương mại điện tử",
    triggerLabel: "Cảnh báo gian lận đơn hàng",
    webhookPath: "mg-ecommerce-fraud",
    entityType: "store_order",
    stageSummary: "Xác minh IP/quốc gia · Chấm điểm rủi ro · Tạm giữ đơn · Cảnh báo SOC · Telegram + Gmail",
  },
  {
    id: "live-attack-monitor",
    name: "Giám sát Tấn công Trực tiếp & Cảnh báo Điện thoại",
    triggerLabel: "Nhịp giám sát",
    webhookPath: "mg-attack-monitor",
    entityType: "alert",
    stageSummary: "Quét tấn công mỗi 5 phút · Telegram + Gmail · Hiển thị cho trực ban",
  },
  {
    id: "ai-chat-analyst",
    name: "Chat AI phân tích SOC",
    triggerLabel: "Câu hỏi Chat AI",
    webhookPath: "mg-ai-chat",
    stageSummary: "Webhook · truy vấn PostgreSQL trực tiếp · trả lời theo dữ liệu thật",
  },
];

const telegramNode = (spec, position) => node(
  "📱 Gửi Telegram",
  "n8n-nodes-base.telegram",
  1.2,
  {
    resource: "message",
    operation: "sendMessage",
    chatId: "={{ $env.TELEGRAM_CHAT_ID || '' }}",
    text: "={{ $('🧮 Chấm điểm rủi ro').first().json.telegramText }}",
    additionalFields: { parse_mode: "HTML", disable_web_page_preview: true, appendAttribution: false },
  },
  position,
  {
    credentials: { telegramApi: { id: "mg-telegram-credential", name: "MedicareGuard Telegram" } },
    onError: "continueRegularOutput",
  },
);

const gmailNode = (spec, position) => node(
  "📧 Gửi Gmail (SMTP)",
  "n8n-nodes-base.emailSend",
  2.1,
  {
    fromEmail: "={{ $env.MG_SMTP_FROM || $env.MG_SMTP_USER || 'alerts@medicareguard.io' }}",
    toEmail: "={{ $env.MG_ALERT_EMAIL || 'soc@medicareguard.io' }}",
    subject: "=🚨 [{{ $('🧮 Chấm điểm rủi ro').first().json.severity }}] {{ $('🧮 Chấm điểm rủi ro').first().json.workflowName }}",
    emailFormat: "html",
    html: "={{ $('🧮 Chấm điểm rủi ro').first().json.emailHtml }}",
    text: "={{ $('🧮 Chấm điểm rủi ro').first().json.emailText }}",
    options: {},
  },
  position,
  { credentials: { smtp: { id: "mg-smtp-credential", name: "MedicareGuard SMTP" } }, onError: "continueRegularOutput" },
);

const buildAiChatWorkflow = (spec) => {
  resetIds();

  const validateCode = `const body = $json.body ?? $json;
const message = String(body.message || body.chatInput || '').trim();
if (!message) { throw new Error('message is required'); }
return [{ json: { message, conversationId: body.conversationId || null, executionId: String(body.executionId || ('ai-' + Date.now())), startedAt: new Date().toISOString() } }];`;

  const contextQuery = `SELECT json_build_object(
  'overview', (SELECT json_build_object(
    'total_alerts', (SELECT count(*)::int FROM alerts),
    'open_alerts', (SELECT count(*)::int FROM alerts WHERE status IN ('open','investigating')),
    'critical_alerts', (SELECT count(*)::int FROM alerts WHERE severity = 'critical' AND status NOT IN ('resolved','false_positive')),
    'active_threats', (SELECT count(*)::int FROM threats WHERE status = 'active'),
    'open_incidents', (SELECT count(*)::int FROM incidents WHERE status NOT IN ('resolved','closed')),
    'total_assets', (SELECT count(*)::int FROM assets),
    'high_risk_assets', (SELECT count(*)::int FROM assets WHERE risk_score >= 70),
    'open_vulnerabilities', (SELECT count(*)::int FROM vulnerabilities WHERE status = 'open'),
    'enabled_rules', (SELECT count(*)::int FROM firewall_rules WHERE enabled),
    'avg_asset_risk', (SELECT COALESCE(round(avg(risk_score))::int, 0) FROM assets),
    'compliance_score', (SELECT COALESCE(round(avg(score))::int, 0) FROM compliance_controls),
    'alerts_24h', (SELECT count(*)::int FROM alerts WHERE detected_at > now() - interval '24 hours')
  )),
  'alerts', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (SELECT id, title, severity, status, source_ip, country, detected_at FROM alerts ORDER BY detected_at DESC LIMIT 6) t),
  'incidents', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (SELECT id, incident_key, title, severity, status, priority, detected_at FROM incidents WHERE status NOT IN ('resolved','closed') ORDER BY detected_at DESC LIMIT 6) t),
  'attackers', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (SELECT * FROM v_top_attackers LIMIT 5) t),
  'countries', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (SELECT * FROM v_attacks_by_country LIMIT 6) t),
  'assets', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (SELECT id, name, type, criticality, risk_score, ip_address FROM assets ORDER BY risk_score DESC LIMIT 6) t),
  'compliance', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (SELECT framework, round(avg(score))::int AS score FROM compliance_controls GROUP BY framework ORDER BY score DESC) t),
  'firewall', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (SELECT action, count(*)::int AS total, COALESCE(sum(hit_count), 0)::bigint AS hits FROM firewall_rules GROUP BY action) t),
  'storeOrders', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (SELECT id, order_number, shipping_name, total, status, payment_status, risk_score, fraud_flags, ip_address, ip_country, created_at FROM store_orders ORDER BY risk_score DESC, created_at DESC LIMIT 8) t),
  'storeFraudEvents', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (SELECT id, event_type, severity, ip_address, country, risk_score, created_at FROM store_security_events ORDER BY created_at DESC LIMIT 8) t)
) AS context;`;

  const composeCode = `const base = $('🔍 Kiểm tra câu hỏi').first().json;
const raw = $json.context ?? $json;
const ctx = typeof raw === 'string' ? JSON.parse(raw) : raw;
const o = ctx.overview || {};
const message = String(base.message || '');
const lower = message.toLowerCase();
const vi = /[àáâãèéêìíòóôõùúýăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(message);
const has = (re) => re.test(lower);
const intent = has(/(cảnh báo|alert|detection|phát hiện)/) ? 'alerts'
  : has(/(sự cố|incident|sla|mttr)/) ? 'incidents'
  : has(/(attacker|kẻ tấn công|source ip|top ip|ip nào|tấn công từ)/) ? 'attackers'
  : has(/(country|quốc gia|vùng|lãnh thổ|địa lý|geo)/) ? 'countries'
  : has(/(asset|tài sản|thiết bị|hạ tầng|server|máy chủ)/) ? 'assets'
  : has(/(compliance|tuân thủ|nist|iso|hipaa|pci)/) ? 'compliance'
  : has(/(firewall|tường lửa|chặn|block|rule)/) ? 'firewall'
  : has(/(store|cửa hàng|đơn hàng|order|gian lận|fraud|checkout)/) ? 'store'
  : 'overview';
let reply = '';
if (intent === 'alerts') {
  const lines = (ctx.alerts || []).map((a, i) => (i + 1) + '. [' + String(a.severity || '').toUpperCase() + '] ' + a.title + ' — ' + (a.source_ip || 'không rõ') + ' (' + a.status + ')').join('\\n');
  reply = '**Phân tích cảnh báo** — Tổng ' + o.total_alerts + ' cảnh báo, ' + o.open_alerts + ' đang mở, **' + o.critical_alerts + ' nghiêm trọng** và ' + o.alerts_24h + ' cảnh báo trong 24 giờ qua.\\n\\n' + (lines || 'Không có cảnh báo nào.');
} else if (intent === 'incidents') {
  const lines = (ctx.incidents || []).map((i) => '• ' + i.incident_key + ' — ' + i.title + ' · ' + i.severity + '/' + i.priority + ' · ' + i.status).join('\\n');
  reply = '**Sự cố đang mở: ' + o.open_incidents + '**\\n\\n' + (lines || 'Không có sự cố nào đang mở.') + '\\n\\nKhuyến nghị: áp dụng containment trong 4 giờ đầu đối với P1 và xác minh root cause trước khi đóng sự cố.';
} else if (intent === 'attackers') {
  const lines = (ctx.attackers || []).map((a, i) => (i + 1) + '. \`' + a.source_ip + '\` — ' + (a.country || 'Unknown') + ' · ' + a.events + ' sự kiện · rủi ro ' + a.avg_risk).join('\\n');
  reply = '**Top kẻ tấn công theo số sự kiện**\\n\\n' + (lines || 'Chưa có dữ liệu kẻ tấn công.') + '\\n\\nNên chặn các IP có rủi ro ≥ 80 tại tường lửa và theo dõi chặt các IP còn lại.';
} else if (intent === 'countries') {
  const lines = (ctx.countries || []).map((c) => '• ' + c.country + ' (' + c.country_code + ') — ' + c.attacks + ' sự kiện, rủi ro TB ' + c.avg_risk).join('\\n');
  reply = '**Phân bố tấn công theo quốc gia**\\n\\n' + (lines || 'Chưa có dữ liệu địa lý.');
} else if (intent === 'assets') {
  const lines = (ctx.assets || []).map((a) => '• ' + a.name + ' (' + a.type + ') — ' + a.criticality + ', rủi ro ' + a.risk_score + ', IP ' + (a.ip_address || 'n/a')).join('\\n');
  reply = '**Tài sản rủi ro cao** — ' + o.total_assets + ' tài sản, ' + o.high_risk_assets + ' có rủi ro ≥ 70, rủi ro trung bình ' + o.avg_asset_risk + '/100.\\n\\n' + (lines || 'Chưa có dữ liệu tài sản.');
} else if (intent === 'compliance') {
  const lines = (ctx.compliance || []).map((c) => '• ' + c.framework + ': ' + c.score + '%').join('\\n');
  reply = '**Tư thế tuân thủ** — điểm trung bình **' + o.compliance_score + '%**.\\n\\n' + (lines || 'Chưa có dữ liệu tuân thủ.');
} else if (intent === 'firewall') {
  const lines = (ctx.firewall || []).map((f) => '• hành động=' + f.action + ': ' + f.total + ' quy tắc, ' + f.hits + ' lượt khớp').join('\\n');
  reply = '**Tường lửa** — ' + o.enabled_rules + ' quy tắc đang bật.\\n\\n' + (lines || 'Chưa có dữ liệu tường lửa.');
} else if (intent === 'store') {
  const orderLines = (ctx.storeOrders || []).map((o, i) => (i + 1) + '. ' + o.order_number + ' — ' + o.shipping_name + ' · ' + Number(o.total || 0).toLocaleString('vi-VN') + ' ₫ · rủi ro ' + o.risk_score + '/100 · ' + o.status + ((o.fraud_flags && o.fraud_flags.length) ? ' · ' + o.fraud_flags.join(', ') : '')).join('\\n');
  const eventLines = (ctx.storeFraudEvents || []).map((e) => '• ' + e.event_type + ' — ' + e.ip_address + ' (' + e.country + ') · ' + e.risk_score + '/100').join('\\n');
  reply = '**Đơn hàng & gian lận Store** — ' + (ctx.storeOrders || []).length + ' đơn rủi ro cao nhất, ' + (ctx.storeFraudEvents || []).length + ' sự kiện gian lận gần đây.\\n\\n' + (orderLines || 'Chưa có đơn hàng rủi ro.') + '\\n\\nSự kiện gần đây:\\n' + (eventLines || 'Chưa có security event.');
} else {
  reply = '**Tổng quan SOC (dữ liệu PostgreSQL trực tiếp)** — ' + o.total_alerts + ' cảnh báo (' + o.open_alerts + ' mở, ' + o.critical_alerts + ' nghiêm trọng), ' + o.active_threats + ' mối đe dọa hoạt động, ' + o.open_incidents + ' sự cố mở, ' + o.total_assets + ' tài sản, rủi ro TB ' + o.avg_asset_risk + '/100, tuân thủ ' + o.compliance_score + '%.\\n\\nĐiểm nóng: ' + ((ctx.countries && ctx.countries[0]) ? ctx.countries[0].country + ' (' + ctx.countries[0].attacks + ' sự kiện)' : 'chưa xác định') + '. Kẻ tấn công nổi bật: ' + ((ctx.attackers && ctx.attackers[0]) ? ctx.attackers[0].source_ip : 'n/a') + '.';
}
const insights = [
  { label: 'Cảnh báo mở', value: o.open_alerts, tone: 'warning' },
  { label: 'Nghiêm trọng', value: o.critical_alerts, tone: 'critical' },
  { label: 'Sự cố mở', value: o.open_incidents, tone: 'warning' },
  { label: 'Tuân thủ', value: o.compliance_score + '%', tone: 'success' },
];
const suggestions = vi
  ? ['Top 5 kẻ tấn công', 'Tài sản rủi ro cao nhất', 'Có sự cố nào quá SLA không?']
  : ['Top 5 attackers', 'Highest-risk assets', 'Are any incidents past SLA?'];
const references = [];
(ctx.alerts || []).slice(0, 3).forEach((a) => references.push({ type: 'alert', id: a.id, label: a.title }));
(ctx.incidents || []).slice(0, 2).forEach((i) => references.push({ type: 'incident', id: i.id, label: i.incident_key }));
return [{ json: { reply, intent, language: vi ? 'vi' : 'en', insights, suggestions, references, model: 'n8n-medicareguard-analyst', provider: 'n8n', latencyMs: Math.max(1, Date.now() - new Date(base.startedAt).getTime()) } }];`;

  const nodes = [
    node('💬 Webhook Chat AI', 'n8n-nodes-base.webhook', 2, { httpMethod: 'POST', path: spec.webhookPath, responseMode: 'responseNode', options: {} }, [0, 0], { webhookId: id() }),
    code('🔍 Kiểm tra câu hỏi', validateCode, [220, 0]),
    postgres('🗄️ Tải ngữ cảnh SOC', contextQuery, [440, 0]),
    code('🧠 Soạn câu trả lời từ Database', composeCode, [660, 0]),
    node('📤 Trả lời Chat', 'n8n-nodes-base.respondToWebhook', 1.1, { respondWith: 'json', responseBody: '={{ JSON.stringify($json) }}', options: {} }, [880, 0]),
    sticky('Ghi chú — Chat AI dữ liệu thật', '# Chat AI phân tích SOC\nWebhook `mg-ai-chat` · đọc trực tiếp PostgreSQL (alerts, incidents, attackers, assets, compliance, firewall) · trả lời JSON cho backend.\n\nKhông dùng câu trả lời mẫu: mọi số liệu lấy từ truy vấn SQL tại thời điểm hỏi.', [0, -240], 1000, 160, 4),
  ];

  const connections = {
    '💬 Webhook Chat AI': { main: [[{ node: '🔍 Kiểm tra câu hỏi', type: 'main', index: 0 }]] },
    '🔍 Kiểm tra câu hỏi': { main: [[{ node: '🗄️ Tải ngữ cảnh SOC', type: 'main', index: 0 }]] },
    '🗄️ Tải ngữ cảnh SOC': { main: [[{ node: '🧠 Soạn câu trả lời từ Database', type: 'main', index: 0 }]] },
    '🧠 Soạn câu trả lời từ Database': { main: [[{ node: '📤 Trả lời Chat', type: 'main', index: 0 }]] },
  };

  return {
    id: spec.id,
    name: spec.name,
    active: false,
    nodes,
    connections,
    settings: { executionOrder: 'v1', saveExecutionProgress: true, saveManualExecutions: true, timezone: 'Asia/Ho_Chi_Minh' },
    staticData: null,
    pinData: {},
    meta: { templateCredsSetupCompleted: true, workflowDescription: spec.stageSummary },
    tags: [{ name: 'MedicareGuard' }, { name: spec.id }],
  };
};

const buildWorkflow = (spec) => {
  resetIds();
  if (spec.id === "ai-chat-analyst") return buildAiChatWorkflow(spec);
  if (spec.id === "live-attack-monitor") return buildMonitorWorkflow(spec);
  if (spec.id === "ecommerce-fraud-response") return buildEcommerceWorkflow(spec);

  const validateCode = `const body = $json.body ?? $json;
const raw = body.entityId || body.alertId || body.findingId || body.vulnerabilityId || body.controlId || body.framework || body.id;
const entityId = String(raw || '').trim();
if (!entityId) { throw new Error('entityId is required'); }
const executionId = String(body.executionId || ('ext-' + Date.now()));
return [{ json: { ...body, entityId, executionId, workflowId: '${spec.id}', workflowName: '${spec.name}', entityType: '${spec.entityType}', mode: body.mode || 'manual', triggeredBy: body.triggeredBy || 'n8n-webhook', receivedAt: body.startedAt || new Date().toISOString() } }];`;

  const scoreCode = `const read = (name) => { try { return $(name).first().json || {}; } catch (error) { return {}; } };
const base = read('${L.validate}');
const record = read('${spec.loadName}');
const asset = { name: record.asset_name, criticality: record.asset_criticality, risk_score: record.asset_risk_score, owner_name: record.asset_owner_name, owner_email: record.asset_owner_email };
const primary = read('${spec.enrichA[0]}');
const severity = String(record.severity || (record.status === 'compliant' ? 'low' : record.status) || 'medium').toLowerCase();
const severityWeight = { critical: 55, high: 38, medium: 20, low: 8 }[severity] || 15;
const criticalityWeight = { critical: 22, high: 15, medium: 8, low: 3 }[String(asset.criticality || '').toLowerCase()] || 5;
const cvss = Number(record.cvss_score || 0);
const vulnWeight = cvss ? Math.round(cvss * 3) : 0;
let riskScore = severityWeight + criticalityWeight + vulnWeight;
if (record.score !== undefined && record.cvss_score === undefined) riskScore = 100 - Number(record.score);
riskScore = Math.max(1, Math.min(100, riskScore || 50));
const esc = (value) => String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const sevLabel = { critical: '🔴 NGHIÊM TRỌNG', high: '🟠 CAO', medium: '🟡 TRUNG BÌNH', low: '🟢 THẤP' }[severity] || severity;
const sevColor = { critical: '#dc2626', high: '#ea580c', medium: '#ca8a04', low: '#16a34a' }[severity] || '#64748b';
const consoleUrl = (typeof $env !== 'undefined' && $env.MG_CONSOLE_URL) ? $env.MG_CONSOLE_URL : 'http://localhost:3000';
const detailPath = '${spec.entityType}' === 'vulnerability' ? '/vulnerabilities/' : '${spec.entityType}' === 'compliance_control' ? '/reports' : '/alerts/';
const consoleLink = '${spec.entityType}' === 'compliance_control' ? consoleUrl + '/reports' : consoleUrl + detailPath + base.entityId;
const recordTitle = record.title || record.control_name || record.name || '${spec.name}';
const recordDescription = record.description || record.summary || 'Hệ thống tự động phát hiện sự kiện an ninh cần được xử lý.';
const sourceIp = record.source_ip || record.source || record.ip_address || 'Không xác định';
const telegramText = [
  '🚨 <b>CẢNH BÁO AN NINH MEDICAREGUARD</b>',
  '━━━━━━━━━━━━━━━━━━━━',
  '<b>Luồng</b>  ' + esc('${spec.name}'),
  '<b>Mức độ</b>  ' + sevLabel,
  '<b>Điểm rủi ro</b>  <b>' + riskScore + '/100</b>',
  '<b>Đối tượng</b>  <code>' + esc(base.entityId) + '</code>',
  '<b>Nguồn</b>  ' + esc(sourceIp),
  '<b>Thời gian</b>  ' + esc(new Date().toLocaleString('vi-VN')),
  '━━━━━━━━━━━━━━━━━━━━',
  '🔗 <a href="' + esc(consoleLink) + '">Mở bảng điều khiển SOC</a>',
].join('\\n');
const emailHtml = '<div style="background:#f1f5f9;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#0f172a">'
  + '<div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden">'
  + '<div style="background:#0b1220;padding:22px 24px;color:#ffffff">'
  + '<div style="font-size:11px;letter-spacing:2px;color:#93c5fd;font-weight:700">MEDICAREGUARD · SOC</div>'
  + '<div style="font-size:22px;font-weight:700;margin-top:6px">Cảnh báo an ninh mới</div>'
  + '</div>'
  + '<div style="padding:24px">'
  + '<div style="display:inline-block;background:' + sevColor + ';color:#ffffff;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:700">' + esc(sevLabel) + '</div>'
  + '<h2 style="font-size:18px;margin:16px 0 8px">' + esc(recordTitle) + '</h2>'
  + '<p style="color:#475569;line-height:1.6;margin:0 0 18px">' + esc(recordDescription) + '</p>'
  + '<table style="width:100%;border-collapse:collapse;font-size:14px">'
  + '<tr><td style="padding:8px 0;color:#64748b">Luồng</td><td style="padding:8px 0;text-align:right;font-weight:600">' + esc('${spec.name}') + '</td></tr>'
  + '<tr><td style="padding:8px 0;color:#64748b">Điểm rủi ro</td><td style="padding:8px 0;text-align:right;font-weight:600">' + riskScore + '/100</td></tr>'
  + '<tr><td style="padding:8px 0;color:#64748b">Đối tượng</td><td style="padding:8px 0;text-align:right;font-weight:600">' + esc(base.entityId) + '</td></tr>'
  + '<tr><td style="padding:8px 0;color:#64748b">Tài sản</td><td style="padding:8px 0;text-align:right;font-weight:600">' + esc(asset.name || 'Không xác định') + '</td></tr>'
  + '<tr><td style="padding:8px 0;color:#64748b">Nguồn</td><td style="padding:8px 0;text-align:right;font-weight:600">' + esc(sourceIp) + '</td></tr>'
  + '<tr><td style="padding:8px 0;color:#64748b">Thời gian</td><td style="padding:8px 0;text-align:right;font-weight:600">' + esc(new Date().toLocaleString('vi-VN')) + '</td></tr>'
  + '</table>'
  + '<a href="' + esc(consoleLink) + '" style="display:inline-block;margin-top:22px;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">Mở bảng điều khiển SOC</a>'
  + '</div>'
  + '<div style="padding:14px 24px;background:#f8fafc;color:#94a3b8;font-size:11px">Tự động gửi bởi MedicareGuard SOAR · ' + esc(new Date().toLocaleString('vi-VN')) + '</div>'
  + '</div></div>';
const emailText = telegramText.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
return [{ json: { ...base, record, asset, primary, riskScore, severity: severity || 'medium', workflowName: '${spec.name}', entityId: base.entityId, entityType: '${spec.entityType}', correlationId: base.executionId.slice(0, 8), consoleLink, telegramText, emailHtml, emailText } }];`;

  const nodeCount = 17 + (spec.schedule ? 2 : 0);
  const finalizeFields = `workflowId: '${spec.id}', status: 'success', durationMs: Math.max(1, Date.now() - new Date($('${L.validate}').first().json.receivedAt).getTime()), nodeCount: ${nodeCount}, metrics: { risk_score: $('${L.score}').first().json.riskScore, verified: true, stages_completed: 4, email_alert: Boolean($env.MG_SMTP_HOST && $env.MG_SMTP_USER && $env.MG_SMTP_PASSWORD), telegram_alert: Boolean($env.TELEGRAM_BOT_TOKEN && $env.TELEGRAM_CHAT_ID) }, message: 'n8n đã hoàn tất ${spec.name} cho execution ' + $('${L.validate}').first().json.executionId`;

  const nodes = [
    node("📥 " + spec.triggerLabel, "n8n-nodes-base.webhook", 2, { httpMethod: "POST", path: spec.webhookPath, responseMode: "onReceived", options: {} }, positions.webhook, { webhookId: id() }),
    code(L.validate, validateCode, positions.validate),
    postgres(spec.loadName, spec.loadQuery, positions.load),
    simulate(spec.enrichA[0], spec.enrichA[1], positions.enrich, spec.enrichA[2]),
    code(L.score, scoreCode, positions.score),
    ifNode(L.gate, `={{ $json.riskScore }}`, 70, positions.gate),
    postgres(spec.criticalCaseName, spec.criticalCaseQuery, positions.criticalCase),
    postgres(spec.standardCaseName, spec.standardCaseQuery, positions.standardCase),
    ifNode(L.tgGate, "={{ Boolean($env.TELEGRAM_BOT_TOKEN && $env.TELEGRAM_CHAT_ID) }}", true, positions.notifyGate),
    telegramNode(spec, positions.telegram),
    ifNode(L.gmailGate, "={{ Boolean($env.MG_SMTP_HOST && $env.MG_SMTP_USER && $env.MG_SMTP_PASSWORD) }}", true, positions.gmailGate),
    gmailNode(spec, positions.gmail),
    simulate(spec.actionA[0], spec.actionA[1], positions.actionA, spec.actionA[2]),
    simulate(spec.actionB[0], spec.actionB[1], positions.actionB, spec.actionB[2]),
    simulate(spec.verifyAction[0], spec.verifyAction[1], positions.verify, spec.verifyAction[2]),
    postgres(L.mark, spec.markQuery, positions.mark),
    http(L.finalize, "POST", `={{ ($env.MG_API_URL || 'http://localhost:4000/api') + '/automation/executions/' + ${ref(L.validate, "executionId")} + '/complete' }}`, positions.finalize, jsonBody(finalizeFields)),
  ];

  if (spec.schedule) {
    nodes.push(
      node(spec.schedule.label, "n8n-nodes-base.scheduleTrigger", 1.2, { rule: { interval: [{ field: "cronExpression", expression: spec.schedule.cron }] } }, [0, 180]),
      postgres(spec.schedule.pickName, spec.schedule.pickQuery, [220, 180]),
    );
  }

  nodes.push(sticky("Ghi chú — Tổng quan", `# ${spec.name}\n${spec.stageSummary}\n\n**Kích hoạt:** webhook \`${spec.webhookPath}\` · **Node thực thi:** ${nodeCount} · **Kênh:** 📱 node Telegram + 📧 Gmail (SMTP) · **Phụ trách:** SOC Automation`, [0, -440], 2100, 180, 4));
  nodes.push(sticky("Ghi chú — Tiếp nhận & Đánh giá", "## ① Tiếp nhận & Đánh giá\nKiểm tra dữ liệu, tải bản ghi, làm giàu ngữ cảnh và chấm điểm rủi ro theo mức độ nghiêm trọng và tầm quan trọng của tài sản.", [0, -240], 1050, 150, 1));
  nodes.push(sticky("Ghi chú — Phản hồi & Thông báo", "## ② Phản hồi & Thông báo\nMở sự cố hoặc ticket, gửi 📱 node Telegram và 📧 Gmail (SMTP) độc lập, thực thi phản ứng, xác minh rồi ghi nhận kết quả.", [1320, -240], 1050, 150, 3));

  const connections = {
    ["📥 " + spec.triggerLabel]: { main: [[{ node: L.validate, type: "main", index: 0 }]] },
    [L.validate]: { main: [[{ node: spec.loadName, type: "main", index: 0 }]] },
    [spec.loadName]: { main: [[{ node: spec.enrichA[0], type: "main", index: 0 }]] },
    [spec.enrichA[0]]: { main: [[{ node: L.score, type: "main", index: 0 }]] },
    [L.score]: { main: [[{ node: L.gate, type: "main", index: 0 }]] },
    [L.gate]: {
      main: [
        [{ node: spec.criticalCaseName, type: "main", index: 0 }],
        [{ node: spec.standardCaseName, type: "main", index: 0 }],
      ],
    },
    [spec.criticalCaseName]: { main: [[{ node: L.tgGate, type: "main", index: 0 }]] },
    [spec.standardCaseName]: { main: [[{ node: L.tgGate, type: "main", index: 0 }]] },
    [L.tgGate]: {
      main: [
        [{ node: L.tg, type: "main", index: 0 }],
        [{ node: L.gmailGate, type: "main", index: 0 }],
      ],
    },
    [L.tg]: { main: [[{ node: L.gmailGate, type: "main", index: 0 }]] },
    [L.gmailGate]: {
      main: [
        [{ node: L.gmail, type: "main", index: 0 }],
        [{ node: spec.actionA[0], type: "main", index: 0 }],
      ],
    },
    [L.gmail]: { main: [[{ node: spec.actionA[0], type: "main", index: 0 }]] },
    [spec.actionA[0]]: { main: [[{ node: spec.actionB[0], type: "main", index: 0 }]] },
    [spec.actionB[0]]: { main: [[{ node: spec.verifyAction[0], type: "main", index: 0 }]] },
    [spec.verifyAction[0]]: { main: [[{ node: L.mark, type: "main", index: 0 }]] },
    [L.mark]: { main: [[{ node: L.finalize, type: "main", index: 0 }]] },
  };

  if (spec.schedule) {
    connections[spec.schedule.label] = { main: [[{ node: spec.schedule.pickName, type: "main", index: 0 }]] };
    connections[spec.schedule.pickName] = { main: [[{ node: L.validate, type: "main", index: 0 }]] };
  }

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


const buildEcommerceWorkflow = (spec) => {
  resetIds();

  const validateCode = `const body = $json.body ?? $json;
const orderId = String(body.orderId || body.entityId || '').trim();
if (!orderId) { throw new Error('orderId is required'); }
const executionId = String(body.executionId || ('ecom-' + Date.now()));
return [{ json: { ...body, orderId, executionId, workflowId: 'ecommerce-fraud-response', workflowName: 'Phản hồi Gian lận Thương mại điện tử', mode: body.mode || 'realtime', receivedAt: new Date().toISOString() } }];`;

  const scoreCode = `const base = $('🔍 Kiểm tra dữ liệu').first().json;
const order = $('🗄️ Tải đơn hàng').first().json || {};
if (!order.id) { throw new Error('Store order not found: ' + base.orderId); }
const esc = (value) => String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const parseFlags = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch (error) { return [String(value)]; }
};
const flags = parseFlags(base.flags && base.flags.length ? base.flags : order.fraud_flags);
const velocity = Number(order.ip_order_count || 1);
const riskScore = Math.max(Number(base.riskScore || 0), Number(order.risk_score || 0), Math.min(100, velocity * 5));
const severity = riskScore >= 80 ? 'critical' : riskScore >= 50 ? 'high' : 'medium';
const sevLabel = { critical: '🔴 NGHIÊM TRỌNG', high: '🟠 CAO', medium: '🟡 TRUNG BÌNH' }[severity];
const sevColor = { critical: '#dc2626', high: '#ea580c', medium: '#ca8a04' }[severity];
const consoleUrl = (typeof $env !== 'undefined' && $env.MG_CONSOLE_URL) ? $env.MG_CONSOLE_URL : 'http://localhost:3000';
const orderLink = consoleUrl + '/store/order/' + order.id;
const adminLink = consoleUrl + '/store/admin';
const total = Number(order.total || 0).toLocaleString('vi-VN') + ' ₫';
const flagText = flags.length ? flags.join(', ') : 'không có dấu hiệu bổ sung';
const telegramText = [
  '🚨 <b>GIAN LẬN THƯƠNG MẠI ĐIỆN TỬ — MEDICAREGUARD</b>',
  '━━━━━━━━━━━━━━━━━━━━',
  '<b>Đơn hàng</b>  <code>' + esc(order.order_number) + '</code>',
  '<b>Mức độ</b>  ' + sevLabel,
  '<b>Điểm rủi ro</b>  <b>' + riskScore + '/100</b>',
  '<b>Giá trị</b>  ' + esc(total),
  '<b>Khách</b>  ' + esc(order.shipping_name || order.customer_name || 'Khách vãng lai'),
  '<b>IP</b>  <code>' + esc(order.ip_address || base.ip || 'không rõ') + '</code> (' + esc(order.ip_country || base.country || 'không rõ') + ')',
  '<b>Giao tới</b>  ' + esc(order.shipping_city) + ', ' + esc(order.shipping_country),
  '<b>Dấu hiệu</b>  ' + esc(flagText),
  '<b>Thời gian</b>  ' + esc(new Date().toLocaleString('vi-VN')),
  '━━━━━━━━━━━━━━━━━━━━',
  '🔗 <a href="' + esc(adminLink) + '">Mở quản trị cửa hàng</a>',
].join('\\n');
const emailHtml = '<div style="background:#f1f5f9;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#0f172a">'
  + '<div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden">'
  + '<div style="background:#0b1220;padding:22px 24px;color:#ffffff">'
  + '<div style="font-size:11px;letter-spacing:2px;color:#93c5fd;font-weight:700">MEDICAREGUARD · SOC / STORE</div>'
  + '<div style="font-size:22px;font-weight:700;margin-top:6px">Cảnh báo gian lận đơn hàng</div>'
  + '</div>'
  + '<div style="padding:24px">'
  + '<div style="display:inline-block;background:' + sevColor + ';color:#ffffff;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:700">' + esc(sevLabel) + '</div>'
  + '<h2 style="font-size:18px;margin:16px 0 8px">Đơn ' + esc(order.order_number) + ' · ' + riskScore + '/100</h2>'
  + '<p style="color:#475569;line-height:1.6;margin:0 0 18px">Đơn hàng trị giá <b>' + esc(total) + '</b> có dấu hiệu gian lận: ' + esc(flagText) + '.</p>'
  + '<table style="width:100%;border-collapse:collapse;font-size:14px">'
  + '<tr><td style="padding:8px 0;color:#64748b">Khách hàng</td><td style="padding:8px 0;text-align:right;font-weight:600">' + esc(order.shipping_name || order.customer_name || 'Khách vãng lai') + '</td></tr>'
  + '<tr><td style="padding:8px 0;color:#64748b">IP / quốc gia</td><td style="padding:8px 0;text-align:right;font-weight:600">' + esc(order.ip_address || 'không rõ') + ' · ' + esc(order.ip_country || 'không rõ') + '</td></tr>'
  + '<tr><td style="padding:8px 0;color:#64748b">Giao tới</td><td style="padding:8px 0;text-align:right;font-weight:600">' + esc(order.shipping_city) + ', ' + esc(order.shipping_country) + '</td></tr>'
  + '<tr><td style="padding:8px 0;color:#64748b">Số đơn cùng IP 24h</td><td style="padding:8px 0;text-align:right;font-weight:600">' + velocity + '</td></tr>'
  + '<tr><td style="padding:8px 0;color:#64748b">Thanh toán</td><td style="padding:8px 0;text-align:right;font-weight:600">' + esc(order.payment_method) + ' · ' + esc(order.payment_status) + '</td></tr>'
  + '</table>'
  + '<a href="' + esc(adminLink) + '" style="display:inline-block;margin-top:22px;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">Mở quản trị cửa hàng</a>'
  + '</div>'
  + '<div style="padding:14px 24px;background:#f8fafc;color:#94a3b8;font-size:11px">Tự động gửi bởi MedicareGuard SOAR · ' + esc(new Date().toLocaleString('vi-VN')) + '</div>'
  + '</div></div>';
const emailText = telegramText.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
return [{ json: { ...base, order, riskScore, severity, flags, flagText, velocity, total, telegramText, emailHtml, emailText, orderLink, adminLink } }];`;

  const recordQuery = `WITH alert AS (
  UPDATE alerts SET status = 'investigating',
    metadata = metadata || jsonb_build_object('ecommerceFraudWorkflow', 'completed', 'ecommerceRiskScore', '${sqlRef("🧮 Chấm điểm & Soạn cảnh báo", "riskScore")}', 'ecommerceWorkflowAt', now()::text),
    updated_at = now()
  WHERE id = NULLIF('${sqlRef("🔍 Kiểm tra dữ liệu", "alertId")}', '')::uuid
  RETURNING id
), event AS (
  UPDATE store_security_events SET metadata = metadata || jsonb_build_object('n8nWorkflowAt', now()::text, 'n8nExecutionId', '${sqlRef("🔍 Kiểm tra dữ liệu", "executionId")}', 'n8nRiskScore', '${sqlRef("🧮 Chấm điểm & Soạn cảnh báo", "riskScore")}')
  WHERE order_id = '${sqlRef("🔍 Kiểm tra dữ liệu", "orderId")}'::uuid
  RETURNING id
)
SELECT (SELECT count(*) FROM alert)::int AS alerts_updated, (SELECT count(*) FROM event)::int AS events_updated;`;

  const nodes = [
    node("📥 " + spec.triggerLabel, "n8n-nodes-base.webhook", 2, { httpMethod: "POST", path: spec.webhookPath, responseMode: "onReceived", options: {} }, [0, 0], { webhookId: id() }),
    code("🔍 Kiểm tra dữ liệu", validateCode, [220, 0]),
    postgres("🗄️ Tải đơn hàng", `SELECT o.id, o.order_number, o.status, o.payment_status, o.payment_method, o.total, o.risk_score, o.fraud_flags,
  o.ip_address, o.ip_country, o.ip_country_code, o.ip_source, o.shipping_name, o.shipping_email,
  o.shipping_city, o.shipping_country, o.shipping_country_code, o.created_at,
  c.full_name AS customer_name, c.email AS customer_email,
  (SELECT count(*)::int FROM store_orders x WHERE x.ip_address = o.ip_address AND x.created_at > now() - interval '24 hours') AS ip_order_count
FROM store_orders o LEFT JOIN store_customers c ON c.id = o.customer_id
WHERE o.id = '${sqlRef("🔍 Kiểm tra dữ liệu", "orderId")}' LIMIT 1;`, [440, 0]),
    code("🧮 Chấm điểm & Soạn cảnh báo", scoreCode, [660, 0]),
    ifNode("⚠️ Rủi ro cao?", "={{ $json.riskScore }}", 50, [880, 0]),
    postgres("🔒 Tạm giữ đơn hàng", `UPDATE store_orders SET status = 'on_hold',
  metadata = metadata || jsonb_build_object('fraudWorkflowAt', now()::text, 'fraudWorkflowExecution', '${sqlRef("🔍 Kiểm tra dữ liệu", "executionId")}', 'fraudWorkflowRisk', '${sqlRef("🧮 Chấm điểm & Soạn cảnh báo", "riskScore")}'),
  updated_at = now()
WHERE id = '${sqlRef("🔍 Kiểm tra dữ liệu", "orderId")}' RETURNING id, order_number, status;`, [1100, -140]),
    node("✅ Đơn trong ngưỡng", "n8n-nodes-base.noOp", 1, {}, [1100, 140]),
    ifNode("📱 Telegram sẵn sàng?", "={{ Boolean($env.TELEGRAM_BOT_TOKEN && $env.TELEGRAM_CHAT_ID) }}", true, [1320, 0]),
    node("📱 Gửi Telegram", "n8n-nodes-base.telegram", 1.2, {
      resource: "message",
      operation: "sendMessage",
      chatId: "={{ $env.TELEGRAM_CHAT_ID || '' }}",
      text: "={{ $('🧮 Chấm điểm & Soạn cảnh báo').first().json.telegramText }}",
      additionalFields: { parse_mode: "HTML", disable_web_page_preview: true, appendAttribution: false },
    }, [1540, -120], { credentials: { telegramApi: { id: "mg-telegram-credential", name: "MedicareGuard Telegram" } }, onError: "continueRegularOutput" }),
    ifNode("📧 Gmail sẵn sàng?", "={{ Boolean($env.MG_SMTP_HOST && $env.MG_SMTP_USER && $env.MG_SMTP_PASSWORD) }}", true, [1760, 0]),
    node("📧 Gửi Gmail (SMTP)", "n8n-nodes-base.emailSend", 2.1, {
      fromEmail: "={{ $env.MG_SMTP_FROM || $env.MG_SMTP_USER || 'alerts@medicareguard.io' }}",
      toEmail: "={{ $env.MG_ALERT_EMAIL || 'soc@medicareguard.io' }}",
      subject: "=🚨 Gian lận đơn {{ $('🧮 Chấm điểm & Soạn cảnh báo').first().json.order.order_number }} — {{ $('🧮 Chấm điểm & Soạn cảnh báo').first().json.riskScore }}/100",
      emailFormat: "html",
      html: "={{ $('🧮 Chấm điểm & Soạn cảnh báo').first().json.emailHtml }}",
      text: "={{ $('🧮 Chấm điểm & Soạn cảnh báo').first().json.emailText }}",
      options: {},
    }, [1980, -120], { credentials: { smtp: { id: "mg-smtp-credential", name: "MedicareGuard SMTP" } }, onError: "continueRegularOutput" }),
    postgres("📝 Ghi nhận phản hồi", recordQuery, [2200, 0]),
    http("🏁 Kết thúc phiên chạy", "POST", `={{ ($env.MG_API_URL || 'http://localhost:4000/api') + '/automation/executions/' + ${ref("🔍 Kiểm tra dữ liệu", "executionId")} + '/complete' }}`, [2420, 0], jsonBody(`workflowId: 'ecommerce-fraud-response', status: 'success', durationMs: Math.max(1, Date.now() - new Date($('🔍 Kiểm tra dữ liệu').first().json.receivedAt).getTime()), nodeCount: 13, metrics: { risk_score: $('🧮 Chấm điểm & Soạn cảnh báo').first().json.riskScore, order_number: $('🧮 Chấm điểm & Soạn cảnh báo').first().json.order.order_number, held: $('🧮 Chấm điểm & Soạn cảnh báo').first().json.riskScore >= 50, flags: $('🧮 Chấm điểm & Soạn cảnh báo').first().json.flags.length, telegram_alert: Boolean($env.TELEGRAM_BOT_TOKEN && $env.TELEGRAM_CHAT_ID), email_alert: Boolean($env.MG_SMTP_HOST && $env.MG_SMTP_USER && $env.MG_SMTP_PASSWORD) }, message: 'n8n đã xử lý gian lận đơn ' + $('🧮 Chấm điểm & Soạn cảnh báo').first().json.order.order_number`)),
  ];

  nodes.push(sticky("Ghi chú — Tổng quan", "# Phản hồi Gian lận Thương mại điện tử\nXác minh IP/quốc gia · chấm điểm rủi ro · tạm giữ đơn · cảnh báo SOC\n\n**Kích hoạt:** webhook `mg-ecommerce-fraud` · **Node thực thi:** 13 · **Kênh:** 📱 Telegram + 📧 Gmail · **Phụ trách:** SOC Automation", [0, -420], 1800, 170, 4));
  nodes.push(sticky("Ghi chú — Đánh giá", "## ① Đánh giá\nTải đơn hàng, đối chiếu IP/quốc gia, số đơn cùng IP trong 24 giờ và điểm rủi ro do backend chấm.", [0, -210], 1000, 130, 1));
  nodes.push(sticky("Ghi chú — Phản hồi", "## ② Phản hồi\nĐơn rủi ro ≥70 bị tạm giữ. Gửi Telegram/Gmail độc lập, cập nhật cảnh báo SOC và sự kiện bảo mật.", [1100, -210], 1200, 130, 3));

  const connections = {
    ["📥 " + spec.triggerLabel]: { main: [[{ node: "🔍 Kiểm tra dữ liệu", type: "main", index: 0 }]] },
    "🔍 Kiểm tra dữ liệu": { main: [[{ node: "🗄️ Tải đơn hàng", type: "main", index: 0 }]] },
    "🗄️ Tải đơn hàng": { main: [[{ node: "🧮 Chấm điểm & Soạn cảnh báo", type: "main", index: 0 }]] },
    "🧮 Chấm điểm & Soạn cảnh báo": { main: [[{ node: "⚠️ Rủi ro cao?", type: "main", index: 0 }]] },
    "⚠️ Rủi ro cao?": { main: [
      [{ node: "🔒 Tạm giữ đơn hàng", type: "main", index: 0 }],
      [{ node: "✅ Đơn trong ngưỡng", type: "main", index: 0 }],
    ] },
    "🔒 Tạm giữ đơn hàng": { main: [[{ node: "📱 Telegram sẵn sàng?", type: "main", index: 0 }]] },
    "✅ Đơn trong ngưỡng": { main: [[{ node: "📱 Telegram sẵn sàng?", type: "main", index: 0 }]] },
    "📱 Telegram sẵn sàng?": { main: [
      [{ node: "📱 Gửi Telegram", type: "main", index: 0 }],
      [{ node: "📧 Gmail sẵn sàng?", type: "main", index: 0 }],
    ] },
    "📱 Gửi Telegram": { main: [[{ node: "📧 Gmail sẵn sàng?", type: "main", index: 0 }]] },
    "📧 Gmail sẵn sàng?": { main: [
      [{ node: "📧 Gửi Gmail (SMTP)", type: "main", index: 0 }],
      [{ node: "📝 Ghi nhận phản hồi", type: "main", index: 0 }],
    ] },
    "📧 Gửi Gmail (SMTP)": { main: [[{ node: "📝 Ghi nhận phản hồi", type: "main", index: 0 }]] },
    "📝 Ghi nhận phản hồi": { main: [[{ node: "🏁 Kết thúc phiên chạy", type: "main", index: 0 }]] },
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
return [{ json: { ...body, executionId, workflowId: 'live-attack-monitor', workflowName: 'Giám sát Tấn công Trực tiếp & Cảnh báo Điện thoại', mode: body.mode || 'scheduled', startedAt: body.startedAt || new Date().toISOString() } }];`;

  const buildMessageCode = `const attacks = Array.isArray($json.attacks) ? $json.attacks : [];
const esc = (value) => String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const sevLabel = { critical: '🔴 NGHIÊM TRỌNG', high: '🟠 CAO', medium: '🟡 TRUNG BÌNH', low: '🟢 THẤP' };
const sevColor = { critical: '#dc2626', high: '#ea580c', medium: '#ca8a04', low: '#16a34a' };
const consoleUrl = (typeof $env !== 'undefined' && $env.MG_CONSOLE_URL) ? $env.MG_CONSOLE_URL : 'http://localhost:3000';
const lines = attacks.map(function (a) { return '• <b>[' + esc((sevLabel[a.severity] || a.severity || 'CAO')) + ']</b> ' + esc(a.title) + ' — <code>' + esc(a.source_ip || 'không rõ') + '</code> (' + (a.risk_score || 0) + '/100)'; });
const telegramText = [
  '🚨 <b>GIÁM SÁT TẤN CÔNG MEDICAREGUARD</b>',
  '━━━━━━━━━━━━━━━━━━━━',
  '<b>' + attacks.length + '</b> tấn công rủi ro cao mới trong 24 giờ qua',
  '',
  lines.join('\\n') || '• Không có tấn công mới',
  '━━━━━━━━━━━━━━━━━━━━',
  '🔗 <a href="' + esc(consoleUrl + '/alerts') + '">Mở danh sách cảnh báo</a>',
].join('\\n');
const rows = attacks.map(function (a) {
  const color = sevColor[a.severity] || '#64748b';
  return '<tr><td style="padding:10px 8px;border-bottom:1px solid #e2e8f0"><span style="display:inline-block;background:' + color + ';color:#fff;border-radius:999px;padding:3px 8px;font-size:11px;font-weight:700">' + esc(sevLabel[a.severity] || a.severity || 'CAO') + '</span></td>'
    + '<td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;font-weight:600">' + esc(a.title) + '</td>'
    + '<td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;color:#475569"><code>' + esc(a.source_ip || 'không rõ') + '</code></td>'
    + '<td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700">' + (a.risk_score || 0) + '/100</td></tr>';
}).join('');
const emailHtml = '<div style="background:#f1f5f9;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#0f172a">'
  + '<div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden">'
  + '<div style="background:#0b1220;padding:22px 24px;color:#ffffff">'
  + '<div style="font-size:11px;letter-spacing:2px;color:#93c5fd;font-weight:700">MEDICAREGUARD · SOC</div>'
  + '<div style="font-size:22px;font-weight:700;margin-top:6px">Giám sát tấn công trực tiếp</div>'
  + '</div>'
  + '<div style="padding:24px">'
  + '<p style="margin:0 0 18px;color:#475569;line-height:1.6"><b>' + attacks.length + '</b> tấn công rủi ro cao mới được phát hiện trong 24 giờ qua.</p>'
  + '<table style="width:100%;border-collapse:collapse;font-size:13px">'
  + '<thead><tr><th style="text-align:left;padding:8px;color:#64748b;font-size:11px;text-transform:uppercase">Mức độ</th><th style="text-align:left;padding:8px;color:#64748b;font-size:11px;text-transform:uppercase">Sự kiện</th><th style="text-align:left;padding:8px;color:#64748b;font-size:11px;text-transform:uppercase">Nguồn</th><th style="text-align:right;padding:8px;color:#64748b;font-size:11px;text-transform:uppercase">Rủi ro</th></tr></thead>'
  + '<tbody>' + (rows || '<tr><td colspan="4" style="padding:16px;text-align:center;color:#94a3b8">Không có tấn công mới</td></tr>') + '</tbody>'
  + '</table>'
  + '<a href="' + esc(consoleUrl + '/alerts') + '" style="display:inline-block;margin-top:22px;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">Mở danh sách cảnh báo</a>'
  + '</div>'
  + '<div style="padding:14px 24px;background:#f8fafc;color:#94a3b8;font-size:11px">Tự động gửi bởi MedicareGuard SOAR · ' + esc(new Date().toLocaleString('vi-VN')) + '</div>'
  + '</div></div>';
const emailText = telegramText.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
const base = $('🧭 Chuẩn hóa dữ liệu').first().json;
return [{ json: { ...base, count: attacks.length, attacks, summary: lines.join(' | '), telegramText, emailHtml, emailText } }];`;

  const metricsCode = `const base = $('🧭 Chuẩn hóa dữ liệu').first().json;
const built = $('✉️ Soạn tin cảnh báo').first().json;
const count = Number(built.count || 0);
return [{ json: { workflowId: 'live-attack-monitor', status: 'success', durationMs: Math.max(1, Date.now() - new Date(base.startedAt).getTime()), nodeCount: 18, metrics: { attack_count: count, channels: ['telegram','gmail'], lookback_hours: 24 }, message: 'Giám sát tấn công phát hiện ' + count + ' tấn công mới' } }];`;

  const channelCheckCode = `const sent = (name) => { try { return !$(name).first().json.error; } catch (error) { return false; } };
const telegramSent = Boolean($env.TELEGRAM_BOT_TOKEN && $env.TELEGRAM_CHAT_ID) && sent('📱 Gửi Telegram');
return [{ json: { telegramSent } }];`;

  const nodes = [
    node("Webhook — " + spec.triggerLabel, "n8n-nodes-base.webhook", 2, { httpMethod: "POST", path: spec.webhookPath, responseMode: "onReceived", options: {} }, positions.monitorWebhook, { webhookId: id() }),
    node("⏰ Lịch mỗi 5 phút", "n8n-nodes-base.scheduleTrigger", 1.2, { rule: { interval: [{ field: "minutes", minutesInterval: 5 }] } }, positions.monitorSchedule),
    code("🧭 Chuẩn hóa dữ liệu", normalizeCode, positions.monitorNormalize),
    postgres("🗄️ Tải tấn công gần đây", `SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) AS attacks, count(*)::int AS count
FROM (
  SELECT id, title, severity, source_ip, risk_score, detected_at
  FROM alerts
  WHERE severity IN ('critical','high')
    AND detected_at > now() - interval '24 hours'
    AND COALESCE(metadata->>'phoneNotifiedAt','') = ''
  ORDER BY detected_at DESC LIMIT 5
) t;`, positions.monitorLoad),
    code("✉️ Soạn tin cảnh báo", buildMessageCode, positions.monitorBuild),
    ifNode("❓ Có tấn công mới?", `={{ $json.count }}`, 1, positions.monitorGate),
    postgres("👥 Tải người nhận", "SELECT u.id, u.email, u.full_name FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name IN ('admin','analyst') ORDER BY r.level DESC LIMIT 1;", positions.monitorRecipients),
    ifNode("📱 Telegram sẵn sàng?", "={{ Boolean($env.TELEGRAM_BOT_TOKEN && $env.TELEGRAM_CHAT_ID) }}", true, positions.monitorNotifyGate),
    ifNode("📧 Gmail sẵn sàng?", "={{ Boolean($env.MG_SMTP_HOST && $env.MG_SMTP_USER && $env.MG_SMTP_PASSWORD) }}", true, positions.monitorGmailGate),
    node("📱 Gửi Telegram", "n8n-nodes-base.telegram", 1.2, {
      resource: "message",
      operation: "sendMessage",
      chatId: "={{ $env.TELEGRAM_CHAT_ID || '' }}",
      text: "={{ $('✉️ Soạn tin cảnh báo').first().json.telegramText }}",
      additionalFields: { parse_mode: "HTML", disable_web_page_preview: true, appendAttribution: false },
    }, positions.monitorTelegram, { credentials: { telegramApi: { id: "mg-telegram-credential", name: "MedicareGuard Telegram" } }, onError: "continueRegularOutput" }),
    node("📧 Gửi Gmail (SMTP)", "n8n-nodes-base.emailSend", 2.1, {
      fromEmail: "={{ $env.MG_SMTP_FROM || $env.MG_SMTP_USER || 'alerts@medicareguard.io' }}",
      toEmail: "={{ $env.MG_ALERT_EMAIL || $('👥 Tải người nhận').first().json.email || 'soc@medicareguard.io' }}",
      subject: "=🚨 Giám sát tấn công MedicareGuard — {{ $('✉️ Soạn tin cảnh báo').first().json.count }} tấn công mới",
      emailFormat: "html",
      html: "={{ $('✉️ Soạn tin cảnh báo').first().json.emailHtml }}",
      text: "={{ $('✉️ Soạn tin cảnh báo').first().json.emailText }}",
      options: {},
    }, positions.monitorGmail, { credentials: { smtp: { id: "mg-smtp-credential", name: "MedicareGuard SMTP" } }, onError: "continueRegularOutput" }),
    simulate("🔔 Thông báo trong ứng dụng", "notify", positions.monitorInApp, `executionId: ${ref("🧭 Chuẩn hóa dữ liệu", "executionId")}, title: 'Giám sát tấn công: ' + $('✉️ Soạn tin cảnh báo').first().json.count + ' tấn công mới', message: $('✉️ Soạn tin cảnh báo').first().json.summary, severity: 'critical', channel: 'phone'`),
    code("🧾 Kiểm tra Telegram đã gửi", channelCheckCode, [2200, 270]),
    ifNode("✅ Telegram đã gửi?", "={{ $json.telegramSent }}", true, [2310, 270]),
    postgres("📝 Đánh dấu đã gửi", `UPDATE alerts SET metadata = metadata || jsonb_build_object('phoneNotifiedAt', now()::text), updated_at = now()
WHERE severity IN ('critical','high')
  AND detected_at > now() - interval '24 hours'
  AND COALESCE(metadata->>'phoneNotifiedAt','') = ''
RETURNING id;`, positions.monitorUpdate),
    code("📈 Tổng hợp số liệu", metricsCode, positions.monitorMetrics),
    http("🏁 Kết thúc phiên chạy", "POST", `={{ ($env.MG_API_URL || 'http://localhost:4000/api') + '/automation/executions/' + ${ref("🧭 Chuẩn hóa dữ liệu", "executionId")} + '/complete' }}`, positions.monitorFinalize, jsonBody(`workflowId: 'live-attack-monitor', status: 'success', durationMs: $json.durationMs, nodeCount: 18, metrics: $json.metrics, message: $json.message`)),
    node("😴 Không có tấn công mới", "n8n-nodes-base.noOp", 1, {}, positions.monitorNoAttacks),
  ];

  nodes.push(sticky("Ghi chú — Tổng quan", "# Giám sát Tấn công Trực tiếp & Cảnh báo Điện thoại\nQuét mỗi 5 phút · 18 node · 📱 node Telegram + 📧 Gmail (SMTP) · không cần ngồi trước máy tính\n\n**Kích hoạt:** webhook `mg-attack-monitor` + lịch `*/5 * * * *` · **Phụ trách:** SOC Automation", [0, -360], 1800, 160, 4));
  nodes.push(sticky("Ghi chú — Quét & Tổng hợp", "## ① Quét & Tổng hợp\nMỗi 5 phút, quét cảnh báo critical/high trong 24 giờ chưa gửi cho trực ban và gộp thành một tin nhắn dễ đọc.", [0, -170], 1000, 130, 1));
  nodes.push(sticky("Ghi chú — Cảnh báo & Ghi nhận", "## ② Cảnh báo & Ghi nhận\n📱 Telegram: đẩy ngay về điện thoại.\n📧 Gmail: bản lưu cho kiểm toán.\nHai kênh hoạt động độc lập, sau đó đánh dấu đã gửi.", [1100, -170], 1000, 130, 3));

  const connections = {
    ["Webhook — " + spec.triggerLabel]: { main: [[{ node: "🧭 Chuẩn hóa dữ liệu", type: "main", index: 0 }]] },
    "⏰ Lịch mỗi 5 phút": { main: [[{ node: "🧭 Chuẩn hóa dữ liệu", type: "main", index: 0 }]] },
    "🧭 Chuẩn hóa dữ liệu": { main: [[{ node: "🗄️ Tải tấn công gần đây", type: "main", index: 0 }]] },
    "🗄️ Tải tấn công gần đây": { main: [[{ node: "✉️ Soạn tin cảnh báo", type: "main", index: 0 }]] },
    "✉️ Soạn tin cảnh báo": { main: [[{ node: "❓ Có tấn công mới?", type: "main", index: 0 }]] },
    "❓ Có tấn công mới?": {
      main: [
        [{ node: "👥 Tải người nhận", type: "main", index: 0 }],
        [{ node: "😴 Không có tấn công mới", type: "main", index: 0 }],
      ],
    },
    "👥 Tải người nhận": { main: [[{ node: "📱 Telegram sẵn sàng?", type: "main", index: 0 }]] },
    "📱 Telegram sẵn sàng?": {
      main: [
        [{ node: "📱 Gửi Telegram", type: "main", index: 0 }],
        [{ node: "📧 Gmail sẵn sàng?", type: "main", index: 0 }],
      ],
    },
    "📱 Gửi Telegram": { main: [[{ node: "📧 Gmail sẵn sàng?", type: "main", index: 0 }]] },
    "📧 Gmail sẵn sàng?": {
      main: [
        [{ node: "📧 Gửi Gmail (SMTP)", type: "main", index: 0 }],
        [{ node: "🔔 Thông báo trong ứng dụng", type: "main", index: 0 }],
      ],
    },
    "📧 Gửi Gmail (SMTP)": { main: [[{ node: "🔔 Thông báo trong ứng dụng", type: "main", index: 0 }]] },
    "🔔 Thông báo trong ứng dụng": { main: [[{ node: "🧾 Kiểm tra Telegram đã gửi", type: "main", index: 0 }]] },
    "🧾 Kiểm tra Telegram đã gửi": { main: [[{ node: "✅ Telegram đã gửi?", type: "main", index: 0 }]] },
    "✅ Telegram đã gửi?": {
      main: [
        [{ node: "📝 Đánh dấu đã gửi", type: "main", index: 0 }],
        [{ node: "📈 Tổng hợp số liệu", type: "main", index: 0 }],
      ],
    },
    "📝 Đánh dấu đã gửi": { main: [[{ node: "📈 Tổng hợp số liệu", type: "main", index: 0 }]] },
    "📈 Tổng hợp số liệu": { main: [[{ node: "🏁 Kết thúc phiên chạy", type: "main", index: 0 }]] },
    "😴 Không có tấn công mới": { main: [[{ node: "📈 Tổng hợp số liệu", type: "main", index: 0 }]] },
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
