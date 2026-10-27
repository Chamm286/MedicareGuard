const { query } = require("../config/db");
const config = require("../config/env");
const logger = require("../utils/logger");

const VI_REGEX = /[àáâãèéêìíòóôõùúýăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;

const isVietnamese = (text = "") => VI_REGEX.test(text);

const getContext = async () => {
  const [overview, countries, attackers, alerts, incidents, assets, compliance, firewall] = await Promise.all([
    query(`SELECT
      (SELECT count(*)::int FROM alerts) AS total_alerts,
      (SELECT count(*)::int FROM alerts WHERE status IN ('open','investigating')) AS open_alerts,
      (SELECT count(*)::int FROM alerts WHERE severity = 'critical' AND status NOT IN ('resolved','false_positive')) AS critical_alerts,
      (SELECT count(*)::int FROM threats WHERE status = 'active') AS active_threats,
      (SELECT count(*)::int FROM incidents WHERE status NOT IN ('resolved','closed')) AS open_incidents,
      (SELECT count(*)::int FROM assets) AS total_assets,
      (SELECT count(*)::int FROM assets WHERE risk_score >= 70) AS high_risk_assets,
      (SELECT count(*)::int FROM vulnerabilities WHERE status = 'open') AS open_vulnerabilities,
      (SELECT count(*)::int FROM firewall_rules WHERE enabled) AS enabled_rules,
      (SELECT round(avg(risk_score))::int FROM assets) AS avg_asset_risk,
      (SELECT round(avg(score))::int FROM compliance_controls) AS compliance_score,
      (SELECT count(*)::int FROM alerts WHERE detected_at > now() - interval '24 hours') AS alerts_24h`),
    query("SELECT * FROM v_attacks_by_country LIMIT 6"),
    query("SELECT * FROM v_top_attackers LIMIT 5"),
    query("SELECT id, title, severity, status, source_ip, country, detected_at FROM alerts ORDER BY detected_at DESC LIMIT 6"),
    query("SELECT id, incident_key, title, severity, status, priority, detected_at FROM incidents WHERE status NOT IN ('resolved','closed') ORDER BY detected_at DESC LIMIT 6"),
    query("SELECT id, name, type, criticality, risk_score, ip_address FROM assets ORDER BY risk_score DESC LIMIT 6"),
    query("SELECT framework, round(avg(score))::int AS score FROM compliance_controls GROUP BY framework ORDER BY score DESC"),
    query("SELECT action, count(*)::int AS total, coalesce(sum(hit_count),0)::bigint AS hits FROM firewall_rules GROUP BY action"),
  ]);
  return {
    overview: overview.rows[0],
    countries: countries.rows,
    attackers: attackers.rows,
    alerts: alerts.rows,
    incidents: incidents.rows,
    assets: assets.rows,
    compliance: compliance.rows,
    firewall: firewall.rows,
  };
};

const intentOf = (message = "") => {
  const m = message.toLowerCase();
  if (/(cảnh báo|alert|detection|phát hiện)/.test(m)) return "alerts";
  if (/(sự cố|incident|sla|mttr)/.test(m)) return "incidents";
  if (/(attacker|kẻ tấn công|source ip|top ip|ip nào|tấn công từ)/.test(m)) return "attackers";
  if (/(country|quốc gia|vùng|lãnh thổ|địa lý|geo)/.test(m)) return "countries";
  if (/(asset|tài sản|thiết bị|hạ tầng|server|máy chủ)/.test(m)) return "assets";
  if (/(compliance|tuân thủ|nist|iso|hipaa|pci)/.test(m)) return "compliance";
  if (/(firewall|tường lửa|chặn|block|rule)/.test(m)) return "firewall";
  if (/(report|báo cáo|export|pdf|xuất)/.test(m)) return "reports";
  if (/(khắc phục|remediat|mitigat|xử lý|fix|playbook)/.test(m)) return "remediation";
  if (/(tổng quan|overview|tình hình|posture|summary|summary|tóm tắt)/.test(m)) return "overview";
  if (/(xin chào|hello|hi\b|chào)/.test(m)) return "greeting";
  return "overview";
};

const pct = (value, total) => (total ? Math.round((value / total) * 100) : 0);

const compose = (intent, context, message) => {
  const vi = isVietnamese(message);
  const o = context.overview;
  const insights = [];
  const suggestions = [];
  let reply = "";

  switch (intent) {
    case "greeting":
      reply = vi
        ? `Xin chào, tôi là **MedicareGuard AI Analyst**. Tôi đang kết nối trực tiếp với SOC database và có thể phân tích cảnh báo, kẻ tấn công, tài sản, sự cố, firewall và tuân thủ theo thời gian thực.\n\nHiện có **${o.open_alerts} cảnh báo đang mở**, trong đó **${o.critical_alerts} nghiêm trọng**, và **${o.open_incidents} sự cố** chưa đóng.`
        : `Hello, I am the **MedicareGuard AI Analyst**. I am connected to the live SOC database and can investigate alerts, attackers, assets, incidents, firewall posture and compliance.\n\nRight now there are **${o.open_alerts} open alerts** (${o.critical_alerts} critical) and **${o.open_incidents} open incidents**.`;
      suggestions.push(vi ? "Tóm tắt tình hình an ninh hôm nay" : "Summarise today's security posture", vi ? "Top 5 kẻ tấn công là ai?" : "Who are the top 5 attackers?", vi ? "Có sự cố nào quá SLA không?" : "Are any incidents past SLA?");
      break;

    case "alerts":
      reply = vi
        ? `**Phân tích cảnh báo** — Tổng ${o.total_alerts} cảnh báo, ${o.open_alerts} đang mở, **${o.critical_alerts} critical** và ${o.alerts_24h} cảnh báo trong 24 giờ qua.\n\n${context.alerts.map((a, i) => `${i + 1}. [${a.severity.toUpperCase()}] ${a.title} — ${a.source_ip || "unknown"} (${a.status})`).join("\n")}`
        : `**Alert analysis** — ${o.total_alerts} alerts total, ${o.open_alerts} open, **${o.critical_alerts} critical**, with ${o.alerts_24h} in the last 24 hours.\n\n${context.alerts.map((a, i) => `${i + 1}. [${a.severity.toUpperCase()}] ${a.title} — ${a.source_ip || "unknown"} (${a.status})`).join("\n")}`;
      suggestions.push(vi ? "Ưu tiên xử lý cảnh báo critical" : "Prioritise the critical alerts", vi ? "Tạo incident từ cảnh báo nghiêm trọng nhất" : "Escalate the most severe alert");
      break;

    case "incidents":
      reply = vi
        ? `**Sự cố đang mở: ${o.open_incidents}**\n\n${context.incidents.length ? context.incidents.map((i) => `• ${i.incident_key} — ${i.title} · ${i.severity}/${i.priority} · ${i.status}`).join("\n") : "Không có sự cố nào đang mở."}\n\nKhuyến nghị: áp dụng containment trong 4 giờ đầu đối với P1, xác minh root cause trước khi đóng sự cố.`
        : `**Open incidents: ${o.open_incidents}**\n\n${context.incidents.length ? context.incidents.map((i) => `• ${i.incident_key} — ${i.title} · ${i.severity}/${i.priority} · ${i.status}`).join("\n") : "No open incidents."}\n\nRecommendation: apply containment within the first 4 hours for P1s and verify root cause before closure.`;
      suggestions.push(vi ? "Tính MTTR theo mức độ" : "Break down MttR by severity", vi ? "Sự cố nào sắp quá SLA?" : "Which incidents are approaching SLA breach?");
      break;

    case "attackers":
      reply = vi
        ? `**Top kẻ tấn công theo số sự kiện**\n\n${context.attackers.map((a, i) => `${i + 1}. \`${a.source_ip}\` — ${a.country || "Unknown"} · ${a.events} sự kiện · risk ${a.avg_risk}`).join("\n")}\n\nNên chặn các IP có risk ≥ 80 tại firewall và theo dõi chặt các IP còn lại.`
        : `**Top attackers by event volume**\n\n${context.attackers.map((a, i) => `${i + 1}. \`${a.source_ip}\` — ${a.country || "Unknown"} · ${a.events} events · risk ${a.avg_risk}`).join("\n")}\n\nBlock IPs with risk ≥ 80 at the firewall and increase monitoring on the rest.`;
      suggestions.push(vi ? "Chặn các IP nguy hiểm nhất" : "Block the highest-risk IPs", vi ? "Xuất danh sách attacker ra CSV" : "Export the attacker list to CSV");
      break;

    case "countries":
      reply = vi
        ? `**Phân bố tấn công theo quốc gia**\n\n${context.countries.map((c) => `• ${c.country} (${c.country_code}) — ${c.attacks} sự kiện, risk TB ${c.avg_risk}${c.high_severity ? `, ${c.high_severity} nghiêm trọng` : ""}`).join("\n")}\n\nƯu tiên chặn theo geo ở các quốc gia có mật độ critical cao nếu không thuộc phạm vi kinh doanh.`
        : `**Attack distribution by country**\n\n${context.countries.map((c) => `• ${c.country} (${c.country_code}) — ${c.attacks} events, avg risk ${c.avg_risk}${c.high_severity ? `, ${c.high_severity} high-risk` : ""}`).join("\n")}\n\nPrioritise geo-blocking for countries with high critical density that are outside your business footprint.`;
      suggestions.push(vi ? "Vẽ bản đồ tấn công toàn cầu" : "Show the global attack map", vi ? "So sánh 7 ngày gần nhất" : "Compare the last 7 days");
      break;

    case "assets":
      reply = vi
        ? `**Tài sản rủi ro cao** — ${o.total_assets} tài sản, ${o.high_risk_assets} có risk ≥ 70, risk trung bình ${o.avg_asset_risk}/100.\n\n${context.assets.map((a) => `• ${a.name} (${a.type}) — ${a.criticality}, risk ${a.risk_score}, IP ${a.ip_address || "n/a"}`).join("\n")}`
        : `**High-risk assets** — ${o.total_assets} assets, ${o.high_risk_assets} at risk ≥ 70, average risk ${o.avg_asset_risk}/100.\n\n${context.assets.map((a) => `• ${a.name} (${a.type}) — ${a.criticality}, risk ${a.risk_score}, IP ${a.ip_address || "n/a"}`).join("\n")}`;
      suggestions.push(vi ? "Đề xuất khắc phục cho tài sản rủi ro nhất" : "Recommend remediation for the riskiest asset", vi ? "Chạy scan cho tài sản critical" : "Run a scan on critical assets");
      break;

    case "compliance":
      reply = vi
        ? `**Tư thế tuân thủ** — điểm trung bình **${o.compliance_score}%**.\n\n${context.compliance.map((c) => `• ${c.framework}: ${c.score}%`).join("\n")}\n\nCác kiểm soát còn thiếu nên được gán owner và hạn hoàn thành 30 ngày.`
        : `**Compliance posture** — average score **${o.compliance_score}%**.\n\n${context.compliance.map((c) => `• ${c.framework}: ${c.score}%`).join("\n")}\n\nAssign owners to failing controls with a 30-day remediation deadline.`;
      suggestions.push(vi ? "Xuất báo cáo tuân thủ PDF" : "Export the compliance PDF report", vi ? "Kiểm soát nào đang fail?" : "Which controls are failing?");
      break;

    case "firewall":
      reply = vi
        ? `**Firewall** — ${o.enabled_rules} rule đang bật.\n\n${context.firewall.map((f) => `• action=${f.action}: ${f.total} rule, ${f.hits} hits`).join("\n")}\n\nNên rà soát rule deny có hit_count = 0 để tránh rule cũ không còn giá trị.`
        : `**Firewall** — ${o.enabled_rules} rules enabled.\n\n${context.firewall.map((f) => `• action=${f.action}: ${f.total} rules, ${f.hits} hits`).join("\n")}\n\nReview deny rules with zero hits to retire stale policy.`;
      suggestions.push(vi ? "Chặn top attacker bằng firewall rule" : "Create a firewall rule for the top attacker", vi ? "Rule nào bị bỏ quên?" : "Which rules are stale?");
      break;

    case "reports":
      reply = vi
        ? `Tôi có thể tạo **báo cáo điều hành, threat landscape, incident review, compliance và vulnerability** ở định dạng PDF/CSV/JSON.\n\nSố liệu hiện tại: ${o.total_alerts} cảnh báo, ${o.active_threats} threat đang hoạt động, ${o.open_incidents} sự cố mở, compliance ${o.compliance_score}%.\n\nBạn có thể bấm **Export PDF** ở trang Reports hoặc gọi \`GET /api/reports/export/pdf\`.`
        : `I can generate **executive, threat landscape, incident review, compliance and vulnerability** reports as PDF/CSV/JSON.\n\nCurrent snapshot: ${o.total_alerts} alerts, ${o.active_threats} active threats, ${o.open_incidents} open incidents, ${o.compliance_score}% compliance.\n\nUse **Export PDF** on the Reports page or call \`GET /api/reports/export/pdf\`.`;
      suggestions.push(vi ? "Tạo báo cáo tuần này" : "Generate this week's report", vi ? "Xuất danh sách top attacker" : "Export top attackers");
      break;

    case "remediation":
      reply = vi
        ? `**Khuyến nghị khắc phục ưu tiên**\n\n1. Cô lập tài sản có risk ≥ 80 (${o.high_risk_assets} tài sản) và thu thập forensic image.\n2. Chặn IP tấn công có risk cao tại firewall, bật rule deny ưu tiên 10.\n3. Vá ${o.open_vulnerabilities} lỗ hổng đang mở, ưu tiên CVSS ≥ 9.0 trong 72 giờ.\n4. Xoay vòng credential và bật MFA cho tài khoản bị ảnh hưởng.\n5. Ghi nhận timeline, root cause và cập nhật playbook SOAR tương ứng.`
        : `**Prioritised remediation plan**\n\n1. Isolate assets with risk ≥ 80 (${o.high_risk_assets} assets) and capture forensic images.\n2. Block high-risk attacker IPs at the firewall with priority 10 deny rules.\n3. Patch ${o.open_vulnerabilities} open vulnerabilities, prioritising CVSS ≥ 9.0 within 72 hours.\n4. Rotate credentials and enforce MFA for affected accounts.\n5. Record timeline and root cause, then update the matching SOAR playbook.`;
      suggestions.push(vi ? "Tạo firewall rule chặn IP" : "Create the firewall block rule", vi ? "Giao việc khắc phục cho analyst" : "Assign remediation to an analyst");
      break;

    default:
      reply = vi
        ? `**Tổng quan SOC** — ${o.total_alerts} cảnh báo (${o.open_alerts} mở, ${o.critical_alerts} critical), ${o.active_threats} threat hoạt động, ${o.open_incidents} sự cố mở, ${o.total_assets} tài sản, risk TB ${o.avg_asset_risk}/100, compliance ${o.compliance_score}%.\n\nĐiểm nóng: ${context.countries[0] ? `${context.countries[0].country} (${context.countries[0].attacks} sự kiện)` : "chưa xác định"}. Kẻ tấn công nổi bật: ${context.attackers[0]?.source_ip || "n/a"}.\n\nBạn muốn tôi đào sâu vào cảnh báo, kẻ tấn công, sự cố hay tài sản?`
        : `**SOC overview** — ${o.total_alerts} alerts (${o.open_alerts} open, ${o.critical_alerts} critical), ${o.active_threats} active threats, ${o.open_incidents} open incidents, ${o.total_assets} assets, average risk ${o.avg_asset_risk}/100, compliance ${o.compliance_score}%.\n\nHotspot: ${context.countries[0] ? `${context.countries[0].country} (${context.countries[0].attacks} events)` : "n/a"}. Top attacker: ${context.attackers[0]?.source_ip || "n/a"}.\n\nWould you like to drill into alerts, attackers, incidents or assets?`;
      suggestions.push(vi ? "Top 5 kẻ tấn công" : "Top 5 attackers", vi ? "Tài sản rủi ro cao nhất" : "Highest-risk assets", vi ? "Tình hình tuân thủ" : "Compliance posture");
  }

  insights.push(
    { label: "Open alerts", value: o.open_alerts, tone: "warning" },
    { label: "Critical", value: o.critical_alerts, tone: "critical" },
    { label: "Open incidents", value: o.open_incidents, tone: "warning" },
    { label: "Compliance", value: `${o.compliance_score}%`, tone: "success" },
  );

  const references = [];
  context.alerts.slice(0, 3).forEach((alert) => references.push({ type: "alert", id: alert.id, label: alert.title }));
  context.incidents.slice(0, 2).forEach((incident) => references.push({ type: "incident", id: incident.id, label: incident.incident_key }));

  return { reply, suggestions, insights, references, intent, language: vi ? "vi" : "en" };
};

