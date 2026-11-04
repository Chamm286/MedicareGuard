const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
const { query, withTransaction } = require("../config/db");
const config = require("../config/env");
const { asyncHandler, HttpError, parsePagination } = require("../utils/http");
const { authorize } = require("../middleware/auth");
const { recordAudit } = require("../services/audit");

const router = express.Router();

const USER_FIELDS = `
  u.id, u.email, u.full_name, u.department, u.phone, u.avatar_url, u.status,
  u.mfa_enabled, u.last_login_at, u.created_at, u.updated_at,
  r.id AS role_id, r.name AS role_name, r.permissions
`;

const serialize = (row) => ({
  id: row.id,
  email: row.email,
  fullName: row.full_name,
  department: row.department,
  phone: row.phone,
  avatarUrl: row.avatar_url,
  status: row.status,
  mfaEnabled: row.mfa_enabled,
  lastLoginAt: row.last_login_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  role: row.role_name,
  roleId: row.role_id,
  permissions: row.permissions || [],
});

router.get(
  "/export",
  authorize("admin"),
  asyncHandler(async (_req, res) => {
    const result = await query(`SELECT ${USER_FIELDS} FROM users u LEFT JOIN roles r ON r.id = u.role_id ORDER BY u.created_at DESC`);
    const rows = result.rows.map(serialize);
    const header = ["id", "email", "fullName", "role", "department", "status", "lastLoginAt"];
    const csv = [header.join(","), ...rows.map((row) => header.map((key) => `"${String(row[key] ?? "").replace(/"/g, '""')}"`).join(","))];
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="medicareguard-users-${Date.now()}.csv"`);
    res.send(csv.join("\n"));
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
      conditions.push(`(u.full_name ILIKE $${values.length} OR u.email ILIKE $${values.length} OR u.department ILIKE $${values.length})`);
    }
    if (req.query.role_id) {
      values.push(req.query.role_id);
      conditions.push(`u.role_id = $${values.length}`);
    }
    if (req.query.status) {
      values.push(req.query.status);
      conditions.push(`u.status = $${values.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const count = await query(`SELECT count(*)::int AS total FROM users u ${where}`, values);
    const dataResult = await query(
      `SELECT ${USER_FIELDS} FROM users u LEFT JOIN roles r ON r.id = u.role_id ${where}
       ORDER BY u.created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset],
    );
    const total = count.rows[0].total;
    res.json({
      data: dataResult.rows.map(serialize),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await query(`SELECT ${USER_FIELDS} FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.id = $1`, [req.params.id]);
    if (!result.rows.length) throw new HttpError(404, "Không tìm thấy người dùng");
    res.json({ data: serialize(result.rows[0]) });
  }),
);

router.get(
  "/:id/permissions",
  asyncHandler(async (req, res) => {
    const result = await query(`SELECT r.name AS role, r.permissions FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.id = $1`, [req.params.id]);
    if (!result.rows.length) throw new HttpError(404, "Không tìm thấy người dùng");
    res.json({ data: { role: result.rows[0].role, permissions: result.rows[0].permissions || [] } });
  }),
);

router.get(
  "/:id/sessions",
  authorize("admin"),
  asyncHandler(async (req, res) => {
    const result = await query(
      "SELECT id, ip_address, user_agent, expires_at, revoked, created_at FROM sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
      [req.params.id],
    );
    res.json({ data: result.rows });
  }),
);

router.delete(
  "/:id/sessions",
  authorize("admin"),
  asyncHandler(async (req, res) => {
    const result = await query("UPDATE sessions SET revoked = true WHERE user_id = $1 AND revoked = false RETURNING id", [req.params.id]);
    await recordAudit({ req, action: "revoke_sessions", resource: "users", resourceId: req.params.id });
    res.json({ revoked: result.rowCount });
  }),
);

router.get(
  "/:id/activity",
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT * FROM activity_logs WHERE actor_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [req.params.id],
    );
    res.json({ data: result.rows });
  }),
);

router.post(
  "/",
  authorize("admin"),
  asyncHandler(async (req, res) => {
    const { email, password, fullName, roleId, role_id, department, phone, status = "active", mfaEnabled = false } = req.body;
    if (!email || !password || !fullName) throw new HttpError(400, "Email, mật khẩu và họ tên là bắt buộc");
    if (String(password).length < 8) throw new HttpError(400, "Mật khẩu phải có ít nhất 8 ký tự");
    const exists = await query("SELECT id FROM users WHERE lower(email) = lower($1)", [email]);
    if (exists.rows.length) throw new HttpError(409, "Email đã tồn tại");

    const hash = await bcrypt.hash(password, config.bcryptRounds);
    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, role_id, department, phone, status, mfa_enabled)
       VALUES (lower($1),$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [email, hash, fullName, roleId || role_id || null, department || null, phone || null, status, Boolean(mfaEnabled)],
    );
    await recordAudit({ req, action: "create", resource: "users", resourceId: result.rows[0].id, details: { email } });
    const created = await query(`SELECT ${USER_FIELDS} FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.id = $1`, [result.rows[0].id]);
    res.status(201).json({ data: serialize(created.rows[0]) });
  }),
);

router.post(
  "/bulk",
  authorize("admin"),
  asyncHandler(async (req, res) => {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!items.length) throw new HttpError(400, "Mảng items là bắt buộc");
    const created = await withTransaction(async (client) => {
      const rows = [];
      for (const item of items) {
        if (!item.email || !item.fullName) continue;
        const password = item.password || crypto.randomBytes(9).toString("base64url");
        const hash = await bcrypt.hash(password, config.bcryptRounds);
        const result = await client.query(
          `INSERT INTO users (email, password_hash, full_name, role_id, department, status)
           VALUES (lower($1),$2,$3,$4,$5,$6) ON CONFLICT (email) DO NOTHING RETURNING id, email, full_name`,
          [item.email, hash, item.fullName, item.roleId || null, item.department || null, item.status || "active"],
        );
        if (result.rows[0]) rows.push({ ...result.rows[0], temporaryPassword: password });
      }
      return rows;
    });
    res.status(201).json({ data: created, count: created.length });
  }),
);

const updateUser = asyncHandler(async (req, res) => {
  const allowed = {
    email: "email",
    fullName: "full_name",
    roleId: "role_id",
    role_id: "role_id",
    department: "department",
    phone: "phone",
    status: "status",
    mfaEnabled: "mfa_enabled",
    avatarUrl: "avatar_url",
  };
  const fields = [];
  const values = [];
  Object.entries(allowed).forEach(([input, column]) => {
    if (req.body[input] !== undefined && !fields.includes(column)) {
      fields.push(column);
      values.push(req.body[input]);
    }
  });
  if (req.body.password) {
    if (String(req.body.password).length < 8) throw new HttpError(400, "Mật khẩu phải có ít nhất 8 ký tự");
    fields.push("password_hash");
    values.push(await bcrypt.hash(req.body.password, config.bcryptRounds));
  }
  if (!fields.length) throw new HttpError(400, "Không có trường hợp lệ nào được cung cấp");
  values.push(req.params.id);
  const result = await query(
    `UPDATE users SET ${fields.map((field, index) => `${field} = $${index + 1}`).join(", ")} WHERE id = $${values.length} RETURNING id`,
    values,
  );
  if (!result.rows.length) throw new HttpError(404, "Không tìm thấy người dùng");
  await recordAudit({ req, action: "update", resource: "users", resourceId: req.params.id, details: { fields } });
  const updated = await query(`SELECT ${USER_FIELDS} FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.id = $1`, [req.params.id]);
  res.json({ data: serialize(updated.rows[0]) });
});

router.put("/:id", authorize("admin"), updateUser);
router.patch("/:id", authorize("admin"), updateUser);

router.post(
  "/:id/reset-password",
  authorize("admin"),
  asyncHandler(async (req, res) => {
    const temporaryPassword = req.body.password || `MG-${crypto.randomBytes(6).toString("base64url")}`;
    if (String(temporaryPassword).length < 8) throw new HttpError(400, "Mật khẩu phải có ít nhất 8 ký tự");
    const hash = await bcrypt.hash(temporaryPassword, config.bcryptRounds);
    const result = await query("UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id", [hash, req.params.id]);
    if (!result.rows.length) throw new HttpError(404, "Không tìm thấy người dùng");
    await query("UPDATE sessions SET revoked = true WHERE user_id = $1", [req.params.id]);
    await recordAudit({ req, action: "reset_password", resource: "users", resourceId: req.params.id });
    res.json({ message: "Đặt lại mật khẩu", temporaryPassword, sessionsRevoked: true });
  }),
);

router.post(
  "/:id/activate",
  authorize("admin"),
  asyncHandler(async (req, res) => {
    const result = await query("UPDATE users SET status = 'active' WHERE id = $1 RETURNING id, email, status", [req.params.id]);
    if (!result.rows.length) throw new HttpError(404, "Không tìm thấy người dùng");
    await recordAudit({ req, action: "activate", resource: "users", resourceId: req.params.id });
    res.json({ data: result.rows[0] });
  }),
);

router.post(
  "/:id/deactivate",
  authorize("admin"),
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user.id) throw new HttpError(400, "Bạn không thể vô hiệu hóa tài khoản của chính mình");
    const result = await query("UPDATE users SET status = 'disabled' WHERE id = $1 RETURNING id, email, status", [req.params.id]);
    if (!result.rows.length) throw new HttpError(404, "Không tìm thấy người dùng");
    await query("UPDATE sessions SET revoked = true WHERE user_id = $1", [req.params.id]);
    await recordAudit({ req, action: "deactivate", resource: "users", resourceId: req.params.id });
    res.json({ data: result.rows[0] });
  }),
);

router.delete(
  "/:id",
  authorize("admin"),
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user.id) throw new HttpError(400, "Bạn không thể xóa tài khoản của chính mình");
    const result = await query("DELETE FROM users WHERE id = $1 RETURNING id", [req.params.id]);
    if (!result.rows.length) throw new HttpError(404, "Không tìm thấy người dùng");
    await recordAudit({ req, action: "delete", resource: "users", resourceId: req.params.id });
    res.json({ deleted: true, id: req.params.id });
  }),
);

module.exports = router;
