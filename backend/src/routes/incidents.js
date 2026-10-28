const express = require("express");
const crypto = require("node:crypto");
const { query } = require("../config/db");
const { asyncHandler, HttpError, parsePagination } = require("../utils/http");
const { requirePermission } = require("../middleware/auth");
const { recordAudit, recordActivity } = require("../services/audit");

const router = express.Router();

const INCIDENT_SELECT = `
  SELECT i.*, u.full_name AS assignee_name, u.email AS assignee_email,
         r.full_name AS reporter_name, r.email AS reporter_email
  FROM incidents i
  LEFT JOIN users u ON u.id = i.assignee_id
  LEFT JOIN users r ON r.id = i.reporter_id
`;

const filters = (req) => {
  const values = [];
  const conditions = [];
  if (req.query.q) {
    values.push(`%${req.query.q}%`);
    conditions.push(`(i.title ILIKE $${values.length} OR i.description ILIKE $${values.length} OR i.incident_key ILIKE $${values.length})`);
  }
  ["severity", "status", "priority", "category", "assignee_id"].forEach((field) => {
    if (req.query[field]) {
      values.push(req.query[field]);
      conditions.push(`i.${field} = $${values.length}`);
    }
  });
  if (req.query.overdue === "true") conditions.push("i.sla_due_at < now() AND i.status NOT IN ('resolved','closed')");
  return { values, where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "" };
};