const maybeOpenAI = async (message, context) => {
  if (!config.openai.apiKey) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.openai.apiKey}` },
      body: JSON.stringify({
        model: config.openai.model,
        messages: [
          { role: "system", content: `You are MedicareGuard SOC analyst. Answer using this live data: ${JSON.stringify(context)}` },
          { role: "user", content: message },
        ],
        temperature: 0.2,
        max_tokens: 600,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    const payload = await response.json();
    return payload.choices?.[0]?.message?.content || null;
  } catch (error) {
    logger.warn("OpenAI fallback failed", { error: error.message });
    return null;
  }
};

const chat = async (message) => {
  const startedAt = Date.now();
  const context = await getContext();
  const composed = compose(intentOf(message), context, message);
  const external = await maybeOpenAI(message, context);
  return {
    reply: external || composed.reply,
    intent: composed.intent,
    language: composed.language,
    insights: composed.insights,
    suggestions: composed.suggestions,
    references: composed.references,
    model: external ? config.openai.model : "medicareguard-analyst",
    latencyMs: Date.now() - startedAt,
  };
};

const analyzeAlert = async (alert) => {
  const severityScore = { critical: 95, high: 80, medium: 55, low: 25 }[alert.severity] || 50;
  const confidence = Math.min(99, Math.round((alert.confidence || 70) * 0.6 + severityScore * 0.4));
  const actions = [];
  if (["critical", "high"].includes(alert.severity)) {
    actions.push("Isolate the affected asset from the production network");
    actions.push("Capture volatile forensic evidence (memory, network connections, process tree)");
    actions.push("Block the source IP at the edge firewall with a priority-10 deny rule");
  } else {
    actions.push("Enrich the indicator against threat intelligence feeds");
    actions.push("Review 24 hours of related authentication and network telemetry");
  }
  if (alert.ioc_type === "ip" || alert.source_ip) actions.push("Check other assets contacted by the same source IP");
  actions.push("Attach findings to the incident timeline and notify the asset owner");

  return {
    summary: `${alert.title} is a ${alert.severity} severity ${alert.category || "security"} event${alert.source_ip ? ` originating from ${alert.source_ip}` : ""}.`,
    severity: alert.severity,
    risk_score: Math.max(alert.risk_score || 50, severityScore),
    confidence,
    mitre: { tactic: alert.mitre_tactic || "TA0001 Initial Access", technique: alert.mitre_technique || "T1190 Exploit Public-Facing Application" },
    likely_impact: alert.severity === "critical" ? "Potential patient-data exposure and service disruption" : "Limited operational impact if contained early",
    recommended_actions: actions,
    containment_eta_minutes: alert.severity === "critical" ? 15 : alert.severity === "high" ? 60 : 240,
  };
};

module.exports = { chat, compose, intentOf, getContext, analyzeAlert };
