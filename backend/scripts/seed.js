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
  "ai_messages", "ai_conversations", "integrations", "reports", "knowledge_base", "tickets", "settings", "tags",
  "comments", "vendors", "policies", "risk_assessments", "compliance_controls", "phishing_campaigns", "email_events",
  "data_sources", "network_flows", "devices", "agents", "monitors", "metrics", "notifications", "audit_logs",
  "activity_logs", "findings", "scans", "remediations", "cases", "threat_intel", "detection_rules", "playbooks",
  "vulnerabilities", "firewall_rules", "incidents", "alerts", "threats", "assets", "api_keys", "sessions",
  "departments", "users", "roles",
];

const COUNTRIES = [
  ["China", "CN"], ["Russia", "RU"], ["United States", "US"], ["Brazil", "BR"], ["India", "IN"],
  ["Iran", "IR"], ["North Korea", "KP"], ["Vietnam", "VN"], ["Germany", "DE"], ["Netherlands", "NL"],
  ["Ukraine", "UA"], ["Romania", "RO"], ["Nigeria", "NG"], ["Indonesia", "ID"], ["South Korea", "KR"],
  ["Turkey", "TR"], ["United Kingdom", "GB"], ["France", "FR"], ["Singapore", "SG"], ["Japan", "JP"],
  ["China", "CN"], ["Russia", "RU"], ["United States", "US"], ["Iran", "IR"], ["North Korea", "KP"],
];

const CATEGORY_MITRE = {
  Ransomware: { tactic: "TA0040 Impact", technique: "T1486 Data Encrypted for Impact" },
  Phishing: { tactic: "TA0001 Initial Access", technique: "T1566 Phishing" },
  "DDoS": { tactic: "TA0040 Impact", technique: "T1498 Network Denial of Service" },
  "Brute Force": { tactic: "TA0006 Credential Access", technique: "T1110 Brute Force" },
  "Web Attack": { tactic: "TA0001 Initial Access", technique: "T1190 Exploit Public-Facing Application" },
  "Data Exfiltration": { tactic: "TA0010 Exfiltration", technique: "T1041 Exfiltration Over C2 Channel" },
  C2: { tactic: "TA0011 Command and Control", technique: "T1071 Application Layer Protocol" },
  Cryptojacking: { tactic: "TA0040 Impact", technique: "T1496 Resource Hijacking" },
  Malware: { tactic: "TA0002 Execution", technique: "T1204 User Execution" },
  "Insider Threat": { tactic: "TA0009 Collection", technique: "T1530 Data from Cloud Storage" },
  "Supply Chain": { tactic: "TA0001 Initial Access", technique: "T1195 Supply Chain Compromise" },
  "Zero-day": { tactic: "TA0001 Initial Access", technique: "T1203 Exploitation for Client Execution" },
};

const ACTORS = ["APT-29", "Lazarus Group", "FIN7", "Medusa", "LockBit", "Anonymous Sudan", "Turla", "Sandworm", "Scattered Spider", "Qakbot", "Emotet", "Cobalt Strike", "Mirai", "RedLine", "BlackCat", "Akira", "Play", "Cl0p", "Volt Typhoon", "Kimsuky"];
const VECTORS = ["Ransomware Campaign", "Credential Harvesting", "C2 Beacon", "SQL Injection Wave", "DDoS Botnet", "Phishing Kit", "Supply Chain Compromise", "Data Exfiltration", "Brute Force Campaign", "Web Shell Deployment", "Cryptojacking", "Zero-day Exploitation"];

const SOURCE_PREFIXES = ["45", "91", "103", "185", "194", "212", "80", "82", "31", "5", "37", "41", "62", "77", "89", "102", "109", "176", "181", "203"];
const randomIp = () => `${pick(SOURCE_PREFIXES)}.${int(0, 255)}.${int(0, 255)}.${int(1, 254)}`;

