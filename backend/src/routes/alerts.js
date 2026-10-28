const express = require("express");
const crypto = require("node:crypto");
const { query, withTransaction } = require("../config/db");
const { asyncHandler, HttpError, parsePagination } = require("../utils/http");
const { requirePermission } = require("../middleware/auth");
const { recordAudit, recordActivity } = require("../services/audit");

const router = express.Router();

const ALERT_SELECT = `
  SELECT a.*, t.name AS threat_name, t.category AS threat_category,
         ast.name AS asset_name, ast.ip_address AS asset_ip, ast.criticality AS asset_criticality,
         u.full_name AS assignee_name, u.email AS assignee_email
  FROM alerts a
  LEFT JOIN threats t ON t.id = a.threat_id
  LEFT JOIN assets ast ON ast.id = a.asset_id
  LEFT JOIN users u ON u.id = a.assignee_id
`;

const buildFilters = (req) => {
  const values = [];
  const conditions = [];
  const add = (sql, value) => {
    values.push(value);
    conditions.push(sql.replace("?", `$${values.length}`));
  };
  if (req.query.q) {
    values.push(`%${req.query.q}%`);
    conditions.push(`(a.title ILIKE $${values.length} OR a.description ILIKE $${values.length} OR a.source_ip ILIKE $${values.length} OR a.country ILIKE $${values.length})`);
  }
  ["severity", "status", "assignee_id", "asset_id", "threat_id", "country_code"].forEach((field) => {
    if (req.query[field]) add(`a.${field} = ?`, req.query[field]);
  });
  if (req.query.from) add("a.detected_at >= ?", req.query.from);
  if (req.query.to) add("a.detected_at <= ?", req.query.to);
  return { values, where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "" };
};

router.get(
  "/export",
  asyncHandler(async (req, res) => {
    const { values, where } = buildFilters(req);
    const result = await query(`SELECT a.* FROM alerts a ${where} ORDER BY a.detected_at DESC LIMIT 5000`, values);
    if (!result.rows.length) {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      return res.send("id,title,severity,status,source_ip,country,detected_at\n");
    }
    const header = Object.keys(result.rows[0]);
    const csv = [header.join(","), ...result.rows.map((row) => header.map((key) => `"${String(row[key] ?? "").replace(/"/g, '""')}"`).join(","))];
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="medicareguard-alerts-${Date.now()}.csv"`);
    res.send(csv.join("\n"));
  }),
);

router.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const [bySeverity, byStatus, bySource, trend] = await Promise.all([
      query("SELECT severity, count(*)::int AS total FROM alerts GROUP BY severity"),
      query("SELECT status, count(*)::int AS total FROM alerts GROUP BY status"),
      query("SELECT COALESCE(source, 'unknown') AS source, count(*)::int AS total FROM alerts GROUP BY source ORDER BY total DESC LIMIT 8"),
      query(`SELECT to_char(date_trunc('day', detected_at), 'YYYY-MM-DD') AS day, count(*)::int AS total
             FROM alerts WHERE detected_at > now() - interval '14 days' GROUP BY 1 ORDER BY 1`),
    ]);
    res.json({ data: { bySeverity: bySeverity.rows, byStatus: byStatus.rows, bySource: bySource.rows, trend: trend.rows } });
  }),
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const { values, where } = buildFilters(req);
    const sortable = { detected_at: "a.detected_at", risk_score: "a.risk_score", severity: "a.severity", status: "a.status", created_at: "a.created_at" };
    const sort = sortable[req.query.sort] || "a.detected_at";
    const order = String(req.query.order || "desc").toUpperCase() === "ASC" ? "ASC" : "DESC";
    const count = await query(`SELECT count(*)::int AS total FROM alerts a ${where}`, values);
    const dataResult = await query(
      `${ALERT_SELECT} ${where} ORDER BY ${sort} ${order} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset],
    );
    const total = count.rows[0].total;
    res.json({ data: dataResult.rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await query(`${ALERT_SELECT} WHERE a.id = $1`, [req.params.id]);
    if (!result.rows.length) throw new HttpError(404, "Không tìm thấy cảnh báo");
    res.json({ data: result.rows[0] });
  }),
);