router.get(
  "/export",
  asyncHandler(async (req, res) => {
    const { values, where } = filters(req);
    const result = await query(`SELECT ${INCIDENT_SELECT} ${where} ORDER BY i.detected_at DESC LIMIT 5000`, values);
    const header = ["id", "incident_key", "title", "severity", "status", "priority", "category", "detected_at", "resolved_at"];
    const csv = [header.join(","), ...result.rows.map((row) => header.map((key) => `"${String(row[key] ?? "").replace(/"/g, '""')}"`).join(","))];
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="medicareguard-incidents-${Date.now()}.csv"`);
    res.send(csv.join("\n"));
  }),
);

router.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const [byStatus, bySeverity, byPriority, mttr] = await Promise.all([
      query("SELECT status, count(*)::int AS total FROM incidents GROUP BY status"),
      query("SELECT severity, count(*)::int AS total FROM incidents GROUP BY severity"),
      query("SELECT priority, count(*)::int AS total FROM incidents GROUP BY priority"),
      query(`SELECT round(avg(extract(epoch FROM (resolved_at - detected_at)) / 3600)::numeric, 1) AS avg_hours,
                    count(*) FILTER (WHERE resolved_at IS NOT NULL)::int AS resolved
             FROM incidents WHERE resolved_at IS NOT NULL`),
    ]);
    res.json({ data: { byStatus: byStatus.rows, bySeverity: bySeverity.rows, byPriority: byPriority.rows, mttr: mttr.rows[0] } });
  }),
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const { values, where } = filters(req);
    const sortable = { detected_at: "i.detected_at", severity: "i.severity", status: "i.status", priority: "i.priority" };
    const sort = sortable[req.query.sort] || "i.detected_at";
    const order = String(req.query.order || "desc").toUpperCase() === "ASC" ? "ASC" : "DESC";
    const count = await query(`SELECT count(*)::int AS total FROM incidents i ${where}`, values);
    const dataResult = await query(`${INCIDENT_SELECT} ${where} ORDER BY ${sort} ${order} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, [...values, limit, offset]);
    const total = count.rows[0].total;
    res.json({ data: dataResult.rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await query(`${INCIDENT_SELECT} WHERE i.id = $1`, [req.params.id]);
    if (!result.rows.length) throw new HttpError(404, "Không tìm thấy sự cố");
    const [comments, alerts] = await Promise.all([
      query(`SELECT c.*, u.full_name AS author_name FROM comments c LEFT JOIN users u ON u.id = c.author_id WHERE c.resource = 'incidents' AND c.resource_id = $1 ORDER BY c.created_at`, [req.params.id]),
      query(`SELECT id, title, severity, status, detected_at FROM alerts WHERE metadata->>'incidentId' = $1 ORDER BY detected_at DESC`, [req.params.id]),
    ]);
    res.json({ data: { ...result.rows[0], comments: comments.rows, alerts: alerts.rows } });
  }),
);

router.get(
  "/:id/timeline",
  asyncHandler(async (req, res) => {
    const result = await query("SELECT * FROM incidents WHERE id = $1", [req.params.id]);
    if (!result.rows.length) throw new HttpError(404, "Không tìm thấy sự cố");
    const [comments, activity] = await Promise.all([
      query(`SELECT 'comment' AS type, c.created_at, u.full_name AS actor, c.body AS message FROM comments c LEFT JOIN users u ON u.id = c.author_id WHERE c.resource = 'incidents' AND c.resource_id = $1`, [req.params.id]),
      query(`SELECT 'activity' AS type, created_at, actor_email AS actor, message FROM activity_logs WHERE resource = 'incidents' AND resource_id = $1`, [req.params.id]),
    ]);
    const timeline = [...(result.rows[0].timeline || []), ...comments.rows, ...activity.rows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json({ data: timeline });
  }),
);

router.post(
  "/:id/timeline",
  requirePermission("incidents:write"),
  asyncHandler(async (req, res) => {
    const { message, kind = "note" } = req.body;
    if (!message) throw new HttpError(400, "Nội dung tin nhắn là bắt buộc");
    const entry = { kind, message, actor: req.user.email, created_at: new Date().toISOString() };
    const result = await query("UPDATE incidents SET timeline = timeline || $1::jsonb WHERE id = $2 RETURNING *", [JSON.stringify([entry]), req.params.id]);
    if (!result.rows.length) throw new HttpError(404, "Không tìm thấy sự cố");
    await recordActivity({ eventType: "incident_timeline", req, resource: "incidents", resourceId: req.params.id, action: "timeline", message });
    res.status(201).json({ data: result.rows[0] });
  }),
);

router.post(
  "/:id/comments",
  requirePermission("incidents:write"),
  asyncHandler(async (req, res) => {
    if (!req.body.body) throw new HttpError(400, "Nội dung bình luận là bắt buộc");
    const result = await query(
      `INSERT INTO comments (resource, resource_id, author_id, body, metadata) VALUES ('incidents',$1,$2,$3,$4) RETURNING *`,
      [req.params.id, req.user.id, req.body.body, JSON.stringify(req.body.metadata || {})],
    );
    res.status(201).json({ data: result.rows[0] });
  }),
);

router.post(
  "/",
  requirePermission("incidents:write"),
  asyncHandler(async (req, res) => {
    const { title, description, severity = "medium", status = "open", priority = "P3", category, assignee_id, reporter_id, sla_due_at, impact, root_cause, metadata = {} } = req.body;
    if (!title) throw new HttpError(400, "Tiêu đề là bắt buộc");
    const incidentKey = `INC-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    const sla = sla_due_at || new Date(Date.now() + (priority === "P1" ? 4 : priority === "P2" ? 12 : 48) * 3600 * 1000);
    const result = await query(
      `INSERT INTO incidents (title, description, severity, status, priority, category, assignee_id, reporter_id, incident_key, sla_due_at, detected_at, impact, root_cause, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),$11,$12,$13) RETURNING *`,
      [title, description || null, severity, status, priority, category || null, assignee_id || req.user.id, reporter_id || req.user.id, incidentKey, sla, impact || null, root_cause || null, JSON.stringify(metadata)],
    );
    await recordAudit({ req, action: "create", resource: "incidents", resourceId: result.rows[0].id });
    res.status(201).json({ data: result.rows[0] });
  }),
);

router.post(
  "/bulk",
  requirePermission("incidents:write"),
  asyncHandler(async (req, res) => {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!items.length) throw new HttpError(400, "Mảng items là bắt buộc");
    const rows = [];
    for (const item of items) {
      if (!item.title) continue;
      const key = `INC-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
      const result = await query(
        `INSERT INTO incidents (title, description, severity, status, priority, category, incident_key, detected_at) VALUES ($1,$2,$3,$4,$5,$6,$7,now()) RETURNING *`,
        [item.title, item.description || null, item.severity || "medium", item.status || "open", item.priority || "P3", item.category || null, key],
      );
      rows.push(result.rows[0]);
    }
    res.status(201).json({ data: rows, count: rows.length });
  }),
);

const updateIncident = asyncHandler(async (req, res) => {
  const allowed = ["title", "description", "severity", "status", "priority", "category", "assignee_id", "sla_due_at", "root_cause", "impact", "timeline", "metadata"];
  const fields = allowed.filter((field) => req.body[field] !== undefined);
  if (!fields.length) throw new HttpError(400, "Không có trường hợp lệ nào được cung cấp");
  const values = fields.map((field) => (["metadata", "timeline"].includes(field) ? JSON.stringify(req.body[field]) : req.body[field]));
  const extra = [];
  if (req.body.status === "resolved" || req.body.status === "closed") extra.push("resolved_at = now()");
  values.push(req.params.id);
  const result = await query(`UPDATE incidents SET ${[...fields.map((field, index) => `${field} = $${index + 1}`), ...extra].join(", ")} WHERE id = $${values.length} RETURNING *`, values);
  if (!result.rows.length) throw new HttpError(404, "Không tìm thấy sự cố");
  await recordAudit({ req, action: "update", resource: "incidents", resourceId: req.params.id });
  res.json({ data: result.rows[0] });
});

