const express = require("express");
const PDFDocument = require("pdfkit");
const { query } = require("../config/db");
const { asyncHandler, HttpError, parsePagination } = require("../utils/http");
const { requirePermission } = require("../middleware/auth");
const { recordAudit } = require("../services/audit");

const router = express.Router();

const TEMPLATES = [
  { id: "executive", name: "Executive Security Brief", description: "Board-level posture, risk and compliance summary", formats: ["pdf", "csv", "json"], cadence: "weekly" },
  { id: "threat", name: "Threat Landscape Report", description: "Attack origins, actors, categories and MITRE coverage", formats: ["pdf", "csv", "json"], cadence: "daily" },
  { id: "incident", name: "Incident Response Review", description: "Incident lifecycle, SLA/MttR and root causes", formats: ["pdf", "csv", "json"], cadence: "weekly" },
  { id: "compliance", name: "Compliance Posture", description: "NIST, ISO 27001, HIPAA and PCI DSS control scores", formats: ["pdf", "json"], cadence: "monthly" },
  { id: "vulnerability", name: "Vulnerability Management", description: "Open CVEs, exploitation risk and remediation SLA", formats: ["pdf", "csv", "json"], cadence: "weekly" },
  { id: "firewall", name: "Network Enforcement", description: "Firewall rule effectiveness and blocked traffic", formats: ["pdf", "csv"], cadence: "daily" },
];