router.get(
  "/:id/comments",
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT c.*, u.full_name AS author_name, u.email AS author_email
       FROM comments c LEFT JOIN users u ON u.id = c.author_id
       WHERE c.resource = 'alerts' AND c.resource_id = $1 ORDER BY c.created_at ASC`,
      [req.params.id],
    );
    res.json({ data: result.rows });
  }),
);

router.post(
  "/:id/comments",
  requirePermission("write"),
  asyncHandler(async (req, res) => {
    if (!req.body.body) throw new HttpError(400, "Nội dung bình luận là bắt buộc");
    const result = await query(
      `INSERT INTO comments (resource, resource_id, author_id, body, metadata)
       VALUES ('alerts',$1,$2,$3,$4) RETURNING *`,
      [req.params.id, req.user.id, req.body.body, JSON.stringify(req.body.metadata || {})],
    );
    await recordActivity({ eventType: "alert_comment", req, resource: "alerts", resourceId: req.params.id, action: "comment", message: req.body.body.slice(0, 200) });
    res.status(201).json({ data: result.rows[0] });
  }),
);

router.get(
  "/:id/timeline",
  asyncHandler(async (req, res) => {
    const [comments, activity] = await Promise.all([
      query(`SELECT 'comment' AS type, c.created_at, u.full_name AS actor, c.body AS message
             FROM comments c LEFT JOIN users u ON u.id = c.author_id
             WHERE c.resource = 'alerts' AND c.resource_id = $1`, [req.params.id]),
      query(`SELECT 'activity' AS type, created_at, actor_email AS actor, message
             FROM activity_logs WHERE resource = 'alerts' AND resource_id = $1`, [req.params.id]),
    ]);
    const timeline = [...comments.rows, ...activity.rows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json({ data: timeline });
  }),
);

router.post(
  "/",
  requirePermission("alerts:write"),
  asyncHandler(async (req, res) => {
    const { title, description, severity = "medium", status = "open", source, source_ip, country, country_code, mitre_tactic, mitre_technique, threat_id, asset_id, assignee_id, risk_score = 50, confidence = 70, tags = [] } = req.body;
    if (!title) throw new HttpError(400, "Tiêu đề là bắt buộc");
    const result = await query(
      `INSERT INTO alerts (title, description, severity, status, source, source_ip, country, country_code, mitre_tactic, mitre_technique, threat_id, asset_id, assignee_id, risk_score, confidence, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [title, description || null, severity, status, source || "Manual", source_ip || null, country || null, country_code || null, mitre_tactic || null, mitre_technique || null, threat_id || null, asset_id || null, assignee_id || null, Number(risk_score), Number(confidence), tags],
    );
    await recordAudit({ req, action: "create", resource: "alerts", resourceId: result.rows[0].id, details: { severity } });
    res.status(201).json({ data: result.rows[0] });
  }),
);

