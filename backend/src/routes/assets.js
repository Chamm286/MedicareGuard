const express = require("express");
const { query } = require("../config/db");
const { asyncHandler, HttpError, parsePagination } = require("../utils/http");
const { requirePermission } = require("../middleware/auth");
const { recordAudit, recordActivity } = require("../services/audit");

const router = express.Router();

const ASSET_SELECT = `
  SELECT a.*, u.full_name AS owner_name, u.email AS owner_email
  FROM assets a LEFT JOIN users u ON u.id = a.owner_id
`;

router.get(
  "/export",
  asyncHandler(async (_req, res) => {
    const result = await query(`SELECT ${ASSET_SELECT} ORDER BY a.risk_score DESC`);
    const header = ["id", "name", "type", "hostname", "ip_address", "criticality", "status", "risk_score", "owner_name", "department"];
    const csv = [header.join(","), ...result.rows.map((row) => header.map((key) => `"${String(row[key] ?? "").replace(/"/g, '""')}"`).join(","))];
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="medicareguard-assets-${Date.now()}.csv"`);
    res.send(csv.join("\n"));
  }),
);

router.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const [byType, byCriticality, byStatus, topRisk] = await Promise.all([
      query("SELECT type, count(*)::int AS total FROM assets GROUP BY type ORDER BY total DESC"),
      query("SELECT criticality, count(*)::int AS total FROM assets GROUP BY criticality"),
      query("SELECT status, count(*)::int AS total FROM assets GROUP BY status"),
      query("SELECT id, name, type, criticality, risk_score, ip_address FROM assets ORDER BY risk_score DESC LIMIT 8"),
    ]);
    const avg = await query("SELECT round(avg(risk_score))::int AS avg_risk, count(*)::int AS total FROM assets");
    res.json({ data: { byType: byType.rows, byCriticality: byCriticality.rows, byStatus: byStatus.rows, topRisk: topRisk.rows, summary: avg.rows[0] } });
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
      conditions.push(`(a.name ILIKE $${values.length} OR a.hostname ILIKE $${values.length} OR a.ip_address ILIKE $${values.length} OR a.location ILIKE $${values.length})`);
    }
    ["type", "criticality", "status", "owner_id", "department"].forEach((field) => {
      if (req.query[field]) {
        values.push(req.query[field]);
        conditions.push(`a.${field} = $${values.length}`);
      }
    });
    if (req.query.min_risk) {
      values.push(Number(req.query.min_risk));
      conditions.push(`a.risk_score >= $${values.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const sortable = { risk_score: "a.risk_score", name: "a.name", created_at: "a.created_at", last_seen: "a.last_seen" };
    const sort = sortable[req.query.sort] || "a.risk_score";
    const order = String(req.query.order || "desc").toUpperCase() === "ASC" ? "ASC" : "DESC";
    const count = await query(`SELECT count(*)::int AS total FROM assets a ${where}`, values);
    const dataResult = await query(`${ASSET_SELECT} ${where} ORDER BY ${sort} ${order} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, [...values, limit, offset]);
    const total = count.rows[0].total;
    res.json({ data: dataResult.rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await query(`${ASSET_SELECT} WHERE a.id = $1`, [req.params.id]);
    if (!result.rows.length) throw new HttpError(404, "Không tìm thấy tài sản");
    res.json({ data: result.rows[0] });
  }),
);

router.get(
  "/:id/alerts",
  asyncHandler(async (req, res) => {
    const result = await query("SELECT id, title, severity, status, source_ip, detected_at FROM alerts WHERE asset_id = $1 ORDER BY detected_at DESC LIMIT 50", [req.params.id]);
    res.json({ data: result.rows });
  }),
);

router.get(
  "/:id/vulnerabilities",
  asyncHandler(async (req, res) => {
    const result = await query("SELECT * FROM vulnerabilities WHERE asset_id = $1 ORDER BY cvss_score DESC", [req.params.id]);
    res.json({ data: result.rows });
  }),
);

router.get(
  "/:id/incidents",
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT i.* FROM incidents i JOIN alerts a ON a.metadata->>'incidentId' = i.id::text WHERE a.asset_id = $1
       UNION SELECT i.* FROM incidents i WHERE i.metadata->>'assetId' = $1::text ORDER BY detected_at DESC LIMIT 50`,
      [req.params.id],
    );
    res.json({ data: result.rows });
  }),
);

router.get(
  "/:id/risk",
  asyncHandler(async (req, res) => {
    const asset = await query("SELECT * FROM assets WHERE id = $1", [req.params.id]);
    if (!asset.rows.length) throw new HttpError(404, "Không tìm thấy tài sản");
    const [alerts, vulns, incidents] = await Promise.all([
      query("SELECT count(*)::int AS c, count(*) FILTER (WHERE severity IN ('critical','high'))::int AS h FROM alerts WHERE asset_id = $1 AND status NOT IN ('resolved','false_positive')", [req.params.id]),
      query("SELECT count(*)::int AS c, coalesce(max(cvss_score),0) AS max_cvss FROM vulnerabilities WHERE asset_id = $1 AND status = 'open'", [req.params.id]),
      query("SELECT count(*)::int AS c FROM incidents WHERE metadata->>'assetId' = $1::text AND status NOT IN ('resolved','closed')", [req.params.id]),
    ]);
    const criticalityWeight = { critical: 35, high: 25, medium: 15, low: 5 }[asset.rows[0].criticality] || 15;
    const score = Math.min(100, Math.round(criticalityWeight + alerts.rows[0].h * 9 + alerts.rows[0].c * 3 + Number(vulns.rows[0].max_cvss) * 2 + incidents.rows[0].c * 6));
    const breakdown = { criticality: asset.rows[0].criticality, criticality_weight: criticalityWeight, open_alerts: alerts.rows[0].c, high_alerts: alerts.rows[0].h, open_vulnerabilities: vulns.rows[0].c, max_cvss: Number(vulns.rows[0].max_cvss), open_incidents: incidents.rows[0].c, score };
    await query("UPDATE assets SET risk_score = $1 WHERE id = $2", [score, req.params.id]);
    res.json({ data: breakdown });
  }),
);

router.post(
  "/",
  requirePermission("assets:write"),
  asyncHandler(async (req, res) => {
    const { name, type = "server", category, hostname, ip_address, mac_address, os, owner_id, department, location, criticality = "medium", status = "online", risk_score = 20, tags = [], metadata = {} } = req.body;
    if (!name) throw new HttpError(400, "Tên là bắt buộc");
    const result = await query(
      `INSERT INTO assets (name, type, category, hostname, ip_address, mac_address, os, owner_id, department, location, criticality, status, risk_score, tags, last_seen, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,now(),$15) RETURNING *`,
      [name, type, category || null, hostname || null, ip_address || null, mac_address || null, os || null, owner_id || null, department || null, location || null, criticality, status, Number(risk_score), tags, JSON.stringify(metadata)],
    );
    await recordAudit({ req, action: "create", resource: "assets", resourceId: result.rows[0].id });
    res.status(201).json({ data: result.rows[0] });
  }),
);

router.post(
  "/bulk",
  requirePermission("assets:write"),
  asyncHandler(async (req, res) => {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!items.length) throw new HttpError(400, "Mảng items là bắt buộc");
    const rows = [];
    for (const item of items) {
      if (!item.name) continue;
      const result = await query(
        `INSERT INTO assets (name, type, hostname, ip_address, os, criticality, status, risk_score) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [item.name, item.type || "server", item.hostname || null, item.ip_address || null, item.os || null, item.criticality || "medium", item.status || "online", Number(item.risk_score || 20)],
      );
      rows.push(result.rows[0]);
    }
    await recordAudit({ req, action: "bulk_create", resource: "assets", details: { count: rows.length } });
    res.status(201).json({ data: rows, count: rows.length });
  }),
);

const updateAsset = asyncHandler(async (req, res) => {
  const allowed = ["name", "type", "category", "hostname", "ip_address", "mac_address", "os", "owner_id", "department", "location", "criticality", "status", "risk_score", "tags", "metadata"];
  const fields = allowed.filter((field) => req.body[field] !== undefined);
  if (!fields.length) throw new HttpError(400, "Không có trường hợp lệ nào được cung cấp");
  const values = fields.map((field) => (field === "metadata" ? JSON.stringify(req.body[field]) : req.body[field]));
  values.push(req.params.id);
  const result = await query(`UPDATE assets SET ${fields.map((field, index) => `${field} = $${index + 1}`).join(", ")} WHERE id = $${values.length} RETURNING *`, values);
  if (!result.rows.length) throw new HttpError(404, "Không tìm thấy tài sản");
  await recordAudit({ req, action: "update", resource: "assets", resourceId: req.params.id });
  res.json({ data: result.rows[0] });
});

router.put("/:id", requirePermission("assets:write"), updateAsset);
router.patch("/:id", requirePermission("assets:write"), updateAsset);

router.post(
  "/:id/scan",
  requirePermission("assets:scan"),
  asyncHandler(async (req, res) => {
    const asset = await query("SELECT * FROM assets WHERE id = $1", [req.params.id]);
    if (!asset.rows.length) throw new HttpError(404, "Không tìm thấy tài sản");
    const result = await query(
      `INSERT INTO scans (name, type, status, target, started_at, findings_count, metadata)
       VALUES ($1,$2,'running',$3,now(),0,$4) RETURNING *`,
      [`Quét theo yêu cầu · ${asset.rows[0].name}`, req.body.type || "vulnerability", asset.rows[0].ip_address || asset.rows[0].hostname || asset.rows[0].name, JSON.stringify({ assetId: req.params.id, requestedBy: req.user.email })],
    );
    await recordActivity({ eventType: "asset_scan", req, resource: "assets", resourceId: req.params.id, action: "scan", message: `Đã xếp hàng quét cho ${asset.rows[0].name}` });
    res.status(202).json({ data: result.rows[0] });
  }),
);

router.post(
  "/:id/owner",
  requirePermission("assets:write"),
  asyncHandler(async (req, res) => {
    const result = await query("UPDATE assets SET owner_id = $1 WHERE id = $2 RETURNING *", [req.body.ownerId || null, req.params.id]);
    if (!result.rows.length) throw new HttpError(404, "Không tìm thấy tài sản");
    await recordAudit({ req, action: "assign_owner", resource: "assets", resourceId: req.params.id, details: { ownerId: req.body.ownerId } });
    res.json({ data: result.rows[0] });
  }),
);

router.delete(
  "/:id",
  requirePermission("delete"),
  asyncHandler(async (req, res) => {
    const result = await query("DELETE FROM assets WHERE id = $1 RETURNING id", [req.params.id]);
    if (!result.rows.length) throw new HttpError(404, "Không tìm thấy tài sản");
    await recordAudit({ req, action: "delete", resource: "assets", resourceId: req.params.id });
    res.json({ deleted: true, id: req.params.id });
  }),
);

module.exports = router;