const buildReportData = async (rangeDays = 30) => {
  const [overview, countries, attackers, categories, severities, incidents, compliance, assets, vulnerabilities] = await Promise.all([
    query(
      `SELECT
        (SELECT count(*)::int FROM alerts WHERE detected_at > now() - ($1 || ' days')::interval) AS alerts,
        (SELECT count(*)::int FROM alerts WHERE detected_at > now() - ($1 || ' days')::interval AND severity = 'critical') AS critical_alerts,
        (SELECT count(*)::int FROM threats WHERE last_seen > now() - ($1 || ' days')::interval) AS threats,
        (SELECT count(*)::int FROM incidents WHERE detected_at > now() - ($1 || ' days')::interval) AS incidents,
        (SELECT count(*)::int FROM incidents WHERE status NOT IN ('resolved','closed')) AS open_incidents,
        (SELECT round(avg(risk_score))::int FROM assets) AS avg_asset_risk,
        (SELECT count(*)::int FROM assets) AS assets,
        (SELECT count(*)::int FROM vulnerabilities WHERE status = 'open') AS open_vulnerabilities,
        (SELECT round(avg(score))::int FROM compliance_controls) AS compliance_score,
        (SELECT round(avg(extract(epoch FROM (resolved_at - detected_at)) / 3600)::numeric, 1) FROM incidents WHERE resolved_at IS NOT NULL) AS mttr_hours`,
      [rangeDays],
    ),
    query("SELECT * FROM v_attacks_by_country LIMIT 10"),
    query("SELECT * FROM v_top_attackers LIMIT 10"),
    query("SELECT coalesce(category,'Uncategorised') AS category, count(*)::int AS total FROM threats GROUP BY category ORDER BY total DESC LIMIT 8"),
    query("SELECT severity, count(*)::int AS total FROM alerts GROUP BY severity"),
    query("SELECT incident_key, title, severity, status, priority, detected_at, resolved_at FROM incidents ORDER BY detected_at DESC LIMIT 12"),
    query("SELECT framework, round(avg(score))::int AS score, count(*)::int AS controls, count(*) FILTER (WHERE status = 'compliant')::int AS compliant FROM compliance_controls GROUP BY framework ORDER BY score DESC"),
    query("SELECT name, type, criticality, risk_score FROM assets ORDER BY risk_score DESC LIMIT 10"),
    query("SELECT title, severity, cvss_score, cve_id, status FROM vulnerabilities ORDER BY cvss_score DESC LIMIT 12"),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    periodDays: rangeDays,
    overview: overview.rows[0],
    countries: countries.rows,
    attackers: attackers.rows,
    categories: categories.rows,
    severities: severities.rows,
    incidents: incidents.rows,
    compliance: compliance.rows,
    assets: assets.rows,
    vulnerabilities: vulnerabilities.rows,
  };
};

const renderPdf = (doc, data, name = "MedicareGuard Security Report") => {
  const brand = "#0b1220";
  const accent = "#2563eb";
  const muted = "#64748b";
  const pageWidth = doc.page.width;

  doc.rect(0, 0, pageWidth, 110).fill(brand);
  doc.rect(0, 104, pageWidth, 6).fill(accent);
  doc.fillColor("#ffffff").fontSize(24).font("Helvetica-Bold").text("MedicareGuard", 50, 32);
  doc.fillColor("#93c5fd").fontSize(11).font("Helvetica").text("SECURITY OPERATIONS CENTER", 50, 62);
  doc.fillColor("#cbd5e1").fontSize(10).text(name, 50, 80, { width: pageWidth - 100, align: "right" });
  doc.fillColor(muted).fontSize(9).text(`Generated ${new Date(data.generatedAt).toLocaleString("en-GB")} · period ${data.periodDays} days`, 50, 122);

  let y = 155;
  const o = data.overview;
  const kpis = [
    ["Alerts", o.alerts],
    ["Critical", o.critical_alerts],
    ["Threats", o.threats],
    ["Incidents", o.incidents],
    ["Open Incidents", o.open_incidents],
    ["Avg Asset Risk", o.avg_asset_risk || 0],
    ["Compliance", `${o.compliance_score || 0}%`],
    ["MttR (h)", o.mttr_hours || 0],
  ];
  const cardWidth = (pageWidth - 100 - 21) / 4;
  kpis.forEach(([label, value], index) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    const x = 50 + col * (cardWidth + 7);
    const cy = y + row * 62;
    doc.roundedRect(x, cy, cardWidth, 54, 6).fill("#f1f5f9");
    doc.fillColor(muted).fontSize(8).font("Helvetica").text(label.toUpperCase(), x + 10, cy + 9);
    doc.fillColor(brand).fontSize(18).font("Helvetica-Bold").text(String(value), x + 10, cy + 23);
  });
  y += 140;

  doc.fillColor(brand).fontSize(14).font("Helvetica-Bold").text("Top Attack Origins", 50, y);
  y += 22;
  doc.fontSize(9).font("Helvetica");
  data.countries.slice(0, 8).forEach((row, index) => {
    doc.fillColor(muted).text(`${index + 1}. ${row.country} (${row.country_code})`, 55, y, { width: 250 });
    doc.fillColor(brand).text(`${row.attacks} events · risk ${row.avg_risk}`, 320, y, { width: 220, align: "right" });
    y += 16;
  });

  y += 14;
  doc.fillColor(brand).fontSize(14).font("Helvetica-Bold").text("Threat Categories", 50, y);
  y += 22;
  data.categories.forEach((row) => {
    doc.fillColor(muted).fontSize(9).font("Helvetica").text(row.category, 55, y, { width: 250 });
    doc.fillColor(brand).text(String(row.total), 320, y, { width: 220, align: "right" });
    y += 16;
  });

  y += 14;
  doc.fillColor(brand).fontSize(14).font("Helvetica-Bold").text("Recent Incidents", 50, y);
  y += 22;
  data.incidents.slice(0, 8).forEach((row) => {
    doc.fillColor(muted).fontSize(8).font("Helvetica").text(`${row.incident_key} · ${row.severity.toUpperCase()} · ${row.status}`, 55, y, { width: 480 });
    y += 14;
  });

  doc.addPage();
  doc.fillColor(brand).fontSize(16).font("Helvetica-Bold").text("Compliance & Vulnerability Posture", 50, 50);
  y = 80;
  data.compliance.forEach((row) => {
    doc.fillColor(muted).fontSize(10).font("Helvetica").text(`${row.framework} — ${row.compliant}/${row.controls} controls compliant`, 55, y, { width: 350 });
    doc.fillColor(accent).font("Helvetica-Bold").text(`${row.score}%`, 420, y, { width: 120, align: "right" });
    y += 20;
  });
  y += 20;
  doc.fillColor(brand).fontSize(14).font("Helvetica-Bold").text("Top Vulnerabilities", 50, y);
  y += 22;
  data.vulnerabilities.forEach((row) => {
    doc.fillColor(muted).fontSize(9).font("Helvetica").text(`${row.cve_id || "CVE-—"} · ${row.title}`, 55, y, { width: 380 });
    doc.fillColor(brand).text(`CVSS ${row.cvss_score}`, 440, y, { width: 100, align: "right" });
    y += 16;
    if (y > 730) {
      doc.addPage();
      y = 50;
    }
  });

  doc.fontSize(8).fillColor(muted).text("CONFIDENTIAL — MedicareGuard SOC · Automatically generated by the reporting service", 50, 770, { width: pageWidth - 100, align: "center" });
  doc.end();
};

