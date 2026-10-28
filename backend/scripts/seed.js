const bcrypt = require("bcryptjs");
const { pool, query } = require("../src/config/db");
const config = require("../src/config/env");
const logger = require("../src/utils/logger");

const reset = process.argv.includes("--reset");

let state = 20261027;
const rand = () => {
  state |= 0;
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (items) => items[Math.floor(rand() * items.length)];
const int = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const chance = (probability) => rand() < probability;
const daysAgo = (days, jitterHours = 0) => new Date(Date.now() - days * 86400000 - int(0, jitterHours) * 3600000);
const hoursAgo = (hours) => new Date(Date.now() - hours * 3600000);
const iso = (date) => new Date(date).toISOString();
const uuid = () => require("node:crypto").randomUUID();

const insert = async (table, columns, rows) => {
  if (!rows.length) return [];
  const created = [];
  for (const row of rows) {
    const values = columns.map((column) => row[column]);
    const placeholders = columns.map((_, index) => `$${index + 1}`);
    const result = await query(
      `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`,
      values,
    );
    created.push(result.rows[0]);
  }
  logger.info(`Seeded ${table}`, { rows: created.length });
  return created;
};

const TABLES = [
  "store_security_events", "store_payments", "store_reviews", "store_order_items", "store_orders", "store_cart_items",
  "store_carts", "store_coupons", "store_products", "store_customers",
  "ai_messages", "ai_conversations", "integrations", "reports", "knowledge_base", "tickets", "settings", "tags",
  "comments", "vendors", "policies", "risk_assessments", "compliance_controls", "phishing_campaigns", "email_events",
  "data_sources", "network_flows", "devices", "agents", "monitors", "metrics", "notifications", "audit_logs",
  "activity_logs", "findings", "scans", "remediations", "cases", "threat_intel", "detection_rules", "playbooks",
  "vulnerabilities", "firewall_rules", "incidents", "alerts", "threats", "assets", "api_keys", "sessions",
  "departments", "users", "roles",
];

const COUNTRIES = [
  ["Trung Quốc", "CN"], ["Nga", "RU"], ["Hoa Kỳ", "US"], ["Brazil", "BR"], ["Ấn Độ", "IN"],
  ["Iran", "IR"], ["Triều Tiên", "KP"], ["Việt Nam", "VN"], ["Đức", "DE"], ["Hà Lan", "NL"],
  ["Ukraine", "UA"], ["Romania", "RO"], ["Nigeria", "NG"], ["Indonesia", "ID"], ["Hàn Quốc", "KR"],
  ["Thổ Nhĩ Kỳ", "TR"], ["Vương quốc Anh", "GB"], ["Pháp", "FR"], ["Singapore", "SG"], ["Nhật Bản", "JP"],
  ["Trung Quốc", "CN"], ["Nga", "RU"], ["Hoa Kỳ", "US"], ["Iran", "IR"], ["Triều Tiên", "KP"],
];

const CATEGORY_MITRE = {
  Ransomware: { tactic: "TA0040 Impact", technique: "T1486 Data Encrypted for Impact" },
  Phishing: { tactic: "TA0001 Initial Access", technique: "T1566 Phishing" },
  "DDoS": { tactic: "TA0040 Impact", technique: "T1498 Network Denial of Service" },
  "Brute Force": { tactic: "TA0006 Credential Access", technique: "T1110 Brute Force" },
  "Web Attack": { tactic: "TA0001 Initial Access", technique: "T1190 Exploit Public-Facing Application" },
  "Rò rỉ dữ liệu": { tactic: "TA0010 Exfiltration", technique: "T1041 Exfiltration Over C2 Channel" },
  C2: { tactic: "TA0011 Command and Control", technique: "T1071 Application Layer Protocol" },
  Cryptojacking: { tactic: "TA0040 Impact", technique: "T1496 Resource Hijacking" },
  Malware: { tactic: "TA0002 Execution", technique: "T1204 User Execution" },
  "Insider Threat": { tactic: "TA0009 Collection", technique: "T1530 Data from Cloud Storage" },
  "Supply Chain": { tactic: "TA0001 Initial Access", technique: "T1195 Supply Chain Compromise" },
  "Zero-day": { tactic: "TA0001 Initial Access", technique: "T1203 Exploitation for Client Execution" },
};

const CATEGORY_LABELS = {
  Ransomware: "ransomware", Phishing: "phishing", DDoS: "DDoS", "Brute Force": "dò mật khẩu",
  "Web Attack": "tấn công web", "Rò rỉ dữ liệu": "rò rỉ dữ liệu", C2: "C2",
  Cryptojacking: "đào tiền mã hóa", Malware: "mã độc", "Insider Threat": "mối đe dọa nội bộ",
  "Supply Chain": "chuỗi cung ứng", "Zero-day": "zero-day",
};

const KILL_CHAIN_LABELS = {
  reconnaissance: "trinh sát", weaponization: "vũ khí hóa", delivery: "phân phối",
  exploitation: "khai thác", "command-and-control": "chỉ huy và điều khiển", "actions-on-objective": "hành động mục tiêu",
};

const ACTORS = ["APT-29", "Lazarus Group", "FIN7", "Medusa", "LockBit", "Anonymous Sudan", "Turla", "Sandworm", "Scattered Spider", "Qakbot", "Emotet", "Cobalt Strike", "Mirai", "RedLine", "BlackCat", "Akira", "Play", "Cl0p", "Volt Typhoon", "Kimsuky"];
const VECTORS = ["Chiến dịch ransomware", "Thu thập thông tin xác thực", "Tín hiệu C2", "Làn sóng SQL injection", "Mạng botnet DDoS", "Bộ công cụ phishing", "Xâm phạm chuỗi cung ứng", "Rò rỉ dữ liệu", "Chiến dịch dò mật khẩu", "Triển khai web shell", "Đào tiền mã hóa", "Khai thác zero-day"];

const SOURCE_PREFIXES = ["45", "91", "103", "185", "194", "212", "80", "82", "31", "5", "37", "41", "62", "77", "89", "102", "109", "176", "181", "203"];
const randomIp = () => `${pick(SOURCE_PREFIXES)}.${int(0, 255)}.${int(0, 255)}.${int(1, 254)}`;

const ASSET_BLUEPRINTS = [
  ["Cổng bệnh nhân", "web_server", "Web", "portal.medicareguard.io", "10.10.1.10", "Ubuntu 24.04", "critical", "Vận hành an ninh"],
  ["Cơ sở dữ liệu EHR", "database", "Dữ liệu", "ehr-db-01.medicareguard.io", "10.10.2.11", "PostgreSQL 16", "critical", "Hệ thống lâm sàng"],
  ["API đặt lịch", "api_gateway", "API", "api.medicareguard.io", "10.10.1.20", "Node.js 20", "high", "Hạ tầng"],
  ["Dịch vụ thanh toán", "web_server", "Tài chính", "billing.medicareguard.io", "10.10.1.30", "Java 21", "high", "Tài chính"],
  ["Cụm Kubernetes", "kubernetes", "Nền tảng", "eks-prod.medicareguard.io", "10.10.3.0", "EKS 1.30", "critical", "Hạ tầng"],
  ["Cổng VPN", "vpn", "Mạng", "vpn.medicareguard.io", "10.10.0.5", "FortiOS 7.4", "critical", "Kỹ thuật mạng"],
  ["Cổng IoT y tế", "iot", "IoT", "iot-gw-01.medicareguard.io", "10.20.4.10", "Embedded Linux", "high", "Hệ thống lâm sàng"],
  ["Hệ thống PACS chẩn đoán hình ảnh", "medical_device", "Lâm sàng", "pacs-01.medicareguard.io", "10.20.5.21", "Windows Server 2022", "critical", "Hệ thống lâm sàng"],
  ["Cơ sở dữ liệu nhà thuốc", "database", "Dữ liệu", "pharmacy-db.medicareguard.io", "10.10.2.14", "MySQL 8.4", "high", "Hệ thống lâm sàng"],
  ["Máy trạm quản trị", "workstation", "Điểm cuối", "adm-ws-14.medicareguard.io", "10.30.1.14", "macOS 15", "medium", "Vận hành an ninh"],
  ["Máy chạy CI/CD", "ci_cd", "Nền tảng", "runner-07.medicareguard.io", "10.10.6.7", "Ubuntu 24.04", "high", "Hạ tầng"],
  ["Cổng email", "email", "Mạng", "mail.medicareguard.io", "10.10.0.25", "Proofpoint", "high", "Vận hành an ninh"],
  ["Kho sao lưu", "storage", "Dữ liệu", "vault.medicareguard.io", "10.10.7.4", "Veeam", "critical", "Hạ tầng"],
  ["Bộ thu nhận SIEM", "siem", "Bảo mật", "siem-ingest.medicareguard.io", "10.10.8.9", "Elastic 8.15", "high", "Vận hành an ninh"],
  ["Cổng khám từ xa", "gateway", "Lâm sàng", "telehealth.medicareguard.io", "10.10.1.44", "Go 1.23", "high", "Hệ thống lâm sàng"],
  ["Máy phân giải DNS", "dns", "Mạng", "dns.medicareguard.io", "10.10.0.53", "BIND 9.20", "medium", "Kỹ thuật mạng"],
  ["Nhà cung cấp danh tính", "identity", "Bảo mật", "idp.medicareguard.io", "10.10.8.20", "Keycloak 26", "critical", "Vận hành an ninh"],
  ["API di động", "api_gateway", "API", "mobile-api.medicareguard.io", "10.10.1.50", "Node.js 20", "high", "Nền tảng dữ liệu"],
];

const seed = async () => {
  if (reset) {
    logger.warn("Resetting all MedicareGuard data");
    await query(`TRUNCATE TABLE ${TABLES.join(", ")} RESTART IDENTITY CASCADE`);
  } else {
    const existing = await query("SELECT count(*)::int AS total FROM users");
    if (existing.rows[0].total > 0) {
      logger.info("Seed skipped — database already contains data", { users: existing.rows[0].total });
      return;
    }
  }

  const roles = await insert(
    "roles",
    ["name", "description", "permissions", "level"],
    [
      { name: "admin", description: "Quản trị toàn bộ nền tảng và vận hành an ninh", permissions: ["*"], level: 100 },
      { name: "analyst", description: "Chuyên viên SOC — phân loại, ứng phó và báo cáo", permissions: ["read", "write", "alerts:write", "alerts:assign", "threats:write", "threats:enrich", "assets:write", "assets:scan", "incidents:write", "incidents:resolve", "firewall:write", "firewall:apply", "logs:read", "reports:write", "reports:export", "ai:use"], level: 80 },
      { name: "hunter", description: "Chuyên viên săn tìm — kỹ thuật phát hiện và tình báo", permissions: ["read", "write", "threats:write", "threats:enrich", "alerts:write", "assets:scan", "logs:read", "ai:use", "reports:export"], level: 60 },
      { name: "viewer", description: "Bên liên quan chỉ đọc", permissions: ["read", "ai:use"], level: 10 },
    ],
  );
  const roleId = Object.fromEntries(roles.map((role) => [role.name, role.id]));

  const passwordHashes = {
    admin: await bcrypt.hash("Admin@123", config.bcryptRounds),
    analyst: await bcrypt.hash("Analyst@123", config.bcryptRounds),
    hunter: await bcrypt.hash("Hunter@123", config.bcryptRounds),
    viewer: await bcrypt.hash("Viewer@123", config.bcryptRounds),
  };

  const userBlueprints = [
    ["admin@medicareguard.io", "Nguyễn Thị Bích Trâm", "admin", "Vận hành an ninh", "Quản lý SOC"],
    ["analyst@medicareguard.io", "Minh Anh Tran", "analyst", "Vận hành an ninh", "Chuyên viên SOC cấp cao"],
    ["hunter@medicareguard.io", "Duc Huy Le", "hunter", "Vận hành an ninh", "Chuyên viên săn tìm mối đe dọa"],
    ["viewer@medicareguard.io", "Lan Phuong Vo", "viewer", "Tuân thủ", "Cán bộ tuân thủ"],
    ["sarah.chen@medicareguard.io", "Sarah Chen", "analyst", "Hạ tầng", "Kỹ sư an ninh đám mây"],
    ["marcus.weber@medicareguard.io", "Marcus Weber", "analyst", "Kỹ thuật mạng", "Chuyên viên an ninh mạng"],
    ["aisha.rahman@medicareguard.io", "Aisha Rahman", "hunter", "Nền tảng dữ liệu", "Kỹ sư phát hiện"],
    ["daniel.okafor@medicareguard.io", "Daniel Okafor", "analyst", "Hệ thống lâm sàng", "Chuyên viên an ninh lâm sàng"],
    ["yuki.tanaka@medicareguard.io", "Yuki Tanaka", "viewer", "Tài chính", "Chuyên viên rủi ro"],
    ["carlos.mendoza@medicareguard.io", "Carlos Mendoza", "analyst", "Vận hành an ninh", "Chuyên viên ứng phó sự cố"],
    ["elena.petrova@medicareguard.io", "Elena Petrova", "hunter", "Hạ tầng", "Chuyên viên tình báo mối đe dọa"],
    ["james.mitchell@medicareguard.io", "James Mitchell", "viewer", "Vận hành an ninh", "Thực tập sinh SOC"],
  ];
  const users = await insert(
    "users",
    ["email", "password_hash", "full_name", "role_id", "department", "phone", "status", "last_login_at", "mfa_enabled"],
    userBlueprints.map(([email, name, role, department, title], index) => ({
      email,
      password_hash: passwordHashes[role],
      full_name: name,
      role_id: roleId[role],
      department,
      phone: `+84 90 ${int(100, 999)} ${int(1000, 9999)}`,
      status: index === 11 ? "disabled" : "active",
      last_login_at: daysAgo(int(0, 6), 20),
      mfa_enabled: role !== "viewer" ? true : chance(0.5),
    })),
  );
  const userIds = users.map((user) => user.id);
  const analystIds = users.filter((_, index) => index < 10).map((user) => user.id);

  await insert(
    "departments",
    ["name", "code", "manager_id", "description"],
    [
      ["Vận hành an ninh", "SOC", userIds[0], "Giám sát an ninh và ứng phó sự cố 24/7"],
      ["Hạ tầng", "INFRA", userIds[4], "Kỹ thuật đám mây, nền tảng và mạng"],
      ["Hệ thống lâm sàng", "CLIN", userIds[7], "Ứng dụng EHR, PACS và hướng bệnh nhân"],
      ["Kỹ thuật mạng", "NET", userIds[5], "Vận hành vành đai, VPN và tường lửa"],
      ["Tuân thủ", "GRC", userIds[3], "Quản trị, rủi ro và tuân thủ"],
      ["Nền tảng dữ liệu", "DATA", userIds[6], "Phân tích, tích hợp và bảo vệ dữ liệu"],
    ].map(([name, code, manager_id, description]) => ({ name, code, manager_id, description })),
  );

  const assets = await insert(
    "assets",
    ["name", "type", "category", "hostname", "ip_address", "mac_address", "os", "owner_id", "department", "location", "criticality", "status", "risk_score", "tags", "last_seen"],
    ASSET_BLUEPRINTS.map(([name, type, category, hostname, ip, os, criticality, department]) => ({
      name,
      type,
      category,
      hostname,
      ip_address: ip,
      mac_address: `02:42:${int(16, 255).toString(16).padStart(2, "0")}:${int(16, 255).toString(16).padStart(2, "0")}:${int(16, 255).toString(16).padStart(2, "0")}:${int(16, 255).toString(16).padStart(2, "0")}`,
      os,
      owner_id: pick(analystIds),
      department,
      location: pick(["us-east-1", "eu-west-1", "ap-southeast-1", "on-prem-dc1", "on-prem-dc2"]),
      criticality,
      status: chance(0.85) ? "online" : pick(["offline", "maintenance"]),
      risk_score: criticality === "critical" ? int(55, 95) : criticality === "high" ? int(35, 80) : int(15, 55),
      tags: [department.toLowerCase().replace(/\s+/g, "-"), type],
      last_seen: hoursAgo(int(0, 72)),
    })),
  );
  const assetIds = assets.map((asset) => asset.id);

  const threats = await insert(
    "threats",
    ["name", "category", "severity", "status", "source", "source_ip", "country", "country_code", "ioc_type", "ioc_value", "confidence", "risk_score", "description", "mitre_tactic", "mitre_technique", "first_seen", "last_seen", "metadata"],
    Array.from({ length: 70 }).map(() => {
      const [country, code] = pick(COUNTRIES);
      const category = pick(Object.keys(CATEGORY_MITRE));
      const actor = pick(ACTORS);
      const vector = pick(VECTORS);
      const severity = pick(["critical", "critical", "high", "high", "high", "medium", "medium", "low"]);
      const ip = randomIp();
      const iocType = pick(["ip", "domain", "hash", "url"]);
      const iocValue = iocType === "ip" ? ip : iocType === "domain" ? `${actor.toLowerCase().replace(/[^a-z0-9]/g, "")}-${int(10, 99)}.evil-cdn.net` : iocType === "hash" ? require("node:crypto").randomBytes(32).toString("hex") : `https://${ip}/payload/${int(1000, 9999)}`;
      const firstSeen = daysAgo(int(5, 60), 20);
      return {
        name: `${actor} — ${vector}`,
        category,
        severity,
        status: pick(["active", "active", "active", "monitoring", "blocked", "resolved"]),
        source: `hạ tầng ${actor}`,
        source_ip: ip,
        country,
        country_code: code,
        ioc_type: iocType,
        ioc_value: iocValue,
        confidence: int(55, 99),
        risk_score: severity === "critical" ? int(80, 99) : severity === "high" ? int(60, 85) : severity === "medium" ? int(35, 65) : int(10, 40),
        description: `Hoạt động ${CATEGORY_LABELS[category]} do ${actor} thực hiện nhắm vào nền tảng Medicare. Quan sát tại vành đai ${pick(["cổng bệnh nhân", "EHR", "thanh toán", "khám từ xa", "danh tính"])}.`,
        mitre_tactic: CATEGORY_MITRE[category].tactic,
        mitre_technique: CATEGORY_MITRE[category].technique,
        first_seen: firstSeen,
        last_seen: daysAgo(int(0, 8), 23),
        metadata: JSON.stringify({ actor, campaign: `${actor}-${int(100, 999)}`, kill_chain: pick(["reconnaissance", "weaponization", "delivery", "exploitation", "command-and-control", "actions-on-objective"]) }),
      };
    }),
  );
  const threatIds = threats.map((threat) => threat.id);

  const alertTitles = [
    "Phát hiện tín hiệu C2 ra ngoài đáng ngờ",
    "Nhiều lần đăng nhập thất bại rồi thành công",
    "Ghi chú ransomware xuất hiện trên chia sẻ tệp",
    "Rò rỉ dữ liệu tới kho đám mây không xác định",
    "Web shell được tải lên máy chủ ứng dụng",
    "Lệnh PowerShell mã hóa độc hại",
    "Phát hiện đăng nhập di chuyển bất khả thi",
    "WAF chặn nỗ lực SQL injection",
    "Bùng nổ nhồi thông tin xác thực tại điểm đăng nhập",
    "Hoạt động bất thường của tài khoản đặc quyền",
    "EDR chặn nỗ lực di chuyển ngang",
    "Đường hầm DNS tới miền đáng ngờ",
    "Phát hiện tiến trình đào tiền mã hóa trên khối lượng công việc",
    "Email phishing được gửi tới hộp thư điều hành",
    "Phát hiện sử dụng khóa API trái phép",
    "Xuất dữ liệu bất thường từ EHR",
  ];
  const alerts = await insert(
    "alerts",
    ["title", "description", "severity", "status", "source", "source_ip", "country", "country_code", "mitre_tactic", "mitre_technique", "threat_id", "asset_id", "assignee_id", "risk_score", "confidence", "tags", "detected_at", "resolved_at", "metadata"],
    Array.from({ length: 140 }).map(() => {
      const threat = pick(threats);
      const asset = pick(assets);
      const severity = pick(["critical", "high", "high", "high", "medium", "medium", "medium", "low"]);
      const status = pick(["open", "open", "open", "investigating", "investigating", "contained", "resolved", "resolved", "resolved", "false_positive"]);
      const detected = daysAgo(int(0, 10), 23);
      const resolved = ["resolved", "false_positive"].includes(status) ? new Date(detected.getTime() + int(1, 72) * 3600000) : null;
      return {
        title: pick(alertTitles),
        description: `Phát hiện kích hoạt trên ${asset.name} (${asset.ip_address}). Nguồn ${threat.source_ip} được quy cho ${threat.country}. Độ tin cậy tương quan ${int(60, 99)}%.`,
        severity,
        status,
        source: pick(["SIEM", "EDR", "Tường lửa", "IDS", "Cổng email", "CloudTrail", "Động cơ phát hiện bất thường AI"]),
        source_ip: chance(0.85) ? threat.source_ip : randomIp(),
        country: threat.country,
        country_code: threat.country_code,
        mitre_tactic: threat.mitre_tactic,
        mitre_technique: threat.mitre_technique,
        threat_id: threat.id,
        asset_id: asset.id,
        assignee_id: chance(0.8) ? pick(analystIds) : null,
        risk_score: severity === "critical" ? int(80, 99) : severity === "high" ? int(60, 85) : severity === "medium" ? int(35, 65) : int(10, 40),
        confidence: int(55, 99),
        tags: [threat.category.toLowerCase().replace(/\s+/g, "-"), status],
        detected_at: detected,
        resolved_at: resolved,
        metadata: JSON.stringify({ detectionRule: `MG-${int(1000, 9999)}`, assetName: asset.name, threatActor: threat.metadata?.actor || "unknown" }),
      };
    }),
  );

  const incidentTitles = [
    "Nghi ngờ ransomware trên máy chủ tệp lâm sàng",
    "Chiến dịch nhồi thông tin xác thực cổng bệnh nhân",
    "Nỗ lực rò rỉ cơ sở dữ liệu EHR",
    "Tài khoản quản trị bị xâm phạm",
    "Chấp thuận ứng dụng OAuth độc hại",
    "Khai thác thiết bị VPN biên có lỗ hổng",
    "Triển khai web shell trên dịch vụ thanh toán",
    "Truy cập dữ liệu nội bộ bất thường",
    "Gói chuỗi cung ứng bị xâm phạm",
    "Lạm dụng API khám từ xa",
  ];
  const incidents = await insert(
    "incidents",
    ["title", "description", "severity", "status", "priority", "category", "assignee_id", "reporter_id", "incident_key", "sla_due_at", "detected_at", "resolved_at", "root_cause", "impact", "timeline", "metadata"],
    Array.from({ length: 26 }).map((_, index) => {
      const severity = pick(["critical", "critical", "high", "high", "medium", "low"]);
      const status = pick(["open", "investigating", "investigating", "contained", "eradicated", "recovered", "resolved", "resolved", "closed"]);
      const detected = daysAgo(int(0, 20), 20);
      const resolved = ["resolved", "closed"].includes(status) ? new Date(detected.getTime() + int(2, 96) * 3600000) : null;
      const priority = severity === "critical" ? "P1" : severity === "high" ? "P2" : severity === "medium" ? "P3" : "P4";
      const asset = pick(assets);
      return {
        title: pick(incidentTitles),
        description: `Sự cố liên quan đến ${asset.name}. Được SOC MedicareGuard điều tra với quá trình thu thập bằng chứng tự động.`,
        severity,
        status,
        priority,
        category: pick(["malware", "credential-access", "data-exfiltration", "insider-threat", "vulnerability", "network"]),
        assignee_id: pick(analystIds),
        reporter_id: pick(analystIds),
        incident_key: `INC-${new Date(detected).toISOString().slice(0, 10).replace(/-/g, "")}-${String(index + 1).padStart(4, "0")}`,
        sla_due_at: new Date(detected.getTime() + (priority === "P1" ? 4 : priority === "P2" ? 12 : 48) * 3600000),
        detected_at: detected,
        resolved_at: resolved,
        root_cause: resolved ? pick(["Dịch vụ công khai chưa được vá", "Thông tin xác thực đặc quyền bị dùng lại", "Thực thi tệp đính kèm phishing", "Kho lưu trữ cấu hình sai", "Nhà cung cấp bên thứ ba bị xâm phạm"]) : null,
        impact: pick(["Bảo mật dữ liệu bệnh nhân", "Tính sẵn sàng của dịch vụ", "Rủi ro gian lận tài chính", "Rủi ro pháp lý", "Hạn chế — được cô lập sớm"]),
        timeline: JSON.stringify([
          { kind: "detection", message: "Phát hiện tự động do SIEM tạo", actor: "system", created_at: iso(detected) },
          { kind: "triage", message: "Chuyên viên L1 đã xác thực cảnh báo", actor: "analyst@medicareguard.io", created_at: iso(new Date(detected.getTime() + 20 * 60000)) },
          { kind: "containment", message: "Khối lượng công việc bị ảnh hưởng đã được cô lập khỏi môi trường sản xuất", actor: "analyst@medicareguard.io", created_at: iso(new Date(detected.getTime() + 55 * 60000)) },
        ]),
        metadata: JSON.stringify({ assetId: asset.id, assetName: asset.name }),
      };
    }),
  );

  const firewallRules = await insert(
    "firewall_rules",
    ["name", "description", "direction", "action", "protocol", "source_ip", "destination_ip", "source_port", "destination_port", "priority", "enabled", "hit_count", "last_hit_at", "created_by", "metadata"],
    [
      ["Cho phép HTTPS tới cổng bệnh nhân", "Lưu lượng vào công khai cho cổng bệnh nhân", "inbound", "allow", "tcp", "any", "10.10.1.10", "any", "443", 10, true, 184329, hoursAgo(1)],
      ["Từ chối SSH từ Internet", "Chặn SSH từ mạng không tin cậy", "inbound", "deny", "tcp", "any", "any", "any", "22", 5, true, 8432, hoursAgo(2)],
      ["Cho phép VPN từ dải mạng công ty", "Truy cập VPN công ty", "inbound", "allow", "udp", "10.0.0.0/8", "10.10.0.5", "any", "51820", 20, true, 3201, hoursAgo(3)],
      ["Từ chối RDP từ Internet", "Ngăn RDP bị lộ", "inbound", "deny", "tcp", "any", "any", "any", "3389", 5, true, 12980, hoursAgo(1)],
      ["Cho phép truy cập CSDL EHR từ phân mạng ứng dụng", "Tầng ứng dụng tới EHR", "internal", "allow", "tcp", "10.10.1.0/24", "10.10.2.11", "any", "5432", 30, true, 99120, hoursAgo(1)],
      ["Chặn dải IP C2 đã biết", "Chặn ra ngoài dựa trên CTI", "outbound", "deny", "any", "any", "45.146.164.0/24", "any", "any", 8, true, 4421, hoursAgo(4)],
      ["Cho phép DNS tới máy phân giải", "Hạn chế DNS ra ngoài", "outbound", "allow", "udp", "10.0.0.0/8", "10.10.0.53", "any", "53", 25, true, 528391, hoursAgo(1)],
      ["Từ chối SMB ra ngoài", "Ngăn SMB di chuyển ngang", "outbound", "deny", "tcp", "10.0.0.0/8", "any", "any", "445", 15, true, 2301, hoursAgo(6)],
      ["Cho phép thu thập giám sát", "Thu thập Prometheus", "internal", "allow", "tcp", "10.10.8.0/24", "10.0.0.0/8", "any", "9090", 40, true, 129832, hoursAgo(1)],
      ["Chặn nút thoát Tor", "Chính sách ra ngoài", "outbound", "deny", "any", "any", "tor-exit-list", "any", "any", 9, true, 762, hoursAgo(8)],
      ["Cho phép phương tiện khám từ xa", "Cổng phương tiện WebRTC", "inbound", "allow", "udp", "any", "10.10.1.44", "any", "10000-20000", 22, true, 88432, hoursAgo(2)],
      ["Chặn miền C2 của mã độc", "Chặn bằng DNS RPZ", "outbound", "deny", "udp", "10.0.0.0/8", "any", "any", "53", 12, true, 3412, hoursAgo(5)],
    ].map(([name, description, direction, action, protocol, source_ip, destination_ip, source_port, destination_port, priority, enabled, hit_count, last_hit_at, created_by]) => ({
      name, description, direction, action, protocol, source_ip, destination_ip, source_port, destination_port, priority, enabled, hit_count, last_hit_at, created_by: userIds[0], metadata: JSON.stringify({ managed: true }),
    })),
  );

  const activityLevels = ["info", "info", "info", "warn", "error", "debug"];
  const eventTypes = ["auth", "alert", "incident", "firewall", "ai", "system", "asset", "integration"];
  const activityMessages = [
    "Chuyên viên đã phân loại cảnh báo", "Quy tắc tường lửa đã triển khai tới biên", "Trạng thái sự cố đã thay đổi", "Điều tra AI đã hoàn tất",
    "Quét tài sản đã hoàn tất", "Tích hợp SIEM đã đồng bộ", "Phiên người dùng đã bị thu hồi", "Nguồn tình báo mối đe dọa đã làm mới",
    "Báo cáo đã được xuất", "Quy tắc phát hiện đã cập nhật", "Đăng nhập đáng ngờ đã bị chặn", "Nhiệm vụ khắc phục lỗ hổng đã được giao",
  ];
  await insert(
    "activity_logs",
    ["level", "event_type", "actor_id", "actor_email", "source_ip", "user_agent", "resource", "resource_id", "action", "message", "metadata", "created_at"],
    Array.from({ length: 220 }).map(() => {
      const user = pick(users);
      const eventType = pick(eventTypes);
      return {
        level: pick(activityLevels),
        event_type: eventType,
        actor_id: user.id,
        actor_email: user.email,
        source_ip: randomIp(),
        user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0",
        resource: pick(["alerts", "threats", "assets", "incidents", "firewall_rules", "users", "reports"]),
        resource_id: uuid(),
        action: pick(["create", "update", "delete", "login", "logout", "triage", "export", "scan", "block"]),
        message: pick(activityMessages),
        metadata: JSON.stringify({ eventType }),
        created_at: daysAgo(int(0, 9), 23),
      };
    }),
  );

  const automationWorkflows = [
    ["ransomware-containment", "Cô lập & Phục hồi Ransomware"],
    ["phishing-triage", "Phân tích & Xử lý Phishing"],
    ["vulnerability-sla", "Leo thang SLA Lỗ hổng"],
    ["compliance-evidence", "Bằng chứng Tuân thủ Liên tục"],
  ];
  await insert(
    "activity_logs",
    ["level", "event_type", "actor_id", "actor_email", "source_ip", "user_agent", "resource", "resource_id", "action", "message", "metadata", "created_at"],
    Array.from({ length: 32 }).map((_, index) => {
      const [slug, workflowName] = pick(automationWorkflows);
      const status = index % 13 === 0 ? "failed" : pick(["success", "dispatched", "success", "queued"]);
      const durationMs = int(720, 4200);
      return {
        level: status === "failed" ? "error" : status === "queued" ? "warn" : "info",
        event_type: "automation",
        actor_id: userIds[0],
        actor_email: pick([users[0].email, "automation@medicareguard.io"]),
        source_ip: randomIp(),
        user_agent: "n8n/2.41.5",
        resource: "automation_workflow",
        resource_id: slug,
        action: "run",
        message: status === "queued" ? `Workflow queued (n8n offline): ${workflowName}` : `Workflow dispatched to n8n: ${workflowName}`,
        metadata: JSON.stringify({ executionId: uuid(), workflowId: slug, workflowName, status, mode: pick(["manual", "webhook", "schedule"]), durationMs, nodeCount: 30 }),
        created_at: daysAgo(int(0, 9), 23),
      };
    }),
  );

  await insert(
    "audit_logs",
    ["actor_id", "actor_email", "action", "resource", "resource_id", "ip_address", "user_agent", "details", "created_at"],
    Array.from({ length: 80 }).map(() => {
      const user = pick(users);
      return {
        actor_id: user.id,
        actor_email: user.email,
        action: pick(["create", "update", "delete", "login", "export", "permissions_change"]),
        resource: pick(["users", "roles", "alerts", "assets", "incidents", "reports", "settings"]),
        resource_id: uuid(),
        ip_address: randomIp(),
        user_agent: "MedicareGuard-Console/1.0",
        details: JSON.stringify({ source: "console" }),
        created_at: daysAgo(int(0, 15), 23),
      };
    }),
  );

  await insert(
    "vulnerabilities",
    ["title", "severity", "status", "cvss_score", "cve_id", "asset_id", "description"],
    [
      ["Tràn bộ đệm OpenSSL trong trình xử lý TLS", "critical", "open", 9.8, "CVE-2024-6119"],
      ["Duyệt đường dẫn Apache trong reverse proxy", "critical", "open", 9.1, "CVE-2024-38476"],
      ["Leo thang đặc quyền kubelet Kubernetes", "high", "open", 8.1, "CVE-2024-5321"],
      ["Thực thi mã từ xa qua tiện ích mở rộng PostgreSQL", "critical", "open", 9.2, "CVE-2024-7348"],
      ["Tràn heap SSL VPN FortiOS", "critical", "open", 9.8, "CVE-2024-21762"],
      ["Chuyển hướng mở Keycloak", "medium", "open", 5.4, "CVE-2024-8698"],
      ["Thực thi mã từ xa Log4j", "critical", "open", 10.0, "CVE-2021-44228"],
      ["Leo thang đặc quyền SMB Windows", "high", "in_progress", 8.8, "CVE-2024-38080"],
      ["Rò rỉ bộ nhớ HTTP/3 Nginx", "medium", "open", 6.1, "CVE-2024-31079"],
      ["Bỏ qua xác thực MySQL", "high", "resolved", 7.5, "CVE-2024-20960"],
      ["Rò rỉ thông tin Elasticsearch", "medium", "open", 6.5, "CVE-2024-5290"],
      ["Buôn lậu yêu cầu HTTP Node.js", "high", "open", 7.2, "CVE-2024-22019"],
      ["Thoát overlayFS Docker", "critical", "in_progress", 9.3, "CVE-2024-21626"],
      ["Thực thi mã từ xa bản sao lưu Veeam", "critical", "open", 9.8, "CVE-2023-27532"],
      ["Từ chối dịch vụ Go crypto/tls", "medium", "resolved", 5.9, "CVE-2024-24790"],
      ["Nhầm lẫn kiểu V8 Chromium", "high", "open", 8.8, "CVE-2024-4947"],
      ["Leo thang nhân macOS Apple", "high", "open", 7.8, "CVE-2024-27822"],
      ["Đầu độc bộ nhớ đệm DNS BIND9", "high", "open", 7.5, "CVE-2024-1737"],
      ["Chèn mã PHP-FPM", "critical", "open", 9.8, "CVE-2024-4577"],
      ["Truy cập Redis không xác thực", "high", "in_progress", 8.2, "CVE-2024-31449"],
    ].map(([title, severity, status, cvss_score, cve_id, description], index) => ({
      title, severity, status, cvss_score, cve_id, description, asset_id: assetIds[index % assetIds.length],
    })),
  );

  await insert(
    "playbooks",
    ["name", "category", "status", "description", "steps"],
    [
      ["Cô lập ransomware", "ransomware", "active", "Cô lập, bảo toàn bằng chứng, khôi phục từ bản sao lưu", Array.from({ length: 6 }).map((_, i) => ({ order: i + 1, title: ["Phát hiện", "Cô lập", "Bảo toàn", "Loại bỏ", "Phục hồi", "Rà soát"][i] }))],
      ["Ứng phó phishing", "phishing", "active", "Phân loại phishing được báo cáo và dọn hộp thư", [{ order: 1, title: "Xác thực tiêu đề" }, { order: 2, title: "Dọn thư" }, { order: 3, title: "Đặt lại thông tin xác thực" }]],
      ["Ứng phó rò rỉ dữ liệu", "exfiltration", "active", "Ngăn chặn luồng ra và xác định phạm vi dữ liệu bị lộ", [{ order: 1, title: "Chặn luồng ra" }, { order: 2, title: "Xác định dữ liệu" }, { order: 3, title: "Thông báo bộ phận riêng tư" }]],
      ["Tài khoản bị xâm phạm", "identity", "active", "Cô lập và phục hồi danh tính bị xâm phạm", [{ order: 1, title: "Thu hồi phiên" }, { order: 2, title: "Đặt lại MFA" }, { order: 3, title: "Rà soát hoạt động" }]],
      ["Phân loại mã độc", "malware", "active", "Phân tích và loại bỏ mã độc", [{ order: 1, title: "Thu thập mẫu" }, { order: 2, title: "Kích hoạt trong sandbox" }, { order: 3, title: "Loại bỏ cơ chế duy trì" }]],
      ["Giảm thiểu DDoS", "availability", "active", "Kích hoạt lọc lưu lượng và giới hạn tốc độ", [{ order: 1, title: "Bật lọc lưu lượng" }, { order: 2, title: "Giới hạn tốc độ" }, { order: 3, title: "Thông báo các bên liên quan" }]],
    ].map(([name, category, status, description, steps]) => ({ name, category, status, description, steps: JSON.stringify(steps) })),
  );

  await insert(
    "detection_rules",
    ["name", "rule_type", "severity", "status", "expression", "description", "mitre_tactic"],
    [
      ["Thực thi PowerShell mã hóa", "sigma", "high", "active", "Image|endswith: '\\powershell.exe' AND CommandLine|contains: '-enc'", "Phát hiện PowerShell mã hóa", "TA0002 Execution"],
      ["Dò mật khẩu thành công", "sigma", "high", "active", "failed_logins > 10 AND success_within: 5m", "Truy cập thông tin xác thực rồi thành công", "TA0006 Credential Access"],
      ["Tín hiệu C2 dao động", "kql", "critical", "active", "network_bytes | summarize by dst | where jitter > 0.2", "Phát hiện tín hiệu định kỳ", "TA0011 Command and Control"],
      ["Đổi đuôi tệp ransomware", "yara", "critical", "active", "$ext = .locked or .encrypted", "Đổi tên tệp hàng loạt", "TA0040 Impact"],
      ["Di chuyển bất khả thi", "kql", "medium", "active", "geo_distance(login1, login2) / elapsed > 900", "Bất thường danh tính", "TA0001 Initial Access"],
      ["Ghi web shell", "sigma", "critical", "active", "file_write | where path contains 'wwwroot' and ext in (php,jsp,aspx)", "Phát hiện web shell được ghi", "TA0003 Persistence"],
      ["Đường hầm DNS", "kql", "high", "active", "dns_queries | where length(subdomain) > 40", "Rò rỉ qua DNS", "TA0010 Exfiltration"],
      ["Truy cập LSASS", "sigma", "high", "active", "target_image: lsass.exe AND access: 0x1010", "Trích xuất thông tin xác thực", "TA0006 Credential Access"],
      ["Kho S3 công khai", "kql", "medium", "testing", "storage_acl | where public == true", "Cấu hình đám mây sai", "TA0009 Collection"],
      ["Chấp thuận OAuth đáng ngờ", "kql", "high", "active", "oauth_grant | where scopes contains 'Mail.Read' and app_age < 7d", "Phishing qua chấp thuận", "TA0001 Initial Access"],
      ["Tiến trình đào tiền mã hóa", "sigma", "medium", "active", "process | where cmdline contains 'xmrig'", "Đào tiền mã hóa", "TA0040 Impact"],
      ["Ngưỡng quét cổng", "kql", "low", "active", "connections | summarize dcount(dst_port) by src | where > 100", "Trinh sát", "TA0007 Discovery"],
    ].map(([name, rule_type, severity, status, expression, description, mitre_tactic]) => ({ name, rule_type, severity, status, expression, description, mitre_tactic })),
  );

  await insert(
    "threat_intel",
    ["indicator", "indicator_type", "threat_actor", "confidence", "severity", "source", "country", "last_seen"],
    Array.from({ length: 45 }).map(() => {
      const [country] = pick(COUNTRIES);
      const type = pick(["ip", "domain", "hash", "url"]);
      const actor = pick(ACTORS);
      return {
        indicator: type === "ip" ? randomIp() : type === "domain" ? `${actor.toLowerCase().replace(/[^a-z0-9]/g, "")}${int(10, 99)}.badhost.io` : type === "hash" ? require("node:crypto").randomBytes(32).toString("hex") : `http://${randomIp()}/c2`,
        indicator_type: type,
        threat_actor: actor,
        confidence: int(50, 99),
        severity: pick(["critical", "high", "medium", "low"]),
        source: pick(["AlienVault OTX", "MISP", "CrowdStrike", "Recorded Future", "AbuseCH", "Internal CTI"]),
        country,
        last_seen: daysAgo(int(0, 13), 23),
      };
    }),
  );

  await insert(
    "cases",
    ["title", "status", "severity", "owner_id", "incident_id", "summary"],
    Array.from({ length: 18 }).map((_, index) => ({
      title: `Investigation · ${pick(incidentTitles)}`,
      status: pick(["open", "investigating", "pending_evidence", "closed"]),
      severity: pick(["critical", "high", "medium", "low"]),
      owner_id: pick(analystIds),
      incident_id: incidents[index % incidents.length].id,
      summary: "Hồ sơ được mở để tương quan dữ liệu đo từ xa và bảo toàn bằng chứng trên các hệ thống bị ảnh hưởng.",
    })),
  );

  await insert(
    "remediations",
    ["title", "status", "priority", "owner_id", "asset_id", "due_at", "completed_at", "description"],
    Array.from({ length: 20 }).map(() => ({
      title: pick(["Vá OpenSSL trên các nút biên", "Bật MFA cho tài khoản dịch vụ", "Xoay vòng khóa API bị lộ", "Hạn chế SMB ra ngoài", "Xây dựng lại máy chạy bị xâm phạm", "Xóa tài khoản quản trị cũ"]),
      status: pick(["pending", "in_progress", "completed", "blocked"]),
      priority: pick(["critical", "high", "medium", "low"]),
      owner_id: pick(userIds),
      asset_id: pick(assetIds),
      due_at: daysAgo(-int(1, 20)),
      completed_at: chance(0.4) ? daysAgo(int(0, 5)) : null,
      description: "Nhiệm vụ khắc phục được tạo từ phát hiện lỗ hổng và sự cố.",
    })),
  );

  const scans = await insert(
    "scans",
    ["name", "type", "status", "target", "agent_id", "started_at", "completed_at", "findings_count"],
    Array.from({ length: 12 }).map(() => {
      const asset = pick(assets);
      const completed = chance(0.7);
      return {
        name: `Quét ${pick(["hàng tuần", "theo yêu cầu", "tuân thủ", "bề mặt tấn công bên ngoài"])} · ${asset.name}`,
        type: pick(["vulnerability", "configuration", "malware", "external"]),
        status: completed ? "completed" : pick(["queued", "running"]),
        target: asset.ip_address,
        started_at: daysAgo(int(0, 10)),
        completed_at: completed ? daysAgo(int(0, 9)) : null,
        findings_count: int(0, 14),
      };
    }),
  );

  await insert(
    "findings",
    ["title", "severity", "status", "scan_id", "asset_id", "description", "remediation"],
    Array.from({ length: 26 }).map((_, index) => ({
      title: pick(["Bộ mã TLS lỗi thời", "Bật FTP ẩn danh", "Tắt ký SMB", "Điểm cuối gỡ lỗi bị lộ", "Cấu hình SSH yếu", "Có CVE chưa vá", "Phát hiện thông tin xác thực mặc định"]),
      severity: pick(["critical", "high", "medium", "low"]),
      status: pick(["open", "in_progress", "resolved", "accepted_risk"]),
      scan_id: scans[index % scans.length].id,
      asset_id: pick(assetIds),
      description: "Máy quét phát hiện điểm yếu cấu hình hoặc cấp bản vá trên tài sản mục tiêu.",
      remediation: "Áp dụng bản vá nhà cung cấp, tăng cường cấu hình và quét lại để xác minh.",
    })),
  );

  await insert(
    "monitors",
    ["name", "type", "target", "status", "interval_seconds", "last_checked_at", "uptime_percent"],
    [
      ["Thời gian hoạt động cổng bệnh nhân", "uptime", "https://portal.medicareguard.io", "up", 60, hoursAgo(0), 99.99],
      ["Sức khỏe API EHR", "api", "https://api.medicareguard.io/health", "up", 30, hoursAgo(0), 99.97],
      ["Độ trễ thu nhận SIEM", "metric", "siem-ingest", "degraded", 60, hoursAgo(0), 98.32],
      ["Độ trễ cổng VPN", "synthetic", "vpn.medicareguard.io", "up", 60, hoursAgo(0), 99.91],
      ["Tác vụ sao lưu thành công", "job", "vault.medicareguard.io", "up", 3600, hoursAgo(2), 100],
      ["Nhà cung cấp danh tính", "api", "https://idp.medicareguard.io", "up", 30, hoursAgo(0), 99.99],
      ["Phương tiện khám từ xa", "synthetic", "telehealth.medicareguard.io", "up", 60, hoursAgo(0), 99.84],
      ["Phân giải DNS", "dns", "dns.medicareguard.io", "up", 30, hoursAgo(0), 99.95],
    ].map(([name, type, target, status, interval_seconds, last_checked_at, uptime_percent]) => ({ name, type, target, status, interval_seconds, last_checked_at, uptime_percent })),
  );

  await insert(
    "agents",
    ["name", "hostname", "ip_address", "os", "version", "status", "last_heartbeat"],
    ASSET_BLUEPRINTS.slice(0, 12).map(([name, , , hostname, ip, os]) => ({
      name: `EDR · ${name}`,
      hostname,
      ip_address: ip,
      os,
      version: "7.4.2",
      status: chance(0.85) ? "online" : pick(["offline", "degraded"]),
      last_heartbeat: hoursAgo(int(0, 12)),
    })),
  );

  await insert(
    "devices",
    ["name", "type", "hostname", "ip_address", "os", "owner_id", "status", "compliance_status", "last_seen"],
    Array.from({ length: 24 }).map((_, index) => ({
      name: `${pick(["MacBook", "ThinkPad", "iPhone", "iPad", "Windows", "IoT"])} · ${pick(["Lâm sàng", "SOC", "Tài chính", "Điều dưỡng", "Quản trị"])} ${index + 1}`,
      type: pick(["workstation", "laptop", "mobile", "tablet", "medical_iot"]),
      hostname: `mg-device-${String(index + 1).padStart(3, "0")}`,
      ip_address: `10.30.${int(1, 20)}.${int(2, 250)}`,
      os: pick(["macOS 15", "Windows 11", "iOS 18", "Ubuntu 24.04", "Android 15"]),
      owner_id: pick(userIds),
      status: chance(0.8) ? "online" : "offline",
      compliance_status: pick(["compliant", "compliant", "compliant", "at_risk", "non_compliant"]),
      last_seen: hoursAgo(int(0, 48)),
    })),
  );

  await insert(
    "network_flows",
    ["src_ip", "dst_ip", "src_port", "dst_port", "protocol", "bytes", "packets", "action", "verdict", "recorded_at"],
    Array.from({ length: 80 }).map(() => ({
      src_ip: chance(0.5) ? randomIp() : `10.10.${int(1, 8)}.${int(2, 250)}`,
      dst_ip: chance(0.7) ? `10.10.${int(1, 8)}.${int(2, 250)}` : randomIp(),
      src_port: int(1024, 65535),
      dst_port: pick([80, 443, 22, 3389, 53, 5432, 8080, 9090]),
      protocol: pick(["tcp", "udp", "icmp"]),
      bytes: int(500, 5_000_000),
      packets: int(1, 5000),
      action: pick(["allow", "allow", "allow", "deny"]),
      verdict: pick(["benign", "benign", "benign", "suspicious", "malicious"]),
      recorded_at: hoursAgo(int(0, 72)),
    })),
  );

  await insert(
    "data_sources",
    ["name", "type", "status", "endpoint", "last_ingest_at", "events_count"],
    [
      ["CloudTrail", "cloud", "connected", "s3://medicareguard-logs/cloudtrail", hoursAgo(0), 18429302],
      ["Tường lửa Palo Alto", "syslog", "connected", "udp://10.10.0.1:514", hoursAgo(0), 9283742],
      ["CrowdStrike Falcon", "edr", "connected", "https://api.crowdstrike.com", hoursAgo(0), 4829103],
      ["Kiểm toán Office 365", "saas", "connected", "https://manage.office.com", hoursAgo(1), 2139841],
      ["Kiểm toán Kubernetes", "container", "connected", "https://eks-prod", hoursAgo(0), 3829103],
      ["IoT lâm sàng", "iot", "degraded", "mqtt://iot-broker", hoursAgo(3), 712830],
      ["Sao lưu Veeam", "backup", "connected", "https://vault.medicareguard.io", hoursAgo(2), 19283],
      ["Nhật ký DNS", "dns", "connected", "udp://10.10.0.53:53", hoursAgo(0), 12093842],
    ].map(([name, type, status, endpoint, last_ingest_at, events_count]) => ({ name, type, status, endpoint, last_ingest_at, events_count })),
  );

  await insert(
    "email_events",
    ["subject", "sender", "recipient", "verdict", "severity", "status", "received_at"],
    Array.from({ length: 35 }).map(() => ({
      subject: pick(["Hóa đơn quá hạn — cần xử lý", "Thông báo hết hạn mật khẩu", "Tài liệu chia sẻ: patient_records.xlsx", "Cập nhật đăng ký phúc lợi", "Cảnh báo bảo mật: đăng nhập mới", "Xác nhận thay đổi bảng lương"]),
      sender: pick(["billing@medicare-secure.co", "it-support@medicareguard.io", "no-reply@patient-portal.net", "hr@medicareguard.io", "cfo@medicareguard.io"]),
      recipient: pick(["analyst@medicareguard.io", "viewer@medicareguard.io", "finance@medicareguard.io", "nursing@medicareguard.io"]),
      verdict: pick(["clean", "clean", "clean", "phishing", "malware", "spam", "bec"]),
      severity: pick(["low", "low", "medium", "high", "critical"]),
      status: pick(["delivered", "quarantined", "blocked", "reported"]),
      received_at: hoursAgo(int(0, 240)),
    })),
  );

  await insert(
    "phishing_campaigns",
    ["name", "status", "target_group", "started_at", "completed_at", "sent_count", "clicked_count", "reported_count"],
    [
      ["Nâng cao nhận thức thông tin xác thực Q4", "completed", "Toàn bộ nhân viên", daysAgo(20), daysAgo(13), 820, 61, 42],
      ["Diễn tập phishing lâm sàng", "completed", "Hệ thống lâm sàng", daysAgo(35), daysAgo(28), 210, 12, 18],
      ["Mô phỏng gian lận hóa đơn", "running", "Tài chính", daysAgo(2), null, 95, 7, 3],
      ["Mô phỏng mệt mỏi MFA", "draft", "Infrastructure", null, null, 0, 0, 0],
      ["Thử nghiệm whale nhắm điều hành", "scheduled", "Ban lãnh đạo", daysAgo(-3), null, 0, 0, 0],
    ].map(([name, status, target_group, started_at, completed_at, sent_count, clicked_count, reported_count]) => ({ name, status, target_group, started_at, completed_at, sent_count, clicked_count, reported_count })),
  );

  await insert(
    "compliance_controls",
    ["framework", "control_id", "title", "status", "score", "owner_id", "description"],
    [
      ["NIST 800-53", "AC-2", "Quản lý tài khoản", "compliant", 92, userIds[0], "Kiểm soát tự động cho nhân viên mới/chuyển bộ phận/nghỉ việc"],
      ["NIST 800-53", "AU-6", "Rà soát và báo cáo kiểm toán", "in_progress", 78, userIds[1], "Rà soát kiểm toán hàng ngày với tóm tắt AI"],
      ["NIST 800-53", "IR-4", "Xử lý sự cố", "compliant", 88, userIds[0], "Kế hoạch IR và cẩm nang SOAR đã được ghi nhận"],
      ["NIST 800-53", "SC-7", "Bảo vệ vành đai", "compliant", 90, userIds[5], "Vành đai phân đoạn với chính sách từ chối mặc định"],
      ["ISO 27001", "A.5.15", "Kiểm soát truy cập", "compliant", 89, userIds[0], "RBAC với rà soát hàng quý"],
      ["ISO 27001", "A.8.8", "Quản lý lỗ hổng kỹ thuật", "in_progress", 74, userIds[4], "Quét hàng tuần và theo dõi SLA"],
      ["ISO 27001", "A.5.24", "Lập kế hoạch quản lý sự cố", "compliant", 86, userIds[1], "Khung ứng phó sự cố"],
      ["ISO 27001", "A.8.16", "Hoạt động giám sát", "compliant", 93, userIds[6], "Giám sát SOC 24/7"],
      ["HIPAA", "164.312(a)(1)", "Kiểm soát truy cập", "compliant", 91, userIds[3], "Nhận diện người dùng duy nhất và truy cập khẩn cấp"],
      ["HIPAA", "164.312(b)", "Kiểm soát kiểm toán", "compliant", 87, userIds[3], "Ghi nhật ký kiểm toán trên các hệ thống ePHI"],
      ["HIPAA", "164.308(a)(6)", "Quy trình sự cố an ninh", "in_progress", 79, userIds[0], "Quy trình sự cố đang được rà soát"],
      ["HIPAA", "164.312(e)(1)", "Bảo mật truyền tải", "compliant", 94, userIds[5], "TLS mọi nơi, mTLS nội bộ"],
      ["PCI DSS", "1.3", "Kiểm soát truy cập mạng", "compliant", 85, userIds[5], "Phân đoạn CDE"],
      ["PCI DSS", "10.2", "Ghi nhật ký kiểm toán", "compliant", 88, userIds[1], "Ghi nhật ký tập trung bất biến"],
      ["PCI DSS", "6.4", "Bảo vệ web hướng công chúng", "in_progress", 72, userIds[4], "Đang tinh chỉnh WAF"],
      ["PCI DSS", "11.3", "Kiểm thử xâm nhập", "compliant", 83, userIds[0], "Kiểm thử hàng năm và sau thay đổi"],
    ].map(([framework, control_id, title, status, score, owner_id, description]) => ({ framework, control_id, title, status, score, owner_id, description })),
  );

  await insert(
    "risk_assessments",
    ["title", "status", "score", "asset_id", "owner_id", "methodology", "description"],
    Array.from({ length: 14 }).map(() => ({
      title: `Đánh giá rủi ro · ${pick(assets).name}`,
      status: pick(["draft", "in_review", "approved", "expired"]),
      score: int(20, 95),
      asset_id: pick(assetIds),
      owner_id: pick(userIds),
      methodology: pick(["NIST 800-30", "FAIR", "OCTAVE", "ISO 27005"]),
      description: "Đánh giá mức phơi nhiễm về bảo mật, toàn vẹn và sẵn sàng cho tài sản trong phạm vi.",
    })),
  );

  await insert(
    "policies",
    ["name", "category", "status", "version", "description", "content", "effective_date"],
    [
      ["Chính sách sử dụng chấp nhận được", "workforce", "published", "3.1", "Quy tắc sử dụng hệ thống Medicare", "Nhân viên phải sử dụng tài sản công ty có trách nhiệm và báo cáo sự cố."],
      ["Chính sách ứng phó sự cố", "security", "published", "2.4", "Phân loại và ứng phó sự cố", "Mọi sự cố được SOC phân loại trong vòng 15 phút."],
      ["Chính sách kiểm soát truy cập", "security", "published", "4.0", "Đặc quyền tối thiểu và MFA", "Truy cập đặc quyền yêu cầu MFA và tái chứng nhận hàng quý."],
      ["Chính sách lưu trữ dữ liệu", "privacy", "in_review", "1.8", "Lưu trữ dữ liệu bệnh nhân và an ninh", "Nhật ký an ninh được lưu 12 tháng, ePHI theo HIPAA."],
      ["Chính sách quản lý lỗ hổng", "security", "published", "2.0", "SLA khắc phục theo mức độ", "Lỗ hổng nghiêm trọng được khắc phục trong 72 giờ."],
      ["Chính sách rủi ro bên thứ ba", "governance", "published", "1.5", "Thẩm định nhà cung cấp", "Nhà cung cấp cấp 1 được rà soát hàng năm."],
      ["Chính sách sao lưu và phục hồi", "resilience", "published", "3.3", "Kiểm thử sao lưu và phục hồi", "Bản sao lưu được kiểm thử hàng quý với RTO/RPO được ghi nhận."],
      ["Chính sách sử dụng AI", "governance", "draft", "0.9", "Sử dụng AI có trách nhiệm trong SOC", "Đầu ra AI cần con người xác thực trước khi hành động."],
    ].map(([name, category, status, version, description, content]) => ({ name, category, status, version, description, content, effective_date: daysAgo(-int(30, 200)) })),
  );

  await insert(
    "vendors",
    ["name", "category", "risk_level", "status", "contact_email", "website", "description"],
    [
      ["CrowdStrike", "EDR", "low", "active", "security@crowdstrike.com", "https://crowdstrike.com", "Phát hiện và ứng phó điểm cuối"],
      ["Palo Alto Networks", "Mạng", "low", "active", "support@paloaltonetworks.com", "https://paloaltonetworks.com", "Tường lửa vành đai"],
      ["Veeam", "Sao lưu", "medium", "active", "support@veeam.com", "https://veeam.com", "Sao lưu và phục hồi"],
      ["Elastic", "SIEM", "low", "active", "support@elastic.co", "https://elastic.co", "Nền tảng phân tích an ninh"],
      ["Okta", "Danh tính", "low", "active", "support@okta.com", "https://okta.com", "Nhà cung cấp danh tính"],
      ["Cloudflare", "CDN/WAF", "low", "active", "support@cloudflare.com", "https://cloudflare.com", "Bảo vệ biên"],
      ["Clinical Data Systems", "EHR", "high", "under_review", "security@clinicaldata.example", "https://clinicaldata.example", "Nhà cung cấp tích hợp EHR"],
      ["Acme Billing", "Tài chính", "medium", "active", "security@acmebilling.example", "https://acmebilling.example", "Bộ xử lý thanh toán"],
      ["MedDevice Corp", "IoT", "high", "active", "security@meddevice.example", "https://meddevice.example", "Thiết bị IoT y tế"],
      ["SecureMail", "Email", "medium", "active", "security@securemail.example", "https://securemail.example", "Cổng bảo mật email"],
    ].map(([name, category, risk_level, status, contact_email, website, description]) => ({ name, category, risk_level, status, contact_email, website, description })),
  );

  await insert(
    "tickets",
    ["subject", "status", "priority", "requester_id", "assignee_id", "description"],
    Array.from({ length: 22 }).map(() => ({
      subject: pick(["Yêu cầu đặt lại MFA", "Báo cáo email đáng ngờ", "Yêu cầu truy cập SIEM", "Vấn đề tuân thủ máy tính xách tay", "Yêu cầu thay đổi tường lửa", "Câu hỏi về mô phỏng phishing", "Đặt lại mật khẩu", "Tiếp nhận nhân viên mới"]),
      status: pick(["open", "in_progress", "waiting", "resolved", "closed"]),
      priority: pick(["low", "medium", "high", "critical"]),
      requester_id: pick(userIds),
      assignee_id: pick(analystIds),
      description: "Yêu cầu dịch vụ được tạo qua cổng nhân viên MedicareGuard.",
    })),
  );

  await insert(
    "knowledge_base",
    ["title", "category", "status", "content", "author_id", "tags"],
    [
      ["Cách phân loại cảnh báo nghiêm trọng", "runbook", "published", "Xác thực, làm giàu, ngăn chặn, leo thang trong vòng 15 phút.", userIds[1], ["triage", "alerts"]],
      ["Danh sách kiểm tra cô lập ransomware", "runbook", "published", "Cô lập máy chủ, bảo toàn bằng chứng, vô hiệu hóa tài khoản, khôi phục từ bản sao lưu.", userIds[0], ["ransomware", "incident-response"]],
      ["Triển khai quy tắc tường lửa", "process", "published", "Rà soát đồng nghiệp, phiếu thay đổi, triển khai tới biên, xác thực số lượt khớp.", userIds[5], ["firewall", "change"]],
      ["Hướng dẫn phân tích phishing", "runbook", "published", "Kiểm tra tiêu đề, kích hoạt URL trong sandbox, dọn hộp thư, đặt lại thông tin xác thực.", userIds[2], ["phishing", "email"]],
      ["Thông báo vi phạm HIPAA", "compliance", "published", "Đánh giá rủi ro, thông báo bộ phận riêng tư trong 24 giờ, ghi nhận quyết định.", userIds[3], ["hipaa", "privacy"]],
      ["Sử dụng chuyên viên AI an toàn", "guide", "published", "Đầu ra AI chỉ mang tính tham khảo; xác nhận bằng dữ liệu đo từ xa trước khi hành động.", userIds[0], ["ai", "governance"]],
      ["Ma trận SLA lỗ hổng", "process", "published", "Nghiêm trọng 72 giờ, cao 14 ngày, trung bình 30 ngày, thấp 90 ngày.", userIds[4], ["vulnerability", "sla"]],
      ["Ma trận mức độ sự cố", "guide", "published", "P1 tác động kinh doanh nghiêm trọng, P2 cao, P3 trung bình, P4 thấp.", userIds[0], ["incident", "severity"]],
      ["Điều tra CloudTrail", "runbook", "published", "Xác định phạm vi theo principal, eventName và IP nguồn; tương quan với GuardDuty.", userIds[6], ["aws", "cloud"]],
      ["Vận hành tự động hóa n8n", "process", "published", "Giám sát lần chạy thất bại, thử lại idempotent, rà soát nhật ký kiểm toán.", userIds[0], ["n8n", "automation"]],
    ].map(([title, category, status, content, author_id, tags]) => ({ title, category, status, content, author_id, tags })),
  );

  await insert(
    "tags",
    ["name", "color", "description"],
    [
      ["critical", "#ff4d6d", "Mức độ hoặc tác động nghiêm trọng"],
      ["ransomware", "#f97316", "Hoạt động liên quan ransomware"],
      ["phishing", "#eab308", "Phishing và kỹ thuật xã hội"],
      ["patient-data", "#8b5cf6", "Liên quan ePHI"],
      ["insider", "#ec4899", "Mối đe dọa nội bộ"],
      ["cloud", "#06b6d4", "Hạ tầng đám mây"],
      ["network", "#3b82f6", "Dữ liệu đo từ xa mạng"],
      ["identity", "#22c55e", "Danh tính và truy cập"],
      ["compliance", "#14b8a6", "Liên quan quy định"],
      ["automated", "#a855f7", "Được tạo bởi tự động hóa"],
      ["hunting", "#f59e0b", "Giả thuyết săn tìm mối đe dọa"],
      ["regression", "#64748b", "Kiểm thử hồi quy phát hiện"],
    ].map(([name, color, description]) => ({ name, color, description })),
  );

  await insert(
    "settings",
    ["key", "value", "scope", "description", "updated_by"],
    [
      ["soc.name", JSON.stringify("MedicareGuard SOC"), "global", "Tên hiển thị", userIds[0]],
      ["soc.retention_days", JSON.stringify(365), "global", "Lưu trữ dữ liệu an ninh", userIds[0]],
      ["alerts.auto_escalate_critical", JSON.stringify(true), "alerts", "Tự động tạo sự cố cho cảnh báo nghiêm trọng", userIds[0]],
      ["ai.enabled", JSON.stringify(true), "ai", "Bật chuyên viên AI", userIds[0]],
      ["ai.model", JSON.stringify("medicareguard-analyst"), "ai", "Mô hình AI mặc định", userIds[0]],
      ["firewall.auto_block", JSON.stringify(true), "firewall", "Tự động chặn IP mối đe dọa nghiêm trọng", userIds[0]],
      ["report.schedule.weekly", JSON.stringify({ template: "executive", cadence: "weekly", recipients: ["ciso@medicareguard.io"], format: "pdf", enabled: true }), "reporting", "Báo cáo điều hành hàng tuần", userIds[0]],
      ["notifications.email", JSON.stringify(true), "notifications", "Bật thông báo email", userIds[0]],
      ["mfa.enforced", JSON.stringify(true), "identity", "Bắt buộc MFA cho vai trò đặc quyền", userIds[0]],
      ["n8n.base_url", JSON.stringify("http://n8n:5678"), "integrations", "URL cơ sở tự động hóa", userIds[0]],
    ].map(([key, value, scope, description, updated_by]) => ({ key, value, scope, description, updated_by })),
  );

  await insert(
    "comments",
    ["resource", "resource_id", "author_id", "body"],
    Array.from({ length: 36 }).map((_, index) => {
      const targetAlert = alerts[index % alerts.length];
      const targetIncident = incidents[index % incidents.length];
      const useAlert = index % 2 === 0;
      return {
        resource: useAlert ? "alerts" : "incidents",
        resource_id: useAlert ? targetAlert.id : targetIncident.id,
        author_id: pick(analystIds),
        body: pick([
          "Đã tương quan với nguồn CTI mới nhất — cùng hạ tầng với chiến dịch trước.",
          "Đã áp dụng cô lập trên khối lượng công việc bị ảnh hưởng. Đang giám sát tái nhiễm.",
          "Chủ sở hữu tài sản đã được thông báo và lịch vá trong SLA.",
          "Đã xác nhận dương tính giả sau khi rà soát cây tiến trình EDR.",
          "Chuyên viên AI đề xuất chặn IP nguồn tại tường lửa biên.",
          "Bằng chứng đã được đính kèm vào hồ sơ và dòng thời gian đã cập nhật.",
        ]),
      };
    }),
  );

  const reports = await insert(
    "reports",
    ["name", "type", "status", "format", "period_start", "period_end", "created_by", "summary", "metadata"],
    Array.from({ length: 16 }).map(() => {
      const type = pick(["executive", "threat", "incident", "compliance", "vulnerability", "firewall"]);
      return {
        name: `Báo cáo ${({ executive: "điều hành", threat: "mối đe dọa", incident: "sự cố", compliance: "tuân thủ", vulnerability: "lỗ hổng", firewall: "tường lửa" })[type] || type} · ${new Date(daysAgo(int(1, 30))).toISOString().slice(0, 10)}`,
        type,
        status: pick(["ready", "ready", "ready", "generating", "archived"]),
        format: pick(["pdf", "csv", "json"]),
        period_start: daysAgo(int(30, 60)),
        period_end: daysAgo(int(0, 5)),
        created_by: pick(analystIds),
        summary: "Báo cáo an ninh tự động được tạo từ dữ liệu đo từ xa SOC trực tiếp.",
        metadata: JSON.stringify({ automated: true }),
      };
    }),
  );

  await insert(
    "integrations",
    ["name", "provider", "type", "status", "config", "last_sync_at"],
    [
      ["CrowdStrike Falcon", "CrowdStrike", "edr", "connected", JSON.stringify({ region: "us-1" }), hoursAgo(0)],
      ["Elastic SIEM", "Elastic", "siem", "connected", JSON.stringify({ index: "mg-security-*" }), hoursAgo(0)],
      ["Palo Alto Cortex", "Palo Alto", "firewall", "connected", JSON.stringify({ panorama: "mg-panorama" }), hoursAgo(1)],
      ["AWS GuardDuty", "AWS", "cloud", "connected", JSON.stringify({ account: "medicare-prod" }), hoursAgo(0)],
      ["Okta", "Okta", "identity", "connected", JSON.stringify({ org: "medicareguard" }), hoursAgo(0)],
      ["Jira Service Management", "Atlassian", "ticketing", "connected", JSON.stringify({ project: "SOC" }), hoursAgo(3)],
      ["Slack", "Slack", "notification", "connected", JSON.stringify({ channel: "#soc-alerts" }), hoursAgo(0)],
      ["n8n Automation", "n8n", "soar", "connected", JSON.stringify({ baseUrl: "http://n8n:5678" }), hoursAgo(0)],
      ["MISP", "MISP", "threat-intel", "degraded", JSON.stringify({ feed: "cti-shared" }), hoursAgo(6)],
    ].map(([name, provider, type, status, config, last_sync_at]) => ({ name, provider, type, status, config, last_sync_at })),
  );

  const conversations = await insert(
    "ai_conversations",
    ["user_id", "title", "model"],
    [
      [userIds[0], "Phân loại cảnh báo ransomware nghiêm trọng", "medicareguard-analyst"],
      [userIds[1], "Nguồn tấn công hàng đầu tuần này", "medicareguard-analyst"],
      [userIds[2], "Khoảng trống tuân thủ HIPAA", "medicareguard-analyst"],
    ].map(([user_id, title, model]) => ({ user_id, title, model })),
  );
  await insert(
    "ai_messages",
    ["conversation_id", "role", "content", "tokens"],
    [
      [conversations[0].id, "user", "Phân tích cảnh báo ransomware nghiêm trọng nhất và đề xuất cách xử lý.", 28],
      [conversations[0].id, "assistant", "Cảnh báo ransomware nghiêm trọng cần được cô lập trong 15 phút đầu. Khuyến nghị: cô lập máy chủ bị ảnh hưởng, thu thập forensic image, chặn IP nguồn tại firewall và xoay vòng credential.", 58],
      [conversations[1].id, "user", "Những kẻ tấn công hàng đầu tuần này là ai?", 12],
      [conversations[1].id, "assistant", "Các IP nguồn hàng đầu tập trung ở CN, RU và IR. Tôi đề xuất chặn các IP có rủi ro ≥ 80 và giám sát phần còn lại trong 24 giờ.", 34],
      [conversations[2].id, "user", "Những kiểm soát HIPAA nào cần chú ý?", 10],
      [conversations[2].id, "assistant", "Kiểm soát quy trình sự cố HIPAA đang ở mức 79%. Hãy chỉ định người phụ trách và khắc phục khoảng trống bằng chứng trong 30 ngày.", 32],
    ].map(([conversation_id, role, content, tokens]) => ({ conversation_id, role, content, tokens })),
  );

  await insert(
    "metrics",
    ["name", "value", "unit", "source", "tags", "recorded_at"],
    Array.from({ length: 60 }).map(() => ({
      name: pick(["alerts_per_hour", "ingest_lag_seconds", "mttr_hours", "cpu_usage_percent", "open_incidents", "blocked_requests"]),
      value: int(1, 500),
      unit: pick(["count", "seconds", "hours", "percent"]),
      source: pick(["siem", "edr", "firewall", "platform"]),
      tags: JSON.stringify({ env: "prod" }),
      recorded_at: hoursAgo(int(0, 168)),
    })),
  );

  await insert(
    "notifications",
    ["user_id", "title", "message", "type", "read", "link"],
    Array.from({ length: 24 }).map(() => ({
      user_id: pick(userIds),
      title: pick(["Đã giao cảnh báo nghiêm trọng", "Sự cố sắp tới hạn SLA", "Báo cáo đã sẵn sàng", "Phát hiện tình báo mối đe dọa mới", "Quét đã hoàn tất"]),
      message: pick(["Một cảnh báo nghiêm trọng cần bạn xem xét.", "Sự cố INC-2026 đang tới hạn SLA.", "Báo cáo hàng tuần của bạn đã sẵn sàng để tải xuống.", "IOC mới khớp với một tài sản nội bộ.", "Quét lỗ hổng theo lịch đã hoàn tất."]),
      type: pick(["alert", "incident", "report", "intel", "scan"]),
      read: chance(0.4),
      link: pick(["/alerts", "/incidents", "/reports", "/threats", "/assets"]),
    })),
  );

  await insert(
    "api_keys",
    ["name", "key_prefix", "key_hash", "user_id", "scopes", "last_used_at", "expires_at", "revoked"],
    [
      ["Tự động hóa n8n", "mg_live_n8n", "hash-n8n-automation", userIds[0], ["alerts:write", "incidents:write", "ai:use"], hoursAgo(0), daysAgo(-180), false],
      ["Grafana chỉ đọc", "mg_live_graf", "hash-grafana-read", userIds[3], ["read"], hoursAgo(2), daysAgo(-90), false],
      ["Cầu nối SIEM cũ", "mg_legacy_siem", "hash-legacy-siem", userIds[1], ["read"], daysAgo(45), daysAgo(5), true],
    ].map(([name, key_prefix, key_hash, user_id, scopes, last_used_at, expires_at, revoked]) => ({ name, key_prefix, key_hash, user_id, scopes, last_used_at, expires_at, revoked })),
  );

  await insert(
    "sessions",
    ["user_id", "token_hash", "ip_address", "user_agent", "expires_at", "revoked", "created_at"],
    Array.from({ length: 20 }).map(() => {
      const user = pick(users);
      return {
        user_id: user.id,
        token_hash: require("node:crypto").randomBytes(32).toString("hex"),
        ip_address: randomIp(),
        user_agent: "MedicareGuard-Console/1.0",
        expires_at: daysAgo(-1),
        revoked: chance(0.2),
        created_at: daysAgo(int(0, 5), 23),
      };
    }),
  );


  // ── Medicare Store (e-commerce) ─────────────────────────────────────────────
  const storePasswordHash = await bcrypt.hash("Customer@123", config.bcryptRounds);
  const storeCustomers = await insert(
    "store_customers",
    ["email", "password_hash", "full_name", "phone", "address", "city", "country", "country_code"],
    [
      ["an.nguyen@example.com", storePasswordHash, "Nguyễn Văn An", "0901 234 567", "12 Nguyễn Huệ, Quận 1", "TP. Hồ Chí Minh", "Việt Nam", "VN"],
      ["bich.tran@example.com", storePasswordHash, "Trần Thị Bích", "0912 345 678", "45 Lê Lợi, Hải Châu", "Đà Nẵng", "Việt Nam", "VN"],
      ["cuong.pham@example.com", storePasswordHash, "Phạm Quốc Cường", "0933 456 789", "88 Trần Phú, Ba Đình", "Hà Nội", "Việt Nam", "VN"],
      ["dung.le@example.com", storePasswordHash, "Lê Thị Dung", "0944 567 890", "21 Nguyễn Trãi, Thanh Xuân", "Hà Nội", "Việt Nam", "VN"],
    ].map(([email, password_hash, full_name, phone, address, city, country, country_code]) => ({ email, password_hash, full_name, phone, address, city, country, country_code })),
  );

  const storeProducts = await insert(
    "store_products",
    ["sku", "slug", "name", "category", "brand", "description", "price", "sale_price", "stock", "image_url", "rating", "tags", "status"],
    [
      ["MG-BP-001", "may-do-huyet-ap-omron-hem-7000", "Máy đo huyết áp Omron HEM-7000", "Thiết bị đo", "Omron", "Máy đo huyết áp bắp tay tự động, bộ nhớ 100 lần đo, phát hiện nhịp tim không đều. Phù hợp theo dõi huyết áp tại nhà.", 1890000, 1590000, 48, "/products/may-do-huyet-ap.jpg", 4.8, ["bán chạy", "chính hãng"], "active"],
      ["MG-BG-002", "may-do-duong-huyet-accu-chek-aviva", "Máy đo đường huyết Accu-Chek Aviva", "Thiết bị đo", "Roche", "Bộ máy đo đường huyết kèm 50 que thử, kết quả sau 5 giây, kết nối ứng dụng theo dõi sức khỏe.", 1250000, 1090000, 65, "/products/may-do-duong-huyet.jpg", 4.7, ["bán chạy"], "active"],
      ["MG-WC-003", "xe-lan-y-te-gap-gon", "Xe lăn y tế gấp gọn", "Thiết bị hỗ trợ", "MediCare", "Khung hợp kim nhôm nhẹ, gấp gọn, tải trọng 120 kg, phanh an toàn và đệm ngồi thoáng khí.", 2750000, 2490000, 22, "/products/xe-lan.jpg", 4.6, ["hỗ trợ vận động"], "active"],
      ["MG-NB-004", "may-xong-mui-nen-khi", "Máy xông mũi nén khí", "Sức khỏe hô hấp", "MediCare", "Máy khí dung nén cho người lớn và trẻ em, hạt sương mịn, phụ kiện đầy đủ, vận hành êm.", 1450000, 1290000, 37, "/products/may-xong-mui.jpg", 4.5, ["hô hấp"], "active"],
      ["MG-TM-005", "nhiet-ke-hong-ngoai-tran", "Nhiệt kế hồng ngoại trán", "Thiết bị đo", "MediCare", "Đo nhiệt độ trán không tiếp xúc trong 1 giây, cảnh báo sốt bằng màu, phù hợp gia đình.", 690000, 590000, 90, "/products/nhiet-ke.jpg", 4.4, ["gia đình"], "active"],
      ["MG-MK-006", "khau-trang-y-te-n95-hop-20", "Khẩu trang y tế N95 hộp 20", "Vật tư y tế", "3M", "Khẩu trang N95 lọc bụi mịn, van thở, dây đeo co giãn, hộp 20 chiếc.", 350000, 299000, 180, "/products/khau-trang.jpg", 4.3, ["vật tư"], "active"],
      ["MG-SU-007", "vien-uong-bo-sung-vitamin-d3", "Viên uống bổ sung Vitamin D3", "Thực phẩm bổ sung", "NatureCare", "Hỗ trợ hấp thu canxi, tốt cho xương khớp, hộp 60 viên, sản xuất tại Việt Nam.", 280000, 249000, 120, "/products/vitamin-d3.jpg", 4.2, ["vitamin"], "active"],
      ["MG-WD-008", "bo-bang-gac-y-te-vo-trung", "Bộ băng gạc y tế vô trùng", "Chăm sóc vết thương", "MediCare", "Bộ 10 gói băng gạc vô trùng nhiều kích thước, thấm hút tốt, dùng cho chăm sóc vết thương tại nhà.", 120000, 99000, 240, "/products/bang-gac.jpg", 4.1, ["vật tư"], "active"],
      ["MG-OT-009", "may-do-nong-do-oxy", "Máy đo nồng độ oxy SpO2", "Thiết bị đo", "Contec", "Máy đo SpO2 đầu ngón tay, màn hình OLED, cảnh báo âm thanh, pin AAA.", 750000, 650000, 55, "/products/oxy.jpg", 4.6, ["bán chạy"], "active"],
      ["MG-MS-010", "may-massage-cam-tay", "Máy massage cầm tay trị liệu", "Thiết bị hỗ trợ", "HealthPro", "Máy massage 6 chế độ, 20 cường độ, sạc USB, hỗ trợ thư giãn cơ và giảm đau nhức.", 890000, 790000, 42, "/products/massage.jpg", 4.3, ["thư giãn"], "active"],
      ["MG-SC-011", "ghe-y-te-co-lung-tua", "Ghế y tế có lưng tựa", "Thiết bị hỗ trợ", "MediCare", "Ghế chăm sóc bệnh nhân, khung thép chắc chắn, đệm chống thấm, tay vịn có thể tháo.", 3200000, 2890000, 15, "/products/ghe-y-te.jpg", 4.0, ["hỗ trợ"], "active"],
      ["MG-SP-012", "dung-dich-rua-tay-khuan", "Dung dịch rửa tay khô 500ml", "Vật tư y tế", "Sạch", "Dung dịch rửa tay khô 70% ethanol, diệt khuẩn 99.9%, có dưỡng ẩm, chai 500ml.", 85000, 69000, 300, "/products/rua-tay.jpg", 4.0, ["vệ sinh"], "active"],
    ].map(([sku, slug, name, category, brand, description, price, sale_price, stock, image_url, rating, tags, status]) => ({ sku, slug, name, category, brand, description, price, sale_price, stock, image_url, rating, tags, status })),
  );

  await insert(
    "store_coupons",
    ["code", "type", "value", "min_subtotal", "max_uses", "used_count", "active", "expires_at"],
    [
      ["MEDICARE10", "percent", 10, 500000, 500, 42, true, daysAgo(-90)],
      ["VIP20", "percent", 20, 2000000, 100, 7, true, daysAgo(-60)],
      ["FREESHIP", "fixed", 30000, 300000, 1000, 128, true, daysAgo(-120)],
    ].map(([code, type, value, min_subtotal, max_uses, used_count, active, expires_at]) => ({ code, type, value, min_subtotal, max_uses, used_count, active, expires_at })),
  );

  const storeOrderSeed = [
    { customer: 0, status: "delivered", payment_status: "paid", payment_method: "card", city: "TP. Hồ Chí Minh", ip: "113.161.72.18", country: "Việt Nam", cc: "VN", risk: 12, flags: [], items: [[0, 1], [1, 2]], days: 8 },
    { customer: 1, status: "processing", payment_status: "paid", payment_method: "bank_transfer", city: "Đà Nẵng", ip: "14.161.22.9", country: "Việt Nam", cc: "VN", risk: 18, flags: [], items: [[2, 1], [5, 3]], days: 5 },
    { customer: 2, status: "on_hold", payment_status: "unpaid", payment_method: "card", city: "Hà Nội", ip: "77.35.40.181", country: "Hà Lan", cc: "NL", risk: 82, flags: ["ip_country_mismatch", "high_value_order", "card_high_value"], items: [[10, 2], [0, 1]], days: 2 },
    { customer: 3, status: "pending", payment_status: "unpaid", payment_method: "cod", city: "Hà Nội", ip: "10.20.4.88", country: "Việt Nam", cc: "VN", risk: 8, flags: [], items: [[4, 2], [7, 4]], days: 1 },
    { customer: 0, status: "cancelled", payment_status: "unpaid", payment_method: "cod", city: "TP. Hồ Chí Minh", ip: "113.161.72.18", country: "Việt Nam", cc: "VN", risk: 10, flags: [], items: [[6, 1]], days: 3 },
    { customer: null, status: "on_hold", payment_status: "unpaid", payment_method: "card", city: "Singapore", ip: "203.83.3.123", country: "Singapore", cc: "SG", risk: 76, flags: ["ip_country_mismatch", "guest_checkout", "card_high_value"], items: [[9, 3], [3, 1]], days: 1 },
  ];

  const storeOrders = [];
  const storeOrderItems = [];
  for (const [index, entry] of storeOrderSeed.entries()) {
    const customer = entry.customer === null ? null : storeCustomers[entry.customer];
    const lineItems = entry.items.map(([productIndex, quantity]) => {
      const product = storeProducts[productIndex];
      const unit = Number(product.sale_price ?? product.price);
      return { product, quantity, unit, lineTotal: unit * quantity };
    });
    const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const shippingFee = subtotal >= 500000 ? 0 : 30000;
    const tax = Math.round(subtotal * 0.08);
    const total = subtotal + shippingFee + tax;
    const createdAt = daysAgo(entry.days, 6);
    const order = {
      order_number: `MG-${new Date(createdAt).toISOString().slice(0, 10).replace(/-/g, "")}-${1001 + index}`,
      customer_id: customer?.id || null,
      status: entry.status,
      payment_status: entry.payment_status,
      payment_method: entry.payment_method,
      subtotal, discount: 0, shipping_fee: shippingFee, tax, total,
      shipping_name: customer?.full_name || "Khách vãng lai",
      shipping_email: customer?.email || "guest@example.com",
      shipping_phone: customer?.phone || "0900 000 000",
      shipping_address: customer?.address || "1 Marina Boulevard",
      shipping_city: entry.city,
      shipping_country: entry.country,
      shipping_country_code: entry.cc,
      risk_score: entry.risk,
      fraud_flags: entry.flags,
      ip_address: entry.ip,
      ip_country: entry.country,
      ip_country_code: entry.cc,
      ip_source: entry.ip.startsWith("10.") ? "socket" : "x-forwarded-for",
      user_agent: "MedicareStore-Demo/1.0",
      metadata: JSON.stringify({ seeded: true, scenario: entry.risk >= 70 ? "fraud-review" : "normal" }),
      created_at: createdAt,
      updated_at: createdAt,
    };
    const created = await insert("store_orders", Object.keys(order), [order]);
    storeOrders.push(created[0]);
    for (const item of lineItems) {
      storeOrderItems.push({
        order_id: created[0].id,
        product_id: item.product.id,
        sku: item.product.sku,
        name: item.product.name,
        quantity: item.quantity,
        unit_price: item.unit,
        line_total: item.lineTotal,
        image_url: item.product.image_url,
        created_at: createdAt,
      });
    }
  }
  await insert("store_order_items", ["order_id", "product_id", "sku", "name", "quantity", "unit_price", "line_total", "image_url", "created_at"], storeOrderItems);

  await insert(
    "store_reviews",
    ["product_id", "customer_id", "rating", "title", "body", "status", "created_at"],
    [
      [storeProducts[0].id, storeCustomers[0].id, 5, "Rất chính xác", "Máy đo ổn định, so với kết quả ở bệnh viện không chênh lệch. Giao hàng nhanh.", "published", daysAgo(6)],
      [storeProducts[1].id, storeCustomers[1].id, 5, "Dễ sử dụng", "Que thử lấy kết quả nhanh, ứng dụng theo dõi đường huyết rất tiện.", "published", daysAgo(4)],
      [storeProducts[3].id, storeCustomers[2].id, 4, "Máy êm", "Máy xông hoạt động êm, phụ kiện đầy đủ. Đóng gói cẩn thận.", "published", daysAgo(3)],
      [storeProducts[5].id, storeCustomers[3].id, 4, "Hàng chuẩn", "Khẩu trang dày, đeo kín. Giá hợp lý so với cửa hàng.", "published", daysAgo(2)],
      [storeProducts[8].id, storeCustomers[0].id, 5, "Theo dõi sức khỏe tốt", "Máy đo oxy nhỏ gọn, màn hình rõ, pin lâu.", "published", daysAgo(1)],
    ].map(([product_id, customer_id, rating, title, body, status, created_at]) => ({ product_id, customer_id, rating, title, body, status, created_at })),
  );

  await insert(
    "store_security_events",
    ["event_type", "severity", "ip_address", "country", "country_code", "order_id", "risk_score", "metadata", "created_at"],
    [
      ["checkout_fraud_review", "high", "77.35.40.181", "Hà Lan", "NL", storeOrders[2].id, 82, JSON.stringify({ flags: ["ip_country_mismatch", "high_value_order"] }), daysAgo(2)],
      ["checkout_fraud_review", "high", "203.83.3.123", "Singapore", "SG", storeOrders[5].id, 76, JSON.stringify({ flags: ["ip_country_mismatch", "guest_checkout"] }), daysAgo(1)],
      ["payment_velocity", "medium", "113.161.72.18", "Việt Nam", "VN", storeOrders[0].id, 45, JSON.stringify({ attempts: 3 }), daysAgo(8)],
    ].map(([event_type, severity, ip_address, country, country_code, order_id, risk_score, metadata, created_at]) => ({ event_type, severity, ip_address, country, country_code, order_id, risk_score, metadata, created_at })),
  );

  logger.info("Seed completed", {
    roles: roles.length, users: users.length, assets: assets.length, threats: threats.length,
    alerts: alerts.length, incidents: incidents.length, firewallRules: firewallRules.length,
    reports: reports.length, conversations: conversations.length,
  });
};

seed()
  .catch((error) => {
    logger.error("Seed failed", { error: error.message, stack: error.stack?.split("\n").slice(0, 5) });
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