router.post(
  "/bulk",
  requirePermission("alerts:write"),
  asyncHandler(async (req, res) => {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!items.length) throw new HttpError(400, "Mảng items là bắt buộc");
    const rows = [];
    for (const item of items) {
      if (!item.title) continue;
      const result = await query(
        `INSERT INTO alerts (title, description, severity, status, source, source_ip, country, country_code, risk_score, tags)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [item.title, item.description || null, item.severity || "medium", item.status || "open", item.source || "Bulk import", item.source_ip || null, item.country || null, item.country_code || null, Number(item.risk_score || 50), item.tags || []],
      );
      rows.push(result.rows[0]);
    }
    await recordAudit({ req, action: "bulk_create", resource: "alerts", details: { count: rows.length } });
    res.status(201).json({ data: rows, count: rows.length });
  }),
);

router.delete(
  "/bulk",
  requirePermission("delete"),
  asyncHandler(async (req, res) => {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    if (!ids.length) throw new HttpError(400, "Mảng ids là bắt buộc");
    const result = await query("DELETE FROM alerts WHERE id = ANY($1::uuid[]) RETURNING id", [ids]);
    await recordAudit({ req, action: "bulk_delete", resource: "alerts", details: { ids } });
    res.json({ deleted: result.rowCount, ids: result.rows.map((row) => row.id) });
  }),
);

const updateAlert = asyncHandler(async (req, res) => {
  const allowed = ["title", "description", "severity", "status", "source", "source_ip", "country", "country_code", "mitre_tactic", "mitre_technique", "threat_id", "asset_id", "assignee_id", "risk_score", "confidence", "tags", "metadata"];
  const fields = allowed.filter((field) => req.body[field] !== undefined);
  if (!fields.length) throw new HttpError(400, "Không có trường hợp lệ nào được cung cấp");
  const values = fields.map((field) => (field === "metadata" ? JSON.stringify(req.body[field]) : req.body[field]));
  const extra = [];
  if (req.body.status === "resolved" || req.body.status === "false_positive") extra.push("resolved_at = now()");
  if (req.body.status && !["resolved", "false_positive"].includes(req.body.status)) extra.push("resolved_at = NULL");
  values.push(req.params.id);
  const sets = [...fields.map((field, index) => `${field} = $${index + 1}`), ...extra];
  const result = await query(`UPDATE alerts SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`, values);
  if (!result.rows.length) throw new HttpError(404, "Không tìm thấy cảnh báo");
  await recordAudit({ req, action: "update", resource: "alerts", resourceId: req.params.id, details: { fields } });
  res.json({ data: result.rows[0] });
});

router.put("/:id", requirePermission("alerts:write"), updateAlert);
router.patch("/:id", requirePermission("alerts:write"), updateAlert);

router.patch(
  "/:id/status",
  requirePermission("alerts:write"),
  asyncHandler(async (req, res) => {
    const { status, note } = req.body;
    const valid = ["open", "investigating", "contained", "resolved", "false_positive"];
    if (!valid.includes(status)) throw new HttpError(400, `status must be one of: ${valid.join(", ")}`);
    const result = await query(
      `UPDATE alerts SET status = $1, resolved_at = CASE WHEN $1 IN ('resolved','false_positive') THEN now() ELSE NULL END WHERE id = $2 RETURNING *`,
      [status, req.params.id],
    );
    if (!result.rows.length) throw new HttpError(404, "Không tìm thấy cảnh báo");
    await recordActivity({
      eventType: "alert_status",
      req,
      resource: "alerts",
      resourceId: req.params.id,
      action: "status_change",
      message: `Cảnh báo đã chuyển sang trạng thái ${status}${note ? `: ${note}` : ""}`,
      metadata: { status, note },
    });
    res.json({ data: result.rows[0] });
  }),
);

router.post(
  "/:id/assign",
  requirePermission("alerts:assign"),
  asyncHandler(async (req, res) => {
    const { assigneeId } = req.body;
    const result = await query("UPDATE alerts SET assignee_id = $1 WHERE id = $2 RETURNING *", [assigneeId || null, req.params.id]);
    if (!result.rows.length) throw new HttpError(404, "Không tìm thấy cảnh báo");
    await recordActivity({ eventType: "alert_assign", req, resource: "alerts", resourceId: req.params.id, action: "assign", message: `Alert assigned to ${assigneeId || "unassigned"}` });
    res.json({ data: result.rows[0] });
  }),
);

router.post(
  "/:id/resolve",
  requirePermission("alerts:write"),
  asyncHandler(async (req, res) => {
    const { resolution = "resolved", rootCause } = req.body;
    const status = resolution === "false_positive" ? "false_positive" : "resolved";
    const result = await query(
      "UPDATE alerts SET status = $1, resolved_at = now(), metadata = metadata || $2 WHERE id = $3 RETURNING *",
      [status, JSON.stringify({ rootCause: rootCause || null, resolvedBy: req.user.email }), req.params.id],
    );
    if (!result.rows.length) throw new HttpError(404, "Không tìm thấy cảnh báo");
    await recordActivity({ eventType: "alert_resolve", req, resource: "alerts", resourceId: req.params.id, action: "resolve", message: `Cảnh báo ${status}`, metadata: { rootCause } });
    res.json({ data: result.rows[0] });
  }),
);

router.post(
  "/:id/escalate",
  requirePermission("alerts:write"),
  asyncHandler(async (req, res) => {
    const alert = await query("SELECT * FROM alerts WHERE id = $1", [req.params.id]);
    if (!alert.rows.length) throw new HttpError(404, "Không tìm thấy cảnh báo");
    const source = alert.rows[0];
    const incidentKey = `INC-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    const incident = await withTransaction(async (client) => {
      const created = await client.query(
        `INSERT INTO incidents (title, description, severity, status, priority, category, assignee_id, reporter_id, incident_key, detected_at, impact)
         VALUES ($1,$2,$3,'open',$4,'security',$5,$6,$7,$8,$9) RETURNING *`,
        [
          `Đã leo thang: ${source.title}`,
          source.description,
          source.severity,
          source.severity === "critical" ? "P1" : "P2",
          source.assignee_id,
          req.user.id,
          incidentKey,
          source.detected_at,
          `Bắt nguồn từ cảnh báo ${source.id}`,
        ],
      );
      await client.query("UPDATE alerts SET status = 'investigating', metadata = metadata || $1 WHERE id = $2", [JSON.stringify({ incidentId: created.rows[0].id }), source.id]);
      return created.rows[0];
    });
    await recordActivity({ eventType: "alert_escalate", req, resource: "alerts", resourceId: req.params.id, action: "escalate", message: `Đã leo thang thành sự cố ${incidentKey}` });
    res.status(201).json({ data: incident });
  }),
);

router.delete(
  "/:id",
  requirePermission("delete"),
  asyncHandler(async (req, res) => {
    const result = await query("DELETE FROM alerts WHERE id = $1 RETURNING id", [req.params.id]);
    if (!result.rows.length) throw new HttpError(404, "Không tìm thấy cảnh báo");
    await recordAudit({ req, action: "delete", resource: "alerts", resourceId: req.params.id });
    res.json({ deleted: true, id: req.params.id });
  }),
);

module.exports = router;
