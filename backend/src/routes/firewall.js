const express = require("express");
const { query } = require("../config/db");
const { asyncHandler, HttpError, parsePagination } = require("../utils/http");
const { requirePermission } = require("../middleware/auth");
const { recordAudit, recordActivity } = require("../services/audit");

const router = express.Router();

const RULE_SELECT = `
  SELECT f.*, u.full_name AS created_by_name
  FROM firewall_rules f LEFT JOIN users u ON u.id = f.created_by
`;

const filters = (req) => {
  const values = [];
  const conditions = [];
  if (req.query.q) {
    values.push(`%${req.query.q}%`);
    conditions.push(`(f.name ILIKE $${values.length} OR f.source_ip ILIKE $${values.length} OR f.destination_ip ILIKE $${values.length} OR f.description ILIKE $${values.length})`);
  }
  ["direction", "action", "protocol", "enabled"].forEach((field) => {
    if (req.query[field] !== undefined && req.query[field] !== "") {
      values.push(req.query[field]);
      conditions.push(`f.${field}::text = $${values.length}`);
    }
  });
  return { values, where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "" };
};

router.get(
  "/export",
  asyncHandler(async (req, res) => {
    const { values, where } = filters(req);
    const result = await query(`SELECT ${RULE_SELECT} ${where} ORDER BY f.priority ASC`, values);
    const header = ["id", "name", "direction", "action", "protocol", "source_ip", "destination_ip", "source_port", "destination_port", "priority", "enabled", "hit_count"];
    const csv = [header.join(","), ...result.rows.map((row) => header.map((key) => `"${String(row[key] ?? "").replace(/"/g, '""')}"`).join(","))];
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="medicareguard-firewall-${Date.now()}.csv"`);
    res.send(csv.join("\n"));
  }),
);

router.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const [byAction, byDirection, summary, topHits] = await Promise.all([
      query("SELECT action, count(*)::int AS total FROM firewall_rules GROUP BY action"),
      query("SELECT direction, count(*)::int AS total FROM firewall_rules GROUP BY direction"),
      query("SELECT count(*)::int AS total, count(*) FILTER (WHERE enabled)::int AS enabled, coalesce(sum(hit_count),0)::bigint AS hits FROM firewall_rules"),
      query("SELECT id, name, action, hit_count, source_ip FROM firewall_rules ORDER BY hit_count DESC LIMIT 8"),
    ]);
    res.json({ data: { byAction: byAction.rows, byDirection: byDirection.rows, summary: summary.rows[0], topHits: topHits.rows } });
  }),
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const { values, where } = filters(req);
    const count = await query(`SELECT count(*)::int AS total FROM firewall_rules f ${where}`, values);
    const dataResult = await query(`${RULE_SELECT} ${where} ORDER BY f.priority ASC, f.created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, [...values, limit, offset]);
    const total = count.rows[0].total;
    res.json({ data: dataResult.rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await query(`${RULE_SELECT} WHERE f.id = $1`, [req.params.id]);
    if (!result.rows.length) throw new HttpError(404, "Không tìm thấy quy tắc tường lửa");
    res.json({ data: result.rows[0] });
  }),
);

router.post(
  "/",
  requirePermission("firewall:write"),
  asyncHandler(async (req, res) => {
    const { name, description, direction = "inbound", action = "deny", protocol = "tcp", source_ip, destination_ip, source_port, destination_port, priority = 100, enabled = true, metadata = {} } = req.body;
    if (!name) throw new HttpError(400, "Tên là bắt buộc");
    const result = await query(
      `INSERT INTO firewall_rules (name, description, direction, action, protocol, source_ip, destination_ip, source_port, destination_port, priority, enabled, created_by, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [name, description || null, direction, action, protocol, source_ip || null, destination_ip || null, source_port || null, destination_port || null, Number(priority), Boolean(enabled), req.user.id, JSON.stringify(metadata)],
    );
    await recordAudit({ req, action: "create", resource: "firewall_rules", resourceId: result.rows[0].id });
    res.status(201).json({ data: result.rows[0] });
  }),
);

router.post(
  "/bulk",
  requirePermission("firewall:write"),
  asyncHandler(async (req, res) => {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!items.length) throw new HttpError(400, "Mảng items là bắt buộc");
    const rows = [];
    for (const item of items) {
      if (!item.name) continue;
      const result = await query(
        `INSERT INTO firewall_rules (name, direction, action, protocol, source_ip, destination_ip, source_port, destination_port, priority, enabled, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [item.name, item.direction || "inbound", item.action || "deny", item.protocol || "tcp", item.source_ip || null, item.destination_ip || null, item.source_port || null, item.destination_port || null, Number(item.priority || 100), item.enabled !== false, req.user.id],
      );
      rows.push(result.rows[0]);
    }
    res.status(201).json({ data: rows, count: rows.length });
  }),
);

const updateRule = asyncHandler(async (req, res) => {
  const allowed = ["name", "description", "direction", "action", "protocol", "source_ip", "destination_ip", "source_port", "destination_port", "priority", "enabled", "metadata"];
  const fields = allowed.filter((field) => req.body[field] !== undefined);
  if (!fields.length) throw new HttpError(400, "Không có trường hợp lệ nào được cung cấp");
  const values = fields.map((field) => (field === "metadata" ? JSON.stringify(req.body[field]) : req.body[field]));
  values.push(req.params.id);
  const result = await query(`UPDATE firewall_rules SET ${fields.map((field, index) => `${field} = $${index + 1}`).join(", ")} WHERE id = $${values.length} RETURNING *`, values);
  if (!result.rows.length) throw new HttpError(404, "Không tìm thấy quy tắc tường lửa");
  await recordAudit({ req, action: "update", resource: "firewall_rules", resourceId: req.params.id });
  res.json({ data: result.rows[0] });
});

router.put("/:id", requirePermission("firewall:write"), updateRule);
router.patch("/:id", requirePermission("firewall:write"), updateRule);

router.patch(
  "/:id/toggle",
  requirePermission("firewall:write"),
  asyncHandler(async (req, res) => {
    const result = await query("UPDATE firewall_rules SET enabled = NOT enabled WHERE id = $1 RETURNING *", [req.params.id]);
    if (!result.rows.length) throw new HttpError(404, "Không tìm thấy quy tắc tường lửa");
    await recordActivity({ eventType: "firewall_toggle", req, resource: "firewall_rules", resourceId: req.params.id, action: "toggle", message: `Rule ${result.rows[0].enabled ? "enabled" : "disabled"}` });
    res.json({ data: result.rows[0] });
  }),
);

router.post(
  "/:id/test",
  asyncHandler(async (req, res) => {
    const rule = await query("SELECT * FROM firewall_rules WHERE id = $1", [req.params.id]);
    if (!rule.rows.length) throw new HttpError(404, "Không tìm thấy quy tắc tường lửa");
    const r = rule.rows[0];
    const { source_ip, destination_ip, protocol, destination_port } = req.body;
    const matches = {
      source_ip: !r.source_ip || r.source_ip === "any" || r.source_ip === source_ip,
      destination_ip: !r.destination_ip || r.destination_ip === "any" || r.destination_ip === destination_ip,
      protocol: !r.protocol || r.protocol === "any" || r.protocol === protocol,
      destination_port: !r.destination_port || String(r.destination_port) === String(destination_port),
    };
    const matched = Object.values(matches).every(Boolean);
    if (matched) await query("UPDATE firewall_rules SET hit_count = hit_count + 1, last_hit_at = now() WHERE id = $1", [req.params.id]);
    res.json({ data: { matched, verdict: matched ? r.action : "allow", rule: { id: r.id, name: r.name, action: r.action }, checks: matches } });
  }),
);

router.post(
  "/:id/apply",
  requirePermission("firewall:apply"),
  asyncHandler(async (req, res) => {
    const rule = await query("SELECT * FROM firewall_rules WHERE id = $1", [req.params.id]);
    if (!rule.rows.length) throw new HttpError(404, "Không tìm thấy quy tắc tường lửa");
    await query("UPDATE firewall_rules SET metadata = metadata || $1 WHERE id = $2", [JSON.stringify({ applied_at: new Date().toISOString(), applied_by: req.user.email }), req.params.id]);
    await recordActivity({ eventType: "firewall_apply", req, resource: "firewall_rules", resourceId: req.params.id, action: "apply", message: `Quy tắc ${rule.rows[0].name} đã được đẩy tới tường lửa biên` });
    res.json({ data: { applied: true, rule_id: req.params.id, applied_at: new Date().toISOString(), targets: ["edge-us-east", "edge-eu-west", "cloud-waf"] } });
  }),
);

router.delete(
  "/:id",
  requirePermission("delete"),
  asyncHandler(async (req, res) => {
    const result = await query("DELETE FROM firewall_rules WHERE id = $1 RETURNING id", [req.params.id]);
    if (!result.rows.length) throw new HttpError(404, "Không tìm thấy quy tắc tường lửa");
    await recordAudit({ req, action: "delete", resource: "firewall_rules", resourceId: req.params.id });
    res.json({ deleted: true, id: req.params.id });
  }),
);

module.exports = router;
