const express = require("express");
const { query } = require("../config/db");
const { asyncHandler, HttpError, parsePagination } = require("../utils/http");
const { requirePermission } = require("../middleware/auth");
const { recordAudit, recordActivity } = require("../services/audit");

const router = express.Router();

const buildFilters = (req) => {
  const values = [];
  const conditions = [];
  if (req.query.q) {
    values.push(`%${req.query.q}%`);
    conditions.push(`(name ILIKE $${values.length} OR source_ip ILIKE $${values.length} OR ioc_value ILIKE $${values.length} OR country ILIKE $${values.length})`);
  }
  ["severity", "status", "category", "country", "country_code", "source", "ioc_type"].forEach((field) => {
    if (req.query[field]) {
      values.push(req.query[field]);
      conditions.push(`${field} = $${values.length}`);
    }
  });
  if (req.query.min_risk) {
    values.push(Number(req.query.min_risk));
    conditions.push(`risk_score >= $${values.length}`);
  }
  if (req.query.from) {
    values.push(req.query.from);
    conditions.push(`last_seen >= $${values.length}`);
  }
  return { values, where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "" };
};

router.get(
  "/export",
  asyncHandler(async (req, res) => {
    const { values, where } = buildFilters(req);
    const result = await query(`SELECT * FROM threats ${where} ORDER BY last_seen DESC LIMIT 5000`, values);
    const header = result.rows.length ? Object.keys(result.rows[0]) : ["id", "name", "severity", "source_ip", "country", "last_seen"];
    const csv = [header.join(","), ...result.rows.map((row) => header.map((key) => `"${String(row[key] ?? "").replace(/"/g, '""')}"`).join(","))];
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="medicareguard-threats-${Date.now()}.csv"`);
    res.send(csv.join("\n"));
  }),
);

router.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const [bySeverity, byCategory, byCountry, trend] = await Promise.all([
      query("SELECT severity, count(*)::int AS total FROM threats GROUP BY severity"),
      query("SELECT COALESCE(category, 'Uncategorised') AS category, count(*)::int AS total FROM threats GROUP BY category ORDER BY total DESC"),
      query("SELECT COALESCE(country, 'Unknown') AS country, COALESCE(country_code, 'UN') AS country_code, count(*)::int AS total FROM threats GROUP BY 1,2 ORDER BY total DESC LIMIT 15"),
      query(`SELECT to_char(date_trunc('day', last_seen), 'YYYY-MM-DD') AS day, count(*)::int AS total FROM threats
             WHERE last_seen > now() - interval '30 days' GROUP BY 1 ORDER BY 1`),
    ]);
    res.json({ data: { bySeverity: bySeverity.rows, byCategory: byCategory.rows, byCountry: byCountry.rows, trend: trend.rows } });
  }),
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const { values, where } = buildFilters(req);
    const sortable = { last_seen: "last_seen", risk_score: "risk_score", confidence: "confidence", severity: "severity", created_at: "created_at" };
    const sort = sortable[req.query.sort] || "last_seen";
    const order = String(req.query.order || "desc").toUpperCase() === "ASC" ? "ASC" : "DESC";
    const count = await query(`SELECT count(*)::int AS total FROM threats ${where}`, values);
    const dataResult = await query(`SELECT * FROM threats ${where} ORDER BY ${sort} ${order} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, [...values, limit, offset]);
    const total = count.rows[0].total;
    res.json({ data: dataResult.rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await query("SELECT * FROM threats WHERE id = $1", [req.params.id]);
    if (!result.rows.length) throw new HttpError(404, "Không tìm thấy mối đe dọa");
    const related = await query(
      `SELECT id, title, severity, status, detected_at FROM alerts WHERE threat_id = $1 ORDER BY detected_at DESC LIMIT 20`,
      [req.params.id],
    );
    res.json({ data: { ...result.rows[0], related_alerts: related.rows } });
  }),
);

router.get(
  "/:id/alerts",
  asyncHandler(async (req, res) => {
    const result = await query("SELECT id, title, severity, status, detected_at FROM alerts WHERE threat_id = $1 ORDER BY detected_at DESC", [req.params.id]);
    res.json({ data: result.rows });
  }),
);

router.post(
  "/",
  requirePermission("threats:write"),
  asyncHandler(async (req, res) => {
    const { name, category, severity = "medium", status = "active", source, source_ip, country, country_code, ioc_type, ioc_value, confidence = 70, risk_score = 50, description, mitre_tactic, mitre_technique, first_seen, last_seen, metadata = {} } = req.body;
    if (!name) throw new HttpError(400, "Tên là bắt buộc");
    const result = await query(
      `INSERT INTO threats (name, category, severity, status, source, source_ip, country, country_code, ioc_type, ioc_value, confidence, risk_score, description, mitre_tactic, mitre_technique, first_seen, last_seen, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
      [name, category || null, severity, status, source || "Manual", source_ip || null, country || null, country_code || null, ioc_type || null, ioc_value || null, Number(confidence), Number(risk_score), description || null, mitre_tactic || null, mitre_technique || null, first_seen || new Date(), last_seen || new Date(), JSON.stringify(metadata)],
    );
    await recordAudit({ req, action: "create", resource: "threats", resourceId: result.rows[0].id });
    res.status(201).json({ data: result.rows[0] });
  }),
);

router.post(
  "/:id/enrich",
  requirePermission("threats:enrich"),
  asyncHandler(async (req, res) => {
    const result = await query("SELECT * FROM threats WHERE id = $1", [req.params.id]);
    if (!result.rows.length) throw new HttpError(404, "Không tìm thấy mối đe dọa");
    const threat = result.rows[0];
    const intel = await query(
      `SELECT * FROM threat_intel WHERE indicator = $1 OR ($2 IS NOT NULL AND indicator = $2) LIMIT 5`,
      [threat.ioc_value, threat.source_ip],
    );
    const enriched = {
      ...threat,
      intel_matches: intel.rows,
      enrichment: {
        enriched_at: new Date().toISOString(),
        confidence: Math.min(99, threat.confidence + (intel.rows.length ? 10 : 0)),
        verdict: threat.risk_score >= 80 ? "malicious" : threat.risk_score >= 50 ? "suspicious" : "benign",
        provider: "MedicareGuard CTI",
      },
    };
    await query("UPDATE threats SET confidence = $1, metadata = metadata || $2 WHERE id = $3", [enriched.enrichment.confidence, JSON.stringify({ enrichment: enriched.enrichment }), req.params.id]);
    await recordActivity({ eventType: "threat_enrich", req, resource: "threats", resourceId: req.params.id, action: "enrich", message: "Mối đe dọa đã được làm giàu với kết quả CTI", metadata: { matches: intel.rows.length } });
    res.json({ data: enriched });
  }),
);

router.post(
  "/:id/block",
  requirePermission("threats:write"),
  asyncHandler(async (req, res) => {
    const threatResult = await query("SELECT * FROM threats WHERE id = $1", [req.params.id]);
    if (!threatResult.rows.length) throw new HttpError(404, "Không tìm thấy mối đe dọa");
    const threat = threatResult.rows[0];
    const value = threat.source_ip || threat.ioc_value;
    if (!value) throw new HttpError(400, "Mối đe dọa không có chỉ báo có thể chặn");
    const rule = await query(
      `INSERT INTO firewall_rules (name, description, direction, action, protocol, source_ip, priority, enabled, created_by, metadata)
       VALUES ($1,$2,'inbound','deny','any',$3,10,true,$4,$5) RETURNING *`,
      [`Chặn ${value}`, `Tự động tạo từ mối đe dọa ${threat.name}`, value, req.user.id, JSON.stringify({ threatId: threat.id, automated: true })],
    );
    await query("UPDATE threats SET status = 'blocked', metadata = metadata || $1 WHERE id = $2", [JSON.stringify({ firewallRuleId: rule.rows[0].id }), req.params.id]);
    await query(
      `INSERT INTO blocklist (value, type, reason, source, status, created_by, metadata) VALUES ($1,$2,$3,'threat-response','active',$4,$5)`,
      [value, threat.source_ip ? "ip" : "indicator", `Đã chặn mối đe dọa ${threat.name}`, req.user.id, JSON.stringify({ threatId: threat.id })],
    );
    await recordActivity({ eventType: "threat_block", req, resource: "threats", resourceId: req.params.id, action: "block", message: `Đã chặn ${value} tại tường lửa` });
    res.status(201).json({ data: { threat_id: req.params.id, firewall_rule: rule.rows[0], indicator: value } });
  }),
);

const updateThreat = asyncHandler(async (req, res) => {
  const allowed = ["name", "category", "severity", "status", "source", "source_ip", "country", "country_code", "ioc_type", "ioc_value", "confidence", "risk_score", "description", "mitre_tactic", "mitre_technique", "last_seen", "metadata"];
  const fields = allowed.filter((field) => req.body[field] !== undefined);
  if (!fields.length) throw new HttpError(400, "Không có trường hợp lệ nào được cung cấp");
  const values = fields.map((field) => (field === "metadata" ? JSON.stringify(req.body[field]) : req.body[field]));
  values.push(req.params.id);
  const result = await query(`UPDATE threats SET ${fields.map((field, index) => `${field} = $${index + 1}`).join(", ")} WHERE id = $${values.length} RETURNING *`, values);
  if (!result.rows.length) throw new HttpError(404, "Không tìm thấy mối đe dọa");
  await recordAudit({ req, action: "update", resource: "threats", resourceId: req.params.id });
  res.json({ data: result.rows[0] });
});

router.put("/:id", requirePermission("threats:write"), updateThreat);
router.patch("/:id", requirePermission("threats:write"), updateThreat);

router.delete(
  "/:id",
  requirePermission("delete"),
  asyncHandler(async (req, res) => {
    const result = await query("DELETE FROM threats WHERE id = $1 RETURNING id", [req.params.id]);
    if (!result.rows.length) throw new HttpError(404, "Không tìm thấy mối đe dọa");
    await recordAudit({ req, action: "delete", resource: "threats", resourceId: req.params.id });
    res.json({ deleted: true, id: req.params.id });
  }),
);

module.exports = router;
