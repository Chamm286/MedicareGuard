const express = require("express");
const { query } = require("../config/db");
const { asyncHandler, HttpError } = require("../utils/http");
const { authorize } = require("../middleware/auth");
const { recordAudit } = require("../services/audit");

const router = express.Router();

const PERMISSIONS = [
  "read", "write", "delete", "users:manage", "roles:manage", "alerts:write", "alerts:assign",
  "threats:write", "threats:enrich", "assets:write", "assets:scan", "incidents:write",
  "incidents:resolve", "firewall:write", "firewall:apply", "logs:read", "logs:purge",
  "reports:write", "reports:export", "ai:use", "ai:admin", "settings:manage", "integrations:manage",
];

router.get(
  "/permissions",
  asyncHandler(async (_req, res) => {
    res.json({ data: PERMISSIONS });
  }),
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = req.query.q ? `%${req.query.q}%` : null;
    const result = await query(
      `SELECT r.*, count(u.id)::int AS user_count
       FROM roles r LEFT JOIN users u ON u.role_id = r.id
       ${search ? "WHERE r.name ILIKE $1 OR r.description ILIKE $1" : ""}
       GROUP BY r.id ORDER BY r.level DESC, r.name ASC`,
      search ? [search] : [],
    );
    res.json({ data: result.rows });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await query("SELECT * FROM roles WHERE id = $1", [req.params.id]);
    if (!result.rows.length) throw new HttpError(404, "Role not found");
    res.json({ data: result.rows[0] });
  }),
);

router.get(
  "/:id/users",
  asyncHandler(async (req, res) => {
    const result = await query(
      "SELECT id, email, full_name, department, status, last_login_at FROM users WHERE role_id = $1 ORDER BY full_name",
      [req.params.id],
    );
    res.json({ data: result.rows });
  }),
);

router.get(
  "/:id/permissions",
  asyncHandler(async (req, res) => {
    const result = await query("SELECT permissions FROM roles WHERE id = $1", [req.params.id]);
    if (!result.rows.length) throw new HttpError(404, "Role not found");
    res.json({ data: result.rows[0].permissions });
  }),
);

router.post(
  "/",
  authorize("admin"),
  asyncHandler(async (req, res) => {
    const { name, description, permissions = [], level = 1 } = req.body;
    if (!name) throw new HttpError(400, "name is required");
    const result = await query(
      "INSERT INTO roles (name, description, permissions, level) VALUES ($1,$2,$3,$4) RETURNING *",
      [name, description || null, permissions, level],
    );
    await recordAudit({ req, action: "create", resource: "roles", resourceId: result.rows[0].id });
    res.status(201).json({ data: result.rows[0] });
  }),
);

router.put(
  "/:id",
  authorize("admin"),
  asyncHandler(async (req, res) => {
    const fields = ["name", "description", "permissions", "level"].filter((field) => req.body[field] !== undefined);
    if (!fields.length) throw new HttpError(400, "No valid fields supplied");
    const values = fields.map((field) => req.body[field]);
    values.push(req.params.id);
    const result = await query(
      `UPDATE roles SET ${fields.map((field, index) => `${field} = $${index + 1}`).join(", ")} WHERE id = $${values.length} RETURNING *`,
      values,
    );
    if (!result.rows.length) throw new HttpError(404, "Role not found");
    await recordAudit({ req, action: "update", resource: "roles", resourceId: req.params.id });
    res.json({ data: result.rows[0] });
  }),
);

router.patch(
  "/:id/permissions",
  authorize("admin"),
  asyncHandler(async (req, res) => {
    const { permissions } = req.body;
    if (!Array.isArray(permissions)) throw new HttpError(400, "permissions must be an array");
    const result = await query("UPDATE roles SET permissions = $1 WHERE id = $2 RETURNING *", [permissions, req.params.id]);
    if (!result.rows.length) throw new HttpError(404, "Role not found");
    await recordAudit({ req, action: "update_permissions", resource: "roles", resourceId: req.params.id, details: { permissions } });
    res.json({ data: result.rows[0] });
  }),
);

router.delete(
  "/:id",
  authorize("admin"),
  asyncHandler(async (req, res) => {
    const usage = await query("SELECT count(*)::int AS count FROM users WHERE role_id = $1", [req.params.id]);
    if (usage.rows[0].count > 0) throw new HttpError(409, "Role is assigned to users and cannot be deleted");
    const result = await query("DELETE FROM roles WHERE id = $1 RETURNING id", [req.params.id]);
    if (!result.rows.length) throw new HttpError(404, "Role not found");
    await recordAudit({ req, action: "delete", resource: "roles", resourceId: req.params.id });
    res.json({ deleted: true, id: req.params.id });
  }),
);

module.exports = router;
