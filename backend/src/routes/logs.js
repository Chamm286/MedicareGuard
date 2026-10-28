const express = require("express");
const { query } = require("../config/db");
const { asyncHandler, HttpError, parsePagination } = require("../utils/http");
const { authorize, requirePermission } = require("../middleware/auth");
const { recordAudit } = require("../services/audit");

const router = express.Router();

const filters = (req, prefix = "") => {
  const values = [];
  const conditions = [];
  if (req.query.q) {
    values.push(`%${req.query.q}%`);
    conditions.push(`(message ILIKE $${values.length} OR actor_email ILIKE $${values.length} OR event_type ILIKE $${values.length} OR source_ip ILIKE $${values.length})`);
  }
  ["level", "event_type", "resource", "resource_id", "actor_id"].forEach((field) => {
    if (req.query[field]) {
      values.push(req.query[field]);
      conditions.push(`${prefix}${field} = $${values.length}`);
    }
  });
  if (req.query.from) {
    values.push(req.query.from);
    conditions.push(`created_at >= $${values.length}`);
  }
  if (req.query.to) {
    values.push(req.query.to);
    conditions.push(`created_at <= $${values.length}`);
  }
  return { values, where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "" };
};

router.get(
  "/export",
  asyncHandler(async (req, res) => {
    const { values, where } = filters(req);
    const result = await query(`SELECT * FROM activity_logs ${where} ORDER BY created_at DESC LIMIT 10000`, values);
    const header = result.rows.length ? Object.keys(result.rows[0]) : ["id", "level", "event_type", "message", "created_at"];
    const csv = [header.join(","), ...result.rows.map((row) => header.map((key) => `"${String(row[key] ?? "").replace(/"/g, '""')}"`).join(","))];
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="medicareguard-logs-${Date.now()}.csv"`);
    res.send(csv.join("\n"));
  }),
);

router.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const [byLevel, byType, perHour] = await Promise.all([
      query("SELECT level, count(*)::int AS total FROM activity_logs GROUP BY level"),
      query("SELECT event_type, count(*)::int AS total FROM activity_logs GROUP BY event_type ORDER BY total DESC LIMIT 12"),
      query(`SELECT to_char(date_trunc('hour', created_at), 'YYYY-MM-DD HH24:00') AS hour, count(*)::int AS total
             FROM activity_logs WHERE created_at > now() - interval '24 hours' GROUP BY 1 ORDER BY 1`),
    ]);
    res.json({ data: { byLevel: byLevel.rows, byType: byType.rows, perHour: perHour.rows } });
  }),
);

router.get(
  "/audit",
  asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const values = [];
    const conditions = [];
    if (req.query.q) {
      values.push(`%${req.query.q}%`);
      conditions.push(`(actor_email ILIKE $${values.length} OR action ILIKE $${values.length} OR resource ILIKE $${values.length})`);
    }
    ["action", "resource"].forEach((field) => {
      if (req.query[field]) {
        values.push(req.query[field]);
        conditions.push(`${field} = $${values.length}`);
      }
    });
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const count = await query(`SELECT count(*)::int AS total FROM audit_logs ${where}`, values);
    const dataResult = await query(`SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, [...values, limit, offset]);
    const total = count.rows[0].total;
    res.json({ data: dataResult.rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } });
  }),
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const { values, where } = filters(req);
    const count = await query(`SELECT count(*)::int AS total FROM activity_logs ${where}`, values);
    const dataResult = await query(
      `SELECT l.*, u.full_name AS actor_name FROM activity_logs l LEFT JOIN users u ON u.id = l.actor_id
       ${where.replace(/\b(level|event_type|resource|resource_id|actor_id|message|actor_email|source_ip|created_at)\b/g, "l.$1")}
       ORDER BY l.created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset],
    );
    const total = count.rows[0].total;
    res.json({ data: dataResult.rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await query("SELECT * FROM activity_logs WHERE id = $1", [req.params.id]);
    if (!result.rows.length) throw new HttpError(404, "Không tìm thấy mục nhật ký");
    res.json({ data: result.rows[0] });
  }),
);

router.post(
  "/",
  requirePermission("write"),
  asyncHandler(async (req, res) => {
    const { level = "info", event_type = "system", resource, resource_id, action, message, metadata = {} } = req.body;
    const result = await query(
      `INSERT INTO activity_logs (level, event_type, actor_id, actor_email, source_ip, user_agent, resource, resource_id, action, message, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [level, event_type, req.user.id, req.user.email, req.ip, req.headers["user-agent"] || null, resource || null, resource_id || null, action || null, message || null, JSON.stringify(metadata)],
    );
    res.status(201).json({ data: result.rows[0] });
  }),
);

router.put(
  "/:id",
  requirePermission("write"),
  asyncHandler(async (req, res) => {
    const allowed = ["level", "event_type", "resource", "resource_id", "action", "message", "metadata"];
    const fields = allowed.filter((field) => req.body[field] !== undefined);
    if (!fields.length) throw new HttpError(400, "Không có trường hợp lệ nào được cung cấp");
    const values = fields.map((field) => (field === "metadata" ? JSON.stringify(req.body[field]) : req.body[field]));
    values.push(req.params.id);
    const result = await query(`UPDATE activity_logs SET ${fields.map((field, index) => `${field} = $${index + 1}`).join(", ")} WHERE id = $${values.length} RETURNING *`, values);
    if (!result.rows.length) throw new HttpError(404, "Không tìm thấy mục nhật ký");
    res.json({ data: result.rows[0] });
  }),
);

router.delete(
  "/:id",
  authorize("admin"),
  asyncHandler(async (req, res) => {
    const result = await query("DELETE FROM activity_logs WHERE id = $1 RETURNING id", [req.params.id]);
    if (!result.rows.length) throw new HttpError(404, "Không tìm thấy mục nhật ký");
    await recordAudit({ req, action: "delete", resource: "activity_logs", resourceId: req.params.id });
    res.json({ deleted: true, id: req.params.id });
  }),
);

router.delete(
  "/",
  authorize("admin"),
  asyncHandler(async (req, res) => {
    if (req.query.confirm !== "PURGE") throw new HttpError(400, "Add ?confirm=PURGE to purge logs older than 180 days");
    const result = await query("DELETE FROM activity_logs WHERE created_at < now() - interval '180 days'");
    await recordAudit({ req, action: "purge", resource: "activity_logs", details: { deleted: result.rowCount } });
    res.json({ purged: result.rowCount });
  }),
);

module.exports = router;