router.get(
  "/templates",
  asyncHandler(async (_req, res) => {
    res.json({ data: TEMPLATES });
  }),
);

router.get(
  "/schedules",
  asyncHandler(async (_req, res) => {
    const result = await query("SELECT * FROM settings WHERE key LIKE 'report.schedule.%' ORDER BY created_at DESC");
    res.json({ data: result.rows });
  }),
);

router.post(
  "/schedule",
  requirePermission("reports:write"),
  asyncHandler(async (req, res) => {
    const { name, template = "executive", cadence = "weekly", recipients = [], format = "pdf", enabled = true } = req.body;
    if (!name) throw new HttpError(400, "name is required");
    const key = `report.schedule.${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const value = { template, cadence, recipients, format, enabled };
    const result = await query(
      `INSERT INTO settings (key, value, scope, description, updated_by) VALUES ($1,$2,'reporting',$3,$4)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by RETURNING *`,
      [key, JSON.stringify(value), `Scheduled ${template} report`, req.user.id],
    );
    res.status(201).json({ data: result.rows[0] });
  }),
);

router.delete(
  "/schedules/:id",
  requirePermission("reports:write"),
  asyncHandler(async (req, res) => {
    const result = await query("DELETE FROM settings WHERE id = $1 AND key LIKE 'report.schedule.%' RETURNING id", [req.params.id]);
    if (!result.rows.length) throw new HttpError(404, "Schedule not found");
    res.json({ deleted: true, id: req.params.id });
  }),
);

router.get(
  "/export/pdf",
  asyncHandler(async (req, res) => {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    const data = await buildReportData(days);
    const name = String(req.query.name || "Security Operations Report");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="medicareguard-report-${Date.now()}.pdf"`);
    const doc = new PDFDocument({ size: "A4", margin: 50, info: { Title: name, Author: "MedicareGuard SOC" } });
    doc.pipe(res);
    renderPdf(doc, data, name);
    await query(
      `INSERT INTO reports (name, type, status, format, period_start, period_end, created_by, summary, metadata)
       VALUES ($1,'executive','ready','pdf', now() - ($2 || ' days')::interval, now(), $3, $4, $5)`,
      [name, days, req.user?.id || null, `On-demand PDF export covering ${days} days`, JSON.stringify({ days, generatedBy: req.user?.email })],
    );
  }),
);

router.get(
  "/export/csv",
  asyncHandler(async (req, res) => {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    const data = await buildReportData(days);
    const rows = [
      ["metric", "value"],
      ["period_days", days],
      ["alerts", data.overview.alerts],
      ["critical_alerts", data.overview.critical_alerts],
      ["threats", data.overview.threats],
      ["incidents", data.overview.incidents],
      ["open_incidents", data.overview.open_incidents],
      ["avg_asset_risk", data.overview.avg_asset_risk],
      ["compliance_score", data.overview.compliance_score],
      ["mttr_hours", data.overview.mttr_hours],
      [],
      ["country", "country_code", "attacks", "high_severity", "avg_risk"],
      ...data.countries.map((row) => [row.country, row.country_code, row.attacks, row.high_severity, row.avg_risk]),
      [],
      ["category", "total"],
      ...data.categories.map((row) => [row.category, row.total]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="medicareguard-report-${Date.now()}.csv"`);
    res.send(csv);
  }),
);

router.get(
  "/export/json",
  asyncHandler(async (req, res) => {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    const data = await buildReportData(days);
    res.setHeader("Content-Disposition", `attachment; filename="medicareguard-report-${Date.now()}.json"`);
    res.json({ data });
  }),
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const values = [];
    const conditions = [];
    if (req.query.q) {
      values.push(`%${req.query.q}%`);
      conditions.push(`(name ILIKE $${values.length} OR summary ILIKE $${values.length})`);
    }
    ["type", "status", "format"].forEach((field) => {
      if (req.query[field]) {
        values.push(req.query[field]);
        conditions.push(`${field} = $${values.length}`);
      }
    });
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const count = await query(`SELECT count(*)::int AS total FROM reports ${where}`, values);
    const dataResult = await query(
      `SELECT r.*, u.full_name AS created_by_name FROM reports r LEFT JOIN users u ON u.id = r.created_by ${where.replace(/\b(name|type|status|format|summary)\b/g, "r.$1")} ORDER BY r.created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset],
    );
    const total = count.rows[0].total;
    res.json({ data: dataResult.rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } });
  }),
);

