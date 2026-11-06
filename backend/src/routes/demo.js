const express = require("express");
const crypto = require("node:crypto");
const { query } = require("../config/db");
const { asyncHandler } = require("../utils/http");
const { n8nBaseUrl } = require("../services/automationRuntime");

const router = express.Router();

const PATIENTS = [
  { id: "BN-2401", name: "Nguyễn Văn An", dob: "1958-04-12", gender: "Nam", phone: "0901 234 567", condition: "Tăng huyết áp, Đái tháo đường type 2", doctor: "BS. Trần Minh Khoa", lastVisit: "2026-10-21", status: "Đang điều trị", insurance: "Medicare A/B" },
  { id: "BN-2402", name: "Trần Thị Bích", dob: "1965-09-03", gender: "Nữ", phone: "0912 345 678", condition: "Suy tim độ II, Rối loạn lipid máu", doctor: "BS. Lê Thu Hà", lastVisit: "2026-10-18", status: "Đang điều trị", insurance: "Medicare A/B" },
  { id: "BN-2403", name: "Phạm Quốc Cường", dob: "1972-01-27", gender: "Nam", phone: "0933 456 789", condition: "COPD, Viêm phổi tái phát", doctor: "BS. Nguyễn Đức Long", lastVisit: "2026-10-15", status: "Theo dõi", insurance: "Medicare B" },
  { id: "BN-2404", name: "Lê Thị Dung", dob: "1949-11-08", gender: "Nữ", phone: "0944 567 890", condition: "Loãng xương, Sa sút trí tuệ nhẹ", doctor: "BS. Trần Minh Khoa", lastVisit: "2026-10-12", status: "Ổn định", insurance: "Medicare A/B" },
  { id: "BN-2405", name: "Hoàng Văn Em", dob: "1980-06-19", gender: "Nam", phone: "0955 678 901", condition: "Đái tháo đường type 1, Bệnh thận mạn", doctor: "BS. Lê Thu Hà", lastVisit: "2026-10-09", status: "Đang điều trị", insurance: "Medicare B" },
  { id: "BN-2406", name: "Vũ Thị Phương", dob: "1990-03-30", gender: "Nữ", phone: "0966 789 012", condition: "Hen phế quản, Dị ứng thuốc", doctor: "BS. Nguyễn Đức Long", lastVisit: "2026-10-05", status: "Ổn định", insurance: "Medicare A" },
];

const SCENARIOS = {
  ransomware: {
    workflow: "ransomware-containment",
    webhook: "/webhook/mg-ransomware",
    title: "Ransomware mã hóa hồ sơ bệnh án trên máy trạm",
    description: "Cảm biến EDR phát hiện tiến trình mã hóa hàng loạt tệp PDF hồ sơ bệnh án trên máy trạm tiếp nhận. Có ghi chú đòi tiền chuộc trong thư mục dùng chung.",
    severity: "critical",
    source: "Medicare Portal · EDR",
    sourceIp: "45.175.186.105",
    country: "Việt Nam",
    countryCode: "VN",
    riskScore: 94,
    confidence: 91,
    mitreTactic: "TA0040 Impact",
    mitreTechnique: "T1486 Data Encrypted for Impact",
    tags: ["demo", "ransomware", "patient-portal"],
  },
  phishing: {
    workflow: "phishing-triage",
    webhook: "/webhook/mg-phishing",
    title: "Email phishing giả mạo Medicare đòi xác minh hồ sơ",
    description: "Chiến dịch phishing gửi email giả mạo cổng Medicare, dụ bệnh nhân nhập mật khẩu và mã OTP. Một tài khoản đã nhấp liên kết độc hại.",
    severity: "high",
    source: "Medicare Portal · Email Gateway",
    sourceIp: "113.161.72.18",
    country: "Việt Nam",
    countryCode: "VN",
    riskScore: 86,
    confidence: 88,
    mitreTactic: "TA0001 Initial Access",
    mitreTechnique: "T1566 Phishing",
    tags: ["demo", "phishing", "patient-portal"],
  },
  credential: {
    workflow: "phishing-triage",
    webhook: "/webhook/mg-phishing",
    title: "Credential stuffing vào cổng bệnh nhân",
    description: "Hơn 240 lần đăng nhập thất bại từ một dải IP lạ vào tài khoản bệnh nhân, sau đó có một lần đăng nhập thành công bất thường.",
    severity: "high",
    source: "Medicare Portal · Identity",
    sourceIp: "14.161.22.9",
    country: "Việt Nam",
    countryCode: "VN",
    riskScore: 82,
    confidence: 84,
    mitreTactic: "TA0006 Credential Access",
    mitreTechnique: "T1110 Brute Force",
    tags: ["demo", "credential", "patient-portal"],
  },
  exfiltration: {
    workflow: "ransomware-containment",
    webhook: "/webhook/mg-ransomware",
    title: "Rò rỉ dữ liệu bệnh nhân qua kết nối ra ngoài",
    description: "Phát hiện máy chủ cơ sở dữ liệu bệnh nhân gửi lượng lớn dữ liệu mã hóa tới một địa chỉ C2 lạ trong giờ ngoài làm việc.",
    severity: "critical",
    source: "Medicare Portal · DLP",
    sourceIp: "171.244.4.77",
    country: "Việt Nam",
    countryCode: "VN",
    riskScore: 96,
    confidence: 93,
    mitreTactic: "TA0010 Exfiltration",
    mitreTechnique: "T1041 Exfiltration Over C2 Channel",
    tags: ["demo", "exfiltration", "patient-portal"],
  },
  insider: {
    workflow: "phishing-triage",
    webhook: "/webhook/mg-phishing",
    title: "Tài khoản nhân viên truy cập hồ sơ bệnh nhân bất thường",
    description: "Một tài khoản lễ tân truy cập 68 hồ sơ bệnh nhân trong 12 phút, ngoài ca làm việc và khác hoàn toàn hành vi thông thường.",
    severity: "medium",
    source: "Medicare Portal · UEBA",
    sourceIp: "10.20.4.88",
    country: "Việt Nam",
    countryCode: "VN",
    riskScore: 68,
    confidence: 76,
    mitreTactic: "TA0009 Collection",
    mitreTechnique: "T1530 Data from Information Repositories",
    tags: ["demo", "insider", "patient-portal"],
  },
};