router.put("/:id", requirePermission("incidents:write"), updateIncident);
router.patch("/:id", requirePermission("incidents:write"), updateIncident);

router.patch(
  "/:id/status",
  requirePermission("incidents:write"),
  asyncHandler(async (req, res) => {
    const valid = ["open", "investigating", "contained", "eradicated", "recovered", "resolved", "closed"];
    const { status } = req.body;
    if (!valid.includes(status)) throw new HttpError(400, `status must be one of: ${valid.join(", ")}`);
    const result = await query(
      `UPDATE incidents SET status = $1, resolved_at = CASE WHEN $1 IN ('resolved','closed') THEN now() ELSE NULL END WHERE id = $2 RETURNING *`,
      [status, req.params.id],
    );
    if (!result.rows.length) throw new HttpError(404, "Không tìm thấy sự cố");
    await recordActivity({ eventType: "incident_status", req, resource: "incidents", resourceId: req.params.id, action: "status_change", message: `Sự cố đã chuyển sang trạng thái ${status}` });
    res.json({ data: result.rows[0] });
  }),
);

router.post(
  "/:id/assign",
  requirePermission("incidents:write"),
  asyncHandler(async (req, res) => {
    const result = await query("UPDATE incidents SET assignee_id = $1 WHERE id = $2 RETURNING *", [req.body.assigneeId || null, req.params.id]);
    if (!result.rows.length) throw new HttpError(404, "Không tìm thấy sự cố");
    await recordActivity({ eventType: "incident_assign", req, resource: "incidents", resourceId: req.params.id, action: "assign", message: `Incident assigned to ${req.body.assigneeId || "unassigned"}` });
    res.json({ data: result.rows[0] });
  }),
);

router.post(
  "/:id/resolve",
  requirePermission("incidents:resolve"),
  asyncHandler(async (req, res) => {
    const { rootCause, resolution } = req.body;
    const result = await query(
      `UPDATE incidents SET status = 'resolved', resolved_at = now(), root_cause = COALESCE($1, root_cause), timeline = timeline || $2::jsonb WHERE id = $3 RETURNING *`,
      [rootCause || null, JSON.stringify([{ kind: "resolution", message: resolution || "Sự cố đã được xử lý", actor: req.user.email, created_at: new Date().toISOString() }]), req.params.id],
    );
    if (!result.rows.length) throw new HttpError(404, "Không tìm thấy sự cố");
    await recordActivity({ eventType: "incident_resolve", req, resource: "incidents", resourceId: req.params.id, action: "resolve", message: "Sự cố đã được xử lý" });
    res.json({ data: result.rows[0] });
  }),
);

router.post(
  "/:id/escalate",
  requirePermission("incidents:write"),
  asyncHandler(async (req, res) => {
    const result = await query(
      `UPDATE incidents SET priority = CASE priority WHEN 'P3' THEN 'P2' WHEN 'P2' THEN 'P1' ELSE 'P1' END, severity = CASE severity WHEN 'low' THEN 'medium' WHEN 'medium' THEN 'high' ELSE 'critical' END, sla_due_at = now() + interval '4 hours', timeline = timeline || $1::jsonb WHERE id = $2 RETURNING *`,
      [JSON.stringify([{ kind: "escalation", message: req.body.reason || "Sự cố đã được leo thang", actor: req.user.email, created_at: new Date().toISOString() }]), req.params.id],
    );
    if (!result.rows.length) throw new HttpError(404, "Không tìm thấy sự cố");
    await recordActivity({ eventType: "incident_escalate", req, resource: "incidents", resourceId: req.params.id, action: "escalate", message: "Sự cố đã được leo thang" });
    res.json({ data: result.rows[0] });
  }),
);

router.delete(
  "/:id",
  requirePermission("delete"),
  asyncHandler(async (req, res) => {
    const result = await query("DELETE FROM incidents WHERE id = $1 RETURNING id", [req.params.id]);
    if (!result.rows.length) throw new HttpError(404, "Không tìm thấy sự cố");
    await recordAudit({ req, action: "delete", resource: "incidents", resourceId: req.params.id });
    res.json({ deleted: true, id: req.params.id });
  }),
);

module.exports = router;