router.post(
  "/generate",
  requirePermission("reports:write"),
  asyncHandler(async (req, res) => {
    const { name = "Security Operations Report", type = "executive", format = "pdf", days = 30 } = req.body;
    const data = await buildReportData(Number(days));
    const result = await query(
      `INSERT INTO reports (name, type, status, format, period_start, period_end, created_by, summary, metadata)
       VALUES ($1,$2,'ready',$3, now() - ($4 || ' days')::interval, now(), $5, $6, $7) RETURNING *`,
      [name, type, format, Number(days), req.user.id, `Generated ${type} report for the last ${days} days`, JSON.stringify({ snapshot: data.overview })],
    );
    await recordAudit({ req, action: "generate", resource: "reports", resourceId: result.rows[0].id });
    res.status(201).json({ data: result.rows[0], snapshot: data.overview });
  }),
);

router.get(
  "/:id/download",
  asyncHandler(async (req, res) => {
    const result = await query("SELECT * FROM reports WHERE id = $1", [req.params.id]);
    if (!result.rows.length) throw new HttpError(404, "Report not found");
    const report = result.rows[0];
    const data = await buildReportData(30);
    if (report.format === "pdf") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${report.name.replace(/[^a-z0-9]/gi, "-")}.pdf"`);
      const doc = new PDFDocument({ size: "A4", margin: 50, info: { Title: report.name, Author: "MedicareGuard SOC" } });
      doc.pipe(res);
      renderPdf(doc, data, report.name);
      return;
    }
    if (report.format === "csv") {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${report.name.replace(/[^a-z0-9]/gi, "-")}.csv"`);
      return res.send(`metric,value\nalerts,${data.overview.alerts}\nthreats,${data.overview.threats}\nincidents,${data.overview.incidents}\ncompliance,${data.overview.compliance_score}\n`);
    }
    res.setHeader("Content-Disposition", `attachment; filename="${report.name.replace(/[^a-z0-9]/gi, "-")}.json"`);
    res.json({ data });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await query("SELECT * FROM reports WHERE id = $1", [req.params.id]);
    if (!result.rows.length) throw new HttpError(404, "Report not found");
    res.json({ data: result.rows[0] });
  }),
);

router.post(
  "/",
  requirePermission("reports:write"),
  asyncHandler(async (req, res) => {
    const { name, type = "executive", status = "ready", format = "pdf", summary, metadata = {} } = req.body;
    if (!name) throw new HttpError(400, "name is required");
    const result = await query(
      `INSERT INTO reports (name, type, status, format, created_by, summary, metadata) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, type, status, format, req.user.id, summary || null, JSON.stringify(metadata)],
    );
    res.status(201).json({ data: result.rows[0] });
  }),
);

router.put(
  "/:id",
  requirePermission("reports:write"),
  asyncHandler(async (req, res) => {
    const allowed = ["name", "type", "status", "format", "summary", "metadata"];
    const fields = allowed.filter((field) => req.body[field] !== undefined);
    if (!fields.length) throw new HttpError(400, "No valid fields supplied");
    const values = fields.map((field) => (field === "metadata" ? JSON.stringify(req.body[field]) : req.body[field]));
    values.push(req.params.id);
    const result = await query(`UPDATE reports SET ${fields.map((field, index) => `${field} = $${index + 1}`).join(", ")} WHERE id = $${values.length} RETURNING *`, values);
    if (!result.rows.length) throw new HttpError(404, "Report not found");
    res.json({ data: result.rows[0] });
  }),
);

router.delete(
  "/:id",
  requirePermission("delete"),
  asyncHandler(async (req, res) => {
    const result = await query("DELETE FROM reports WHERE id = $1 RETURNING id", [req.params.id]);
    if (!result.rows.length) throw new HttpError(404, "Report not found");
    await recordAudit({ req, action: "delete", resource: "reports", resourceId: req.params.id });
    res.json({ deleted: true, id: req.params.id });
  }),
);

module.exports = router;