const dispatch = async (scenario, alert) => {
  const target = SCENARIOS[scenario];
  if (!target) return { dispatched: false, status: "unknown-scenario" };
  try {
    const response = await fetch(`${n8nBaseUrl()}${target.webhook}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityId: alert.id,
        mode: "demo",
        triggeredBy: "patient-portal",
        startedAt: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(2500),
    });
    return { dispatched: response.ok, status: response.ok ? "dispatched" : `HTTP ${response.status}`, workflowId: target.workflow };
  } catch (error) {
    return { dispatched: false, status: error.name === "TimeoutError" ? "timeout" : "n8n-offline", workflowId: target.workflow };
  }
};

router.get(
  "/patients",
  asyncHandler(async (_req, res) => {
    res.json({ data: PATIENTS, generatedAt: new Date().toISOString(), disclaimer: "Dữ liệu minh họa phục vụ demo, không phải hồ sơ bệnh nhân thật." });
  }),
);

router.get(
  "/feed",
  asyncHandler(async (_req, res) => {
    const result = await query(
      `SELECT id, title, severity, status, source_ip, detected_at, risk_score, metadata->>'scenario' AS scenario
       FROM alerts
       WHERE tags @> ARRAY['demo']::text[]
       ORDER BY detected_at DESC
       LIMIT 12`,
    );
    res.json({ data: result.rows });
  }),
);

router.post(
  "/attack",
  asyncHandler(async (req, res) => {
    const scenario = String(req.body?.scenario || "ransomware").toLowerCase();
    const spec = SCENARIOS[scenario];
    if (!spec) {
      return res.status(400).json({ error: "Kịch bản không hợp lệ", scenarios: Object.keys(SCENARIOS) });
    }

    const asset = await query("SELECT id FROM assets ORDER BY random() LIMIT 1");
    const threat = await query("SELECT id FROM threats ORDER BY random() LIMIT 1");
    const executionId = crypto.randomUUID();
    const detectedAt = new Date().toISOString();
    const alertResult = await query(
      `INSERT INTO alerts
        (title, description, severity, status, source, source_ip, country, country_code, mitre_tactic, mitre_technique, threat_id, asset_id, risk_score, confidence, tags, metadata, detected_at)
       VALUES ($1,$2,$3,'open',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING id, title, description, severity, status, source, source_ip, country, risk_score, detected_at, tags, metadata`,
      [
        spec.title,
        spec.description,
        spec.severity,
        spec.source,
        spec.sourceIp,
        spec.country,
        spec.countryCode,
        spec.mitreTactic,
        spec.mitreTechnique,
        threat.rows[0]?.id || null,
        asset.rows[0]?.id || null,
        spec.riskScore,
        spec.confidence,
        spec.tags,
        JSON.stringify({ demo: true, scenario, executionId, patientId: req.body?.patientId || "BN-2401", source: "patient-portal" }),
        detectedAt,
      ],
    );
    const alert = alertResult.rows[0];
    const result = await dispatch(scenario, alert);
    res.status(201).json({
      data: {
        alert,
        executionId,
        scenario,
        workflowId: result.workflowId,
        dispatched: result.dispatched,
        dispatchStatus: result.status,
        socUrl: `http://localhost:3000/login`,
        message: result.dispatched
          ? "Đã tạo cảnh báo và kích hoạt luồng n8n. Kiểm tra Telegram/Gmail và bảng điều khiển SOC."
          : "Đã tạo cảnh báo nhưng n8n chưa phản hồi. Cảnh báo vẫn xuất hiện trong SOC.",
      },
    });
  }),
);

module.exports = router;