const ASSET_BLUEPRINTS = [
  ["Patient Portal", "web_server", "Web", "portal.medicareguard.io", "10.10.1.10", "Ubuntu 24.04", "critical", "Security Operations"],
  ["EHR Database", "database", "Data", "ehr-db-01.medicareguard.io", "10.10.2.11", "PostgreSQL 16", "critical", "Clinical Systems"],
  ["Appointment API", "api_gateway", "API", "api.medicareguard.io", "10.10.1.20", "Node.js 20", "high", "Infrastructure"],
  ["Billing Service", "web_server", "Finance", "billing.medicareguard.io", "10.10.1.30", "Java 21", "high", "Finance"],
  ["Kubernetes Cluster", "kubernetes", "Platform", "eks-prod.medicareguard.io", "10.10.3.0", "EKS 1.30", "critical", "Infrastructure"],
  ["VPN Gateway", "vpn", "Network", "vpn.medicareguard.io", "10.10.0.5", "FortiOS 7.4", "critical", "Network Engineering"],
  ["Medical IoT Gateway", "iot", "IoT", "iot-gw-01.medicareguard.io", "10.20.4.10", "Embedded Linux", "high", "Clinical Systems"],
  ["Imaging PACS", "medical_device", "Clinical", "pacs-01.medicareguard.io", "10.20.5.21", "Windows Server 2022", "critical", "Clinical Systems"],
  ["Pharmacy Database", "database", "Data", "pharmacy-db.medicareguard.io", "10.10.2.14", "MySQL 8.4", "high", "Clinical Systems"],
  ["Admin Workstation", "workstation", "Endpoint", "adm-ws-14.medicareguard.io", "10.30.1.14", "macOS 15", "medium", "Security Operations"],
  ["CI/CD Runner", "ci_cd", "Platform", "runner-07.medicareguard.io", "10.10.6.7", "Ubuntu 24.04", "high", "Infrastructure"],
  ["Email Gateway", "email", "Network", "mail.medicareguard.io", "10.10.0.25", "Proofpoint", "high", "Security Operations"],
  ["Backup Vault", "storage", "Data", "vault.medicareguard.io", "10.10.7.4", "Veeam", "critical", "Infrastructure"],
  ["SIEM Ingestor", "siem", "Security", "siem-ingest.medicareguard.io", "10.10.8.9", "Elastic 8.15", "high", "Security Operations"],
  ["Telehealth Gateway", "gateway", "Clinical", "telehealth.medicareguard.io", "10.10.1.44", "Go 1.23", "high", "Clinical Systems"],
  ["DNS Resolver", "dns", "Network", "dns.medicareguard.io", "10.10.0.53", "BIND 9.20", "medium", "Network Engineering"],
  ["Identity Provider", "identity", "Security", "idp.medicareguard.io", "10.10.8.20", "Keycloak 26", "critical", "Security Operations"],
  ["Mobile API", "api_gateway", "API", "mobile-api.medicareguard.io", "10.10.1.50", "Node.js 20", "high", "Data Platform"],
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
      { name: "admin", description: "Full platform administration and security operations", permissions: ["*"], level: 100 },
      { name: "analyst", description: "SOC analyst — triage, respond and report", permissions: ["read", "write", "alerts:write", "alerts:assign", "threats:write", "threats:enrich", "assets:write", "assets:scan", "incidents:write", "incidents:resolve", "firewall:write", "firewall:apply", "logs:read", "reports:write", "reports:export", "ai:use"], level: 80 },
      { name: "hunter", description: "Threat hunter — detection engineering and intel", permissions: ["read", "write", "threats:write", "threats:enrich", "alerts:write", "assets:scan", "logs:read", "ai:use", "reports:export"], level: 60 },
      { name: "viewer", description: "Read-only business stakeholder", permissions: ["read", "ai:use"], level: 10 },
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
    ["admin@medicareguard.io", "Nguyen Thi Bich Tram", "admin", "Security Operations", "SOC Manager"],
    ["analyst@medicareguard.io", "Minh Anh Tran", "analyst", "Security Operations", "Senior SOC Analyst"],
    ["hunter@medicareguard.io", "Duc Huy Le", "hunter", "Security Operations", "Threat Hunter"],
    ["viewer@medicareguard.io", "Lan Phuong Vo", "viewer", "Compliance", "Compliance Officer"],
    ["sarah.chen@medicareguard.io", "Sarah Chen", "analyst", "Infrastructure", "Cloud Security Engineer"],
    ["marcus.weber@medicareguard.io", "Marcus Weber", "analyst", "Network Engineering", "Network Security Analyst"],
    ["aisha.rahman@medicareguard.io", "Aisha Rahman", "hunter", "Data Platform", "Detection Engineer"],
    ["daniel.okafor@medicareguard.io", "Daniel Okafor", "analyst", "Clinical Systems", "Clinical Security Analyst"],
    ["yuki.tanaka@medicareguard.io", "Yuki Tanaka", "viewer", "Finance", "Risk Analyst"],
    ["carlos.mendoza@medicareguard.io", "Carlos Mendoza", "analyst", "Security Operations", "Incident Responder"],
    ["elena.petrova@medicareguard.io", "Elena Petrova", "hunter", "Infrastructure", "Threat Intelligence Analyst"],
    ["james.mitchell@medicareguard.io", "James Mitchell", "viewer", "Security Operations", "SOC Intern"],
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
      ["Security Operations", "SOC", userIds[0], "24/7 security monitoring and incident response"],
      ["Infrastructure", "INFRA", userIds[4], "Cloud, platform and network engineering"],
      ["Clinical Systems", "CLIN", userIds[7], "EHR, PACS and patient-facing applications"],
      ["Network Engineering", "NET", userIds[5], "Perimeter, VPN and firewall operations"],
      ["Compliance", "GRC", userIds[3], "Governance, risk and compliance"],
      ["Data Platform", "DATA", userIds[6], "Analytics, integrations and data protection"],
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
        source: `${actor} infrastructure`,
        source_ip: ip,
        country,
        country_code: code,
        ioc_type: iocType,
        ioc_value: iocValue,
        confidence: int(55, 99),
        risk_score: severity === "critical" ? int(80, 99) : severity === "high" ? int(60, 85) : severity === "medium" ? int(35, 65) : int(10, 40),
        description: `${category} activity attributed to ${actor} targeting the Medicare platform. Observed in the ${pick(["patient portal", "EHR", "billing", "telehealth", "identity"])} perimeter.`,
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
    "Suspicious outbound C2 beacon detected",
    "Multiple failed logins followed by success",
    "Ransomware note dropped on file share",
    "Data exfiltration to unknown cloud storage",
    "Web shell uploaded to application server",
    "Malicious PowerShell encoded command",
    "Impossible travel sign-in detected",
    "WAF blocked SQL injection attempt",
    "Credential stuffing burst on login endpoint",
    "Unusual privileged account activity",
    "EDR blocked lateral movement attempt",
    "DNS tunnelling to suspicious domain",
    "Crypto-mining process observed on workload",
    "Phishing email delivered to executive inbox",
    "Unauthorised API key usage detected",
    "Anomalous database dump from EHR",
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
        description: `Detection triggered on ${asset.name} (${asset.ip_address}). Source ${threat.source_ip} attributed to ${threat.country}. Correlation confidence ${int(60, 99)}%.`,
        severity,
        status,
        source: pick(["SIEM", "EDR", "Firewall", "IDS", "Email Gateway", "Cloud Trail", "AI Anomaly Engine"]),
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
    "Suspected ransomware on clinical file server",
    "Patient portal credential stuffing campaign",
    "EHR database exfiltration attempt",
    "Compromised administrator account",
    "Malicious OAuth application consent",
    "Edge VPN vulnerable appliance exploitation",
    "Billing service web shell deployment",
    "Insider data access anomaly",
    "Supply chain package compromise",
    "Telehealth API abuse",
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
        description: `Incident involving ${asset.name}. Investigated by the MedicareGuard SOC with automated evidence collection.`,
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
        root_cause: resolved ? pick(["Unpatched public-facing service", "Reused privileged credentials", "Phishing attachment execution", "Misconfigured storage bucket", "Third-party vendor compromise"]) : null,
        impact: pick(["Patient data confidentiality", "Service availability", "Financial fraud risk", "Regulatory exposure", "Limited — contained early"]),
        timeline: JSON.stringify([
          { kind: "detection", message: "Automated detection raised by SIEM", actor: "system", created_at: iso(detected) },
          { kind: "triage", message: "L1 analyst validated the alert", actor: "analyst@medicareguard.io", created_at: iso(new Date(detected.getTime() + 20 * 60000)) },
          { kind: "containment", message: "Affected workload isolated from production", actor: "analyst@medicareguard.io", created_at: iso(new Date(detected.getTime() + 55 * 60000)) },
        ]),
        metadata: JSON.stringify({ assetId: asset.id, assetName: asset.name }),
      };
    }),
  );

  const firewallRules = await insert(
    "firewall_rules",
    ["name", "description", "direction", "action", "protocol", "source_ip", "destination_ip", "source_port", "destination_port", "priority", "enabled", "hit_count", "last_hit_at", "created_by", "metadata"],
    [
      ["Allow HTTPS to Patient Portal", "Public ingress for patient portal", "inbound", "allow", "tcp", "any", "10.10.1.10", "any", "443", 10, true, 184329, hoursAgo(1)],
      ["Deny SSH from Internet", "Block SSH from untrusted networks", "inbound", "deny", "tcp", "any", "any", "any", "22", 5, true, 8432, hoursAgo(2)],
      ["Allow VPN from corporate ranges", "Corporate VPN access", "inbound", "allow", "udp", "10.0.0.0/8", "10.10.0.5", "any", "51820", 20, true, 3201, hoursAgo(3)],
      ["Deny RDP from Internet", "Prevent exposed RDP", "inbound", "deny", "tcp", "any", "any", "any", "3389", 5, true, 12980, hoursAgo(1)],
      ["Allow EHR DB from app subnet", "Application tier to EHR", "internal", "allow", "tcp", "10.10.1.0/24", "10.10.2.11", "any", "5432", 30, true, 99120, hoursAgo(1)],
      ["Block known C2 IP range", "CTI-driven egress block", "outbound", "deny", "any", "any", "45.146.164.0/24", "any", "any", 8, true, 4421, hoursAgo(4)],
      ["Allow DNS to resolver", "Restrict egress DNS", "outbound", "allow", "udp", "10.0.0.0/8", "10.10.0.53", "any", "53", 25, true, 528391, hoursAgo(1)],
      ["Deny SMB egress", "Stop lateral SMB egress", "outbound", "deny", "tcp", "10.0.0.0/8", "any", "any", "445", 15, true, 2301, hoursAgo(6)],
      ["Allow monitoring scrape", "Prometheus scraping", "internal", "allow", "tcp", "10.10.8.0/24", "10.0.0.0/8", "any", "9090", 40, true, 129832, hoursAgo(1)],
      ["Block Tor exit nodes", "Egress policy", "outbound", "deny", "any", "any", "tor-exit-list", "any", "any", 9, true, 762, hoursAgo(8)],
      ["Allow telehealth media", "WebRTC media ports", "inbound", "allow", "udp", "any", "10.10.1.44", "any", "10000-20000", 22, true, 88432, hoursAgo(2)],
      ["Block malware hash C2 domain", "DNS RPZ block", "outbound", "deny", "udp", "10.0.0.0/8", "any", "any", "53", 12, true, 3412, hoursAgo(5)],
    ].map(([name, description, direction, action, protocol, source_ip, destination_ip, source_port, destination_port, priority, enabled, hit_count, last_hit_at, created_by]) => ({
      name, description, direction, action, protocol, source_ip, destination_ip, source_port, destination_port, priority, enabled, hit_count, last_hit_at, created_by: userIds[0], metadata: JSON.stringify({ managed: true }),
    })),
  );

  const activityLevels = ["info", "info", "info", "warn", "error", "debug"];
  const eventTypes = ["auth", "alert", "incident", "firewall", "ai", "system", "asset", "integration"];
  const activityMessages = [
    "Alert triaged by analyst", "Firewall rule deployed to edge", "Incident status changed", "AI investigation completed",
    "Asset scan completed", "SIEM integration synced", "User session revoked", "Threat intel feed refreshed",
    "Report exported", "Detection rule updated", "Suspicious login blocked", "Vulnerability remediation assigned",
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
    ["ransomware-containment", "Ransomware Containment & Recovery"],
    ["phishing-triage", "Phishing Triage & Credential Reset"],
    ["vulnerability-sla", "Vulnerability SLA Escalation"],
    ["compliance-evidence", "Continuous Compliance Evidence"],
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
      ["OpenSSL buffer overflow in TLS handler", "critical", "open", 9.8, "CVE-2024-6119"],
      ["Apache path traversal in reverse proxy", "critical", "open", 9.1, "CVE-2024-38476"],
      ["Kubernetes kubelet privilege escalation", "high", "open", 8.1, "CVE-2024-5321"],
      ["PostgreSQL extension RCE", "critical", "open", 9.2, "CVE-2024-7348"],
      ["FortiOS SSL VPN heap overflow", "critical", "open", 9.8, "CVE-2024-21762"],
      ["Keycloak open redirect", "medium", "open", 5.4, "CVE-2024-8698"],
      ["Log4j remote code execution", "critical", "open", 10.0, "CVE-2021-44228"],
      ["Windows SMB privilege escalation", "high", "in_progress", 8.8, "CVE-2024-38080"],
      ["Nginx HTTP/3 memory disclosure", "medium", "open", 6.1, "CVE-2024-31079"],
      ["MySQL authentication bypass", "high", "resolved", 7.5, "CVE-2024-20960"],
      ["Elasticsearch information disclosure", "medium", "open", 6.5, "CVE-2024-5290"],
      ["Node.js HTTP request smuggling", "high", "open", 7.2, "CVE-2024-22019"],
      ["Docker overlayFS escape", "critical", "in_progress", 9.3, "CVE-2024-21626"],
      ["Veeam backup RCE", "critical", "open", 9.8, "CVE-2023-27532"],
      ["Go crypto/tls DoS", "medium", "resolved", 5.9, "CVE-2024-24790"],
      ["Chromium V8 type confusion", "high", "open", 8.8, "CVE-2024-4947"],
      ["Apple macOS kernel escalation", "high", "open", 7.8, "CVE-2024-27822"],
      ["BIND9 DNS cache poisoning", "high", "open", 7.5, "CVE-2024-1737"],
      ["PHP-FPM code injection", "critical", "open", 9.8, "CVE-2024-4577"],
      ["Redis unauthenticated access", "high", "in_progress", 8.2, "CVE-2024-31449"],
    ].map(([title, severity, status, cvss_score, cve_id, description], index) => ({
      title, severity, status, cvss_score, cve_id, description, asset_id: assetIds[index % assetIds.length],
    })),
  );

  await insert(
    "playbooks",
    ["name", "category", "status", "description", "steps"],
    [
      ["Ransomware Containment", "ransomware", "active", "Isolate, preserve evidence, recover from backups", Array.from({ length: 6 }).map((_, i) => ({ order: i + 1, title: ["Detect", "Isolate", "Preserve", "Eradicate", "Recover", "Review"][i] }))],
      ["Phishing Response", "phishing", "active", "Triage reported phishing and purge mailboxes", [{ order: 1, title: "Validate headers" }, { order: 2, title: "Purge messages" }, { order: 3, title: "Reset credentials" }]],
      ["Data Exfiltration Response", "exfiltration", "active", "Contain egress and scope exposed data", [{ order: 1, title: "Block egress" }, { order: 2, title: "Identify data" }, { order: 3, title: "Notify privacy office" }]],
      ["Compromised Account", "identity", "active", "Contain and recover a compromised identity", [{ order: 1, title: "Revoke sessions" }, { order: 2, title: "Reset MFA" }, { order: 3, title: "Review activity" }]],
      ["Malware Triage", "malware", "active", "Analyse and eradicate malware", [{ order: 1, title: "Collect sample" }, { order: 2, title: "Sandbox detonate" }, { order: 3, title: "Remove persistence" }]],
      ["DDoS Mitigation", "availability", "active", "Activate scrubbing and rate limits", [{ order: 1, title: "Enable scrubbing" }, { order: 2, title: "Rate limit" }, { order: 3, title: "Notify stakeholders" }]],
    ].map(([name, category, status, description, steps]) => ({ name, category, status, description, steps: JSON.stringify(steps) })),
  );

  await insert(
    "detection_rules",
    ["name", "rule_type", "severity", "status", "expression", "description", "mitre_tactic"],
    [
      ["Encoded PowerShell execution", "sigma", "high", "active", "Image|endswith: '\\powershell.exe' AND CommandLine|contains: '-enc'", "Detects encoded PowerShell", "TA0002 Execution"],
      ["Brute force success", "sigma", "high", "active", "failed_logins > 10 AND success_within: 5m", "Credential access followed by success", "TA0006 Credential Access"],
      ["C2 beacon jitter", "kql", "critical", "active", "network_bytes | summarize by dst | where jitter > 0.2", "Periodic beaconing detection", "TA0011 Command and Control"],
      ["Ransomware extension rename", "yara", "critical", "active", "$ext = .locked or .encrypted", "Mass file rename", "TA0040 Impact"],
      ["Impossible travel", "kql", "medium", "active", "geo_distance(login1, login2) / elapsed > 900", "Identity anomaly", "TA0001 Initial Access"],
      ["Web shell write", "sigma", "critical", "active", "file_write | where path contains 'wwwroot' and ext in (php,jsp,aspx)", "Web shell drop detection", "TA0003 Persistence"],
      ["DNS tunnelling", "kql", "high", "active", "dns_queries | where length(subdomain) > 40", "DNS exfil", "TA0010 Exfiltration"],
      ["LSASS access", "sigma", "high", "active", "target_image: lsass.exe AND access: 0x1010", "Credential dumping", "TA0006 Credential Access"],
      ["S3 public bucket", "kql", "medium", "testing", "storage_acl | where public == true", "Cloud misconfiguration", "TA0009 Collection"],
      ["Suspicious OAuth consent", "kql", "high", "active", "oauth_grant | where scopes contains 'Mail.Read' and app_age < 7d", "Consent phishing", "TA0001 Initial Access"],
      ["Crypto miner process", "sigma", "medium", "active", "process | where cmdline contains 'xmrig'", "Cryptojacking", "TA0040 Impact"],
      ["Port scan threshold", "kql", "low", "active", "connections | summarize dcount(dst_port) by src | where > 100", "Reconnaissance", "TA0007 Discovery"],
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
      summary: "Case opened to correlate telemetry and preserve evidence across affected systems.",
    })),
  );

  await insert(
    "remediations",
    ["title", "status", "priority", "owner_id", "asset_id", "due_at", "completed_at", "description"],
    Array.from({ length: 20 }).map(() => ({
      title: pick(["Patch OpenSSL on edge nodes", "Enable MFA for service accounts", "Rotate exposed API keys", "Restrict SMB egress", "Rebuild compromised runner", "Remove stale admin accounts"]),
      status: pick(["pending", "in_progress", "completed", "blocked"]),
      priority: pick(["critical", "high", "medium", "low"]),
      owner_id: pick(userIds),
      asset_id: pick(assetIds),
      due_at: daysAgo(-int(1, 20)),
      completed_at: chance(0.4) ? daysAgo(int(0, 5)) : null,
      description: "Remediation task generated from vulnerability and incident findings.",
    })),
  );

  const scans = await insert(
    "scans",
    ["name", "type", "status", "target", "agent_id", "started_at", "completed_at", "findings_count"],
    Array.from({ length: 12 }).map(() => {
      const asset = pick(assets);
      const completed = chance(0.7);
      return {
        name: `${pick(["Weekly", "On-demand", "Compliance", "External attack surface"])} scan · ${asset.name}`,
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
      title: pick(["Outdated TLS cipher suite", "Anonymous FTP enabled", "SMB signing disabled", "Exposed debug endpoint", "Weak SSH configuration", "Unpatched CVE present", "Default credentials detected"]),
      severity: pick(["critical", "high", "medium", "low"]),
      status: pick(["open", "in_progress", "resolved", "accepted_risk"]),
      scan_id: scans[index % scans.length].id,
      asset_id: pick(assetIds),
      description: "Scanner identified a configuration or patch-level weakness on the target asset.",
      remediation: "Apply vendor patch, harden configuration and re-scan to validate.",
    })),
  );

  await insert(
    "monitors",
    ["name", "type", "target", "status", "interval_seconds", "last_checked_at", "uptime_percent"],
    [
      ["Patient Portal uptime", "uptime", "https://portal.medicareguard.io", "up", 60, hoursAgo(0), 99.99],
      ["EHR API health", "api", "https://api.medicareguard.io/health", "up", 30, hoursAgo(0), 99.97],
      ["SIEM ingest lag", "metric", "siem-ingest", "degraded", 60, hoursAgo(0), 98.32],
      ["VPN gateway latency", "synthetic", "vpn.medicareguard.io", "up", 60, hoursAgo(0), 99.91],
      ["Backup job success", "job", "vault.medicareguard.io", "up", 3600, hoursAgo(2), 100],
      ["Identity provider", "api", "https://idp.medicareguard.io", "up", 30, hoursAgo(0), 99.99],
      ["Telehealth media", "synthetic", "telehealth.medicareguard.io", "up", 60, hoursAgo(0), 99.84],
      ["DNS resolution", "dns", "dns.medicareguard.io", "up", 30, hoursAgo(0), 99.95],
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
      name: `${pick(["MacBook", "ThinkPad", "iPhone", "iPad", "Windows", "IoT"])} · ${pick(["Clinical", "SOC", "Finance", "Nursing", "Admin"])} ${index + 1}`,
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
      ["Palo Alto Firewall", "syslog", "connected", "udp://10.10.0.1:514", hoursAgo(0), 9283742],
      ["CrowdStrike Falcon", "edr", "connected", "https://api.crowdstrike.com", hoursAgo(0), 4829103],
      ["Office 365 Audit", "saas", "connected", "https://manage.office.com", hoursAgo(1), 2139841],
      ["Kubernetes Audit", "container", "connected", "https://eks-prod", hoursAgo(0), 3829103],
      ["Clinical IoT", "iot", "degraded", "mqtt://iot-broker", hoursAgo(3), 712830],
      ["Veeam Backup", "backup", "connected", "https://vault.medicareguard.io", hoursAgo(2), 19283],
      ["DNS logs", "dns", "connected", "udp://10.10.0.53:53", hoursAgo(0), 12093842],
    ].map(([name, type, status, endpoint, last_ingest_at, events_count]) => ({ name, type, status, endpoint, last_ingest_at, events_count })),
  );

  await insert(
    "email_events",
    ["subject", "sender", "recipient", "verdict", "severity", "status", "received_at"],
    Array.from({ length: 35 }).map(() => ({
      subject: pick(["Invoice overdue — action required", "Password expiry notice", "Shared document: patient_records.xlsx", "Benefits enrollment update", "Security alert: new sign-in", "Payroll change confirmation"]),
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
      ["Q4 credential awareness", "completed", "All staff", daysAgo(20), daysAgo(13), 820, 61, 42],
      ["Clinical phishing drill", "completed", "Clinical Systems", daysAgo(35), daysAgo(28), 210, 12, 18],
      ["Invoice fraud simulation", "running", "Finance", daysAgo(2), null, 95, 7, 3],
      ["MFA fatigue simulation", "draft", "Infrastructure", null, null, 0, 0, 0],
      ["Executive whale test", "scheduled", "Leadership", daysAgo(-3), null, 0, 0, 0],
    ].map(([name, status, target_group, started_at, completed_at, sent_count, clicked_count, reported_count]) => ({ name, status, target_group, started_at, completed_at, sent_count, clicked_count, reported_count })),
  );

  await insert(
    "compliance_controls",
    ["framework", "control_id", "title", "status", "score", "owner_id", "description"],
    [
      ["NIST 800-53", "AC-2", "Account management", "compliant", 92, userIds[0], "Automated joiner/mover/leaver controls"],
      ["NIST 800-53", "AU-6", "Audit review and reporting", "in_progress", 78, userIds[1], "Daily audit review with AI summarisation"],
      ["NIST 800-53", "IR-4", "Incident handling", "compliant", 88, userIds[0], "Documented IR plan and SOAR playbooks"],
      ["NIST 800-53", "SC-7", "Boundary protection", "compliant", 90, userIds[5], "Segmented perimeter with default deny"],
      ["ISO 27001", "A.5.15", "Access control", "compliant", 89, userIds[0], "RBAC with quarterly reviews"],
      ["ISO 27001", "A.8.8", "Technical vulnerability management", "in_progress", 74, userIds[4], "Weekly scanning and SLA tracking"],
      ["ISO 27001", "A.5.24", "Incident management planning", "compliant", 86, userIds[1], "Incident response framework"],
      ["ISO 27001", "A.8.16", "Monitoring activities", "compliant", 93, userIds[6], "24/7 SOC monitoring"],
      ["HIPAA", "164.312(a)(1)", "Access control", "compliant", 91, userIds[3], "Unique user identification and emergency access"],
      ["HIPAA", "164.312(b)", "Audit controls", "compliant", 87, userIds[3], "Audit logging across ePHI systems"],
      ["HIPAA", "164.308(a)(6)", "Security incident procedures", "in_progress", 79, userIds[0], "Incident procedures under review"],
      ["HIPAA", "164.312(e)(1)", "Transmission security", "compliant", 94, userIds[5], "TLS everywhere, mTLS internal"],
      ["PCI DSS", "1.3", "Network access controls", "compliant", 85, userIds[5], "Segmentation of CDE"],
      ["PCI DSS", "10.2", "Audit logging", "compliant", 88, userIds[1], "Centralised immutable logging"],
      ["PCI DSS", "6.4", "Public-facing web protection", "in_progress", 72, userIds[4], "WAF tuning in progress"],
      ["PCI DSS", "11.3", "Penetration testing", "compliant", 83, userIds[0], "Annual and post-change tests"],
    ].map(([framework, control_id, title, status, score, owner_id, description]) => ({ framework, control_id, title, status, score, owner_id, description })),
  );

  await insert(
    "risk_assessments",
    ["title", "status", "score", "asset_id", "owner_id", "methodology", "description"],
    Array.from({ length: 14 }).map(() => ({
      title: `Risk assessment · ${pick(assets).name}`,
      status: pick(["draft", "in_review", "approved", "expired"]),
      score: int(20, 95),
      asset_id: pick(assetIds),
      owner_id: pick(userIds),
      methodology: pick(["NIST 800-30", "FAIR", "OCTAVE", "ISO 27005"]),
      description: "Assessment of confidentiality, integrity and availability exposure for the in-scope asset.",
    })),
  );

  await insert(
    "policies",
    ["name", "category", "status", "version", "description", "content", "effective_date"],
    [
      ["Acceptable Use Policy", "workforce", "published", "3.1", "Rules for acceptable use of Medicare systems", "Employees must use company assets responsibly and report incidents."],
      ["Incident Response Policy", "security", "published", "2.4", "Incident classification and response", "All incidents are triaged within 15 minutes by the SOC."],
      ["Access Control Policy", "security", "published", "4.0", "Least privilege and MFA", "Privileged access requires MFA and quarterly recertification."],
      ["Data Retention Policy", "privacy", "in_review", "1.8", "Retention of patient and security data", "Security logs retained for 12 months, ePHI per HIPAA."],
      ["Vulnerability Management Policy", "security", "published", "2.0", "Remediation SLAs by severity", "Critical vulnerabilities remediated within 72 hours."],
      ["Third-Party Risk Policy", "governance", "published", "1.5", "Vendor due diligence", "Tier-1 vendors reviewed annually."],
      ["Backup and Recovery Policy", "resilience", "published", "3.3", "Backup testing and recovery", "Backups tested quarterly with documented RTO/RPO."],
      ["AI Usage Policy", "governance", "draft", "0.9", "Responsible use of AI in SOC", "AI outputs require human validation before action."],
    ].map(([name, category, status, version, description, content]) => ({ name, category, status, version, description, content, effective_date: daysAgo(-int(30, 200)) })),
  );

  await insert(
    "vendors",
    ["name", "category", "risk_level", "status", "contact_email", "website", "description"],
    [
      ["CrowdStrike", "EDR", "low", "active", "security@crowdstrike.com", "https://crowdstrike.com", "Endpoint detection and response"],
      ["Palo Alto Networks", "Network", "low", "active", "support@paloaltonetworks.com", "https://paloaltonetworks.com", "Perimeter firewalls"],
      ["Veeam", "Backup", "medium", "active", "support@veeam.com", "https://veeam.com", "Backup and recovery"],
      ["Elastic", "SIEM", "low", "active", "support@elastic.co", "https://elastic.co", "Security analytics platform"],
      ["Okta", "Identity", "low", "active", "support@okta.com", "https://okta.com", "Identity provider"],
      ["Cloudflare", "CDN/WAF", "low", "active", "support@cloudflare.com", "https://cloudflare.com", "Edge protection"],
      ["Clinical Data Systems", "EHR", "high", "under_review", "security@clinicaldata.example", "https://clinicaldata.example", "EHR integration vendor"],
      ["Acme Billing", "Finance", "medium", "active", "security@acmebilling.example", "https://acmebilling.example", "Billing processor"],
      ["MedDevice Corp", "IoT", "high", "active", "security@meddevice.example", "https://meddevice.example", "Medical IoT devices"],
      ["SecureMail", "Email", "medium", "active", "security@securemail.example", "https://securemail.example", "Email security gateway"],
    ].map(([name, category, risk_level, status, contact_email, website, description]) => ({ name, category, risk_level, status, contact_email, website, description })),
  );

  await insert(
    "tickets",
    ["subject", "status", "priority", "requester_id", "assignee_id", "description"],
    Array.from({ length: 22 }).map(() => ({
      subject: pick(["MFA reset request", "Suspicious email report", "Access request for SIEM", "Laptop compliance issue", "Firewall change request", "Phishing simulation question", "Password reset", "New starter onboarding"]),
      status: pick(["open", "in_progress", "waiting", "resolved", "closed"]),
      priority: pick(["low", "medium", "high", "critical"]),
      requester_id: pick(userIds),
      assignee_id: pick(analystIds),
      description: "Service request raised through the MedicareGuard employee portal.",
    })),
  );

  await insert(
    "knowledge_base",
    ["title", "category", "status", "content", "author_id", "tags"],
    [
      ["How to triage a critical alert", "runbook", "published", "Validate, enrich, contain, escalate within 15 minutes.", userIds[1], ["triage", "alerts"]],
      ["Ransomware containment checklist", "runbook", "published", "Isolate hosts, preserve evidence, disable accounts, restore from backup.", userIds[0], ["ransomware", "incident-response"]],
      ["Firewall rule deployment", "process", "published", "Peer review, change ticket, deploy to edge, validate hit counts.", userIds[5], ["firewall", "change"]],
      ["Phishing analysis guide", "runbook", "published", "Inspect headers, detonate URLs, purge mailboxes, reset credentials.", userIds[2], ["phishing", "email"]],
      ["HIPAA breach notification", "compliance", "published", "Assess risk, notify privacy office within 24 hours, document decision.", userIds[3], ["hipaa", "privacy"]],
      ["Using the AI analyst safely", "guide", "published", "AI output is advisory; confirm with telemetry before action.", userIds[0], ["ai", "governance"]],
      ["Vulnerability SLA matrix", "process", "published", "Critical 72h, high 14d, medium 30d, low 90d.", userIds[4], ["vulnerability", "sla"]],
      ["Incident severity matrix", "guide", "published", "P1 critical business impact, P2 high, P3 medium, P4 low.", userIds[0], ["incident", "severity"]],
      ["CloudTrail investigation", "runbook", "published", "Scope by principal, eventName and source IP; correlate with GuardDuty.", userIds[6], ["aws", "cloud"]],
      ["n8n automation operations", "process", "published", "Monitor failed executions, retry idempotently, review audit logs.", userIds[0], ["n8n", "automation"]],
    ].map(([title, category, status, content, author_id, tags]) => ({ title, category, status, content, author_id, tags })),
  );

  await insert(
    "tags",
    ["name", "color", "description"],
    [
      ["critical", "#ff4d6d", "Critical severity or impact"],
      ["ransomware", "#f97316", "Ransomware-related activity"],
      ["phishing", "#eab308", "Phishing and social engineering"],
      ["patient-data", "#8b5cf6", "Involves ePHI"],
      ["insider", "#ec4899", "Insider threat"],
      ["cloud", "#06b6d4", "Cloud infrastructure"],
      ["network", "#3b82f6", "Network telemetry"],
      ["identity", "#22c55e", "Identity and access"],
      ["compliance", "#14b8a6", "Regulatory relevance"],
      ["automated", "#a855f7", "Created by automation"],
      ["hunting", "#f59e0b", "Threat hunt hypothesis"],
      ["regression", "#64748b", "Detection regression test"],
    ].map(([name, color, description]) => ({ name, color, description })),
  );

  await insert(
    "settings",
    ["key", "value", "scope", "description", "updated_by"],
    [
      ["soc.name", JSON.stringify("MedicareGuard SOC"), "global", "Display name", userIds[0]],
      ["soc.retention_days", JSON.stringify(365), "global", "Security data retention", userIds[0]],
      ["alerts.auto_escalate_critical", JSON.stringify(true), "alerts", "Auto-create incident for critical alerts", userIds[0]],
      ["ai.enabled", JSON.stringify(true), "ai", "Enable AI analyst", userIds[0]],
      ["ai.model", JSON.stringify("medicareguard-analyst"), "ai", "Default AI model", userIds[0]],
      ["firewall.auto_block", JSON.stringify(true), "firewall", "Automatically block critical threat IPs", userIds[0]],
      ["report.schedule.weekly", JSON.stringify({ template: "executive", cadence: "weekly", recipients: ["ciso@medicareguard.io"], format: "pdf", enabled: true }), "reporting", "Weekly executive report", userIds[0]],
      ["notifications.email", JSON.stringify(true), "notifications", "Email notifications enabled", userIds[0]],
      ["mfa.enforced", JSON.stringify(true), "identity", "MFA enforced for privileged roles", userIds[0]],
      ["n8n.base_url", JSON.stringify("http://n8n:5678"), "integrations", "Automation base URL", userIds[0]],
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
          "Correlated with the latest CTI feed — same infrastructure as the previous campaign.",
          "Containment applied on the affected workload. Monitoring for re-infection.",
          "Asset owner notified and patching scheduled within SLA.",
          "False positive confirmed after reviewing the EDR process tree.",
          "AI analyst suggests blocking the source IP at the edge firewall.",
          "Evidence attached to the case and timeline updated.",
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
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} report · ${new Date(daysAgo(int(1, 30))).toISOString().slice(0, 10)}`,
        type,
        status: pick(["ready", "ready", "ready", "generating", "archived"]),
        format: pick(["pdf", "csv", "json"]),
        period_start: daysAgo(int(30, 60)),
        period_end: daysAgo(int(0, 5)),
        created_by: pick(analystIds),
        summary: "Automated security report generated from live SOC telemetry.",
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
      [userIds[0], "Triage critical ransomware alert", "medicareguard-analyst"],
      [userIds[1], "Top attack origins this week", "medicareguard-analyst"],
      [userIds[2], "Compliance gaps for HIPAA", "medicareguard-analyst"],
    ].map(([user_id, title, model]) => ({ user_id, title, model })),
  );
  await insert(
    "ai_messages",
    ["conversation_id", "role", "content", "tokens"],
    [
      [conversations[0].id, "user", "Phân tích cảnh báo ransomware nghiêm trọng nhất và đề xuất cách xử lý.", 28],
      [conversations[0].id, "assistant", "Cảnh báo ransomware nghiêm trọng cần được cô lập trong 15 phút đầu. Khuyến nghị: cô lập máy chủ bị ảnh hưởng, thu thập forensic image, chặn IP nguồn tại firewall và xoay vòng credential.", 58],
      [conversations[1].id, "user", "Who are the top attackers this week?", 12],
      [conversations[1].id, "assistant", "The top source IPs are concentrated in CN, RU and IR. I recommend blocking risk ≥ 80 IPs and monitoring the rest for 24 hours.", 34],
      [conversations[2].id, "user", "Which HIPAA controls need attention?", 10],
      [conversations[2].id, "assistant", "The HIPAA incident procedure control is in progress at 79%. Assign an owner and close the evidence gaps within 30 days.", 32],
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
      title: pick(["Critical alert assigned", "Incident SLA approaching", "Report ready", "New threat intel match", "Scan completed"]),
      message: pick(["A critical alert requires your review.", "Incident INC-2026 is approaching its SLA deadline.", "Your weekly report is ready to download.", "New IOC matched an internal asset.", "The scheduled vulnerability scan finished."]),
      type: pick(["alert", "incident", "report", "intel", "scan"]),
      read: chance(0.4),
      link: pick(["/alerts", "/incidents", "/reports", "/threats", "/assets"]),
    })),
  );

  await insert(
    "api_keys",
    ["name", "key_prefix", "key_hash", "user_id", "scopes", "last_used_at", "expires_at", "revoked"],
    [
      ["n8n automation", "mg_live_n8n", "hash-n8n-automation", userIds[0], ["alerts:write", "incidents:write", "ai:use"], hoursAgo(0), daysAgo(-180), false],
      ["Grafana read-only", "mg_live_graf", "hash-grafana-read", userIds[3], ["read"], hoursAgo(2), daysAgo(-90), false],
      ["Legacy SIEM bridge", "mg_legacy_siem", "hash-legacy-siem", userIds[1], ["read"], daysAgo(45), daysAgo(5), true],
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
