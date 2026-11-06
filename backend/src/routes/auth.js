const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { query } = require("../config/db");
const config = require("../config/env");
const { asyncHandler, HttpError } = require("../utils/http");
const { authenticate } = require("../middleware/auth");
const { hashToken, signAccessToken, signResetToken, expiresInMs } = require("../utils/token");
const { recordActivity, recordAudit } = require("../services/audit");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Quá nhiều lần đăng nhập. Vui lòng thử lại sau vài phút." },
});

const USER_SELECT = `
  SELECT u.id, u.email, u.full_name, u.department, u.phone, u.avatar_url, u.status,
         u.mfa_enabled, u.last_login_at, u.created_at,
         r.id AS role_id, r.name AS role_name, r.permissions
  FROM users u LEFT JOIN roles r ON r.id = u.role_id
`;

const publicUser = (row) => ({
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
  role: row.role_name,
  roleId: row.role_id,
  permissions: row.permissions || [],
});

const createSession = async (user, token, req) => {
  await query(
    `INSERT INTO sessions (user_id, token_hash, ip_address, user_agent, expires_at)
     VALUES ($1,$2,$3,$4,$5)`,
    [
      user.id,
      hashToken(token),
      req.ip,
      req.headers["user-agent"] || null,
      new Date(Date.now() + expiresInMs()),
    ],
  );
};

router.post(
  "/login",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) throw new HttpError(400, "Email và mật khẩu là bắt buộc");

    const result = await query(`SELECT u.*, r.name AS role_name, r.permissions FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE lower(u.email) = lower($1)`, [email]);
    const user = result.rows[0];
    if (!user) throw new HttpError(401, "Thông tin đăng nhập không hợp lệ");
    if (user.status !== "active") throw new HttpError(403, "Tài khoản không hoạt động");

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new HttpError(401, "Thông tin đăng nhập không hợp lệ");

    const token = signAccessToken(user);
    await query("UPDATE users SET last_login_at = now() WHERE id = $1", [user.id]);
    await createSession(user, token, req);
    await recordActivity({
      eventType: "auth",
      req,
      resource: "users",
      resourceId: user.id,
      action: "login",
      message: `${user.email} đã đăng nhập`,
    });

    res.json({ token, tokenType: "Bearer", expiresIn: config.jwt.expiresIn, user: publicUser(user) });
  }),
);

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { email, password, fullName, department } = req.body;
    if (!email || !password || !fullName) throw new HttpError(400, "Email, mật khẩu và họ tên là bắt buộc");
    if (String(password).length < 8) throw new HttpError(400, "Mật khẩu phải có ít nhất 8 ký tự");

    const existing = await query("SELECT id FROM users WHERE lower(email) = lower($1)", [email]);
    if (existing.rows.length) throw new HttpError(409, "Tài khoản với email này đã tồn tại");

    const role = await query("SELECT id FROM roles WHERE name = 'viewer' LIMIT 1");
    const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, role_id, department)
       VALUES (lower($1), $2, $3, $4, $5) RETURNING id`,
      [email, passwordHash, fullName, role.rows[0]?.id || null, department || "Vận hành an ninh"],
    );
    await recordAudit({ req, action: "register", resource: "users", resourceId: result.rows[0].id });
    res.status(201).json({ data: { id: result.rows[0].id, email, fullName, role: "viewer" } });
  }),
);

router.post(
  "/refresh",
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await query(`${USER_SELECT} WHERE u.id = $1`, [req.user.id]);
    const row = result.rows[0];
    if (!row) throw new HttpError(404, "Không tìm thấy người dùng");
    const token = signAccessToken(row);
    await createSession(row, token, req);
    res.json({ token, tokenType: "Bearer", expiresIn: config.jwt.expiresIn, user: publicUser(row) });
  }),
);

router.post(
  "/logout",
  authenticate,
  asyncHandler(async (req, res) => {
    const token = (req.headers.authorization || "").split(" ")[1];
    if (token) {
      await query("UPDATE sessions SET revoked = true WHERE token_hash = $1", [hashToken(token)]);
    }
    await recordActivity({
      eventType: "auth",
      req,
      resource: "users",
      resourceId: req.user.id,
      action: "logout",
      message: `${req.user.email} đã đăng xuất`,
    });
    res.json({ message: "Đã đăng xuất" });
  }),
);

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await query(`${USER_SELECT} WHERE u.id = $1`, [req.user.id]);
    if (!result.rows.length) throw new HttpError(404, "Không tìm thấy người dùng");
    res.json({ data: publicUser(result.rows[0]) });
  }),
);

router.patch(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const allowed = ["full_name", "department", "phone", "avatar_url"];
    const fields = allowed.filter((field) => req.body[field] !== undefined);
    if (!fields.length) throw new HttpError(400, "Không có trường nào có thể chỉnh sửa");
    const values = fields.map((field) => req.body[field]);
    values.push(req.user.id);
    const result = await query(
      `UPDATE users SET ${fields.map((field, index) => `${field} = $${index + 1}`).join(", ")} WHERE id = $${values.length} RETURNING id, email, full_name, department, phone, avatar_url`,
      values,
    );
    res.json({ data: result.rows[0] });
  }),
);

router.post(
  "/change-password",
  authenticate,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) throw new HttpError(400, "Mật khẩu hiện tại và mật khẩu mới là bắt buộc");
    if (String(newPassword).length < 8) throw new HttpError(400, "Mật khẩu mới phải có ít nhất 8 ký tự");

    const result = await query("SELECT password_hash FROM users WHERE id = $1", [req.user.id]);
    const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!valid) throw new HttpError(400, "Mật khẩu hiện tại không đúng");

    const hash = await bcrypt.hash(newPassword, config.bcryptRounds);
    await query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, req.user.id]);
    await query("UPDATE sessions SET revoked = true WHERE user_id = $1", [req.user.id]);
    await recordAudit({ req, action: "change_password", resource: "users", resourceId: req.user.id });
    res.json({ message: "Đã cập nhật mật khẩu. Các phiên hiện có đã bị thu hồi." });
  }),
);

router.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) throw new HttpError(400, "Email là bắt buộc");
    const result = await query("SELECT id, email FROM users WHERE lower(email) = lower($1)", [email]);
    const payload = { message: "Nếu tài khoản tồn tại, liên kết đặt lại đã được gửi." };
    if (result.rows.length) {
      payload.resetToken = signResetToken(result.rows[0]);
      if (config.isProduction) delete payload.resetToken;
    }
    res.json(payload);
  }),
);

router.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) throw new HttpError(400, "Token và mật khẩu mới là bắt buộc");
    if (String(newPassword).length < 8) throw new HttpError(400, "Mật khẩu phải có ít nhất 8 ký tự");
    let payload;
    try {
      payload = jwt.verify(token, config.jwt.secret);
    } catch (_error) {
      throw new HttpError(400, "Token đặt lại không hợp lệ hoặc đã hết hạn");
    }
    if (payload.purpose !== "password_reset") throw new HttpError(400, "Token đặt lại không hợp lệ");
    const hash = await bcrypt.hash(newPassword, config.bcryptRounds);
    await query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, payload.sub]);
    await query("UPDATE sessions SET revoked = true WHERE user_id = $1", [payload.sub]);
    res.json({ message: "Mật khẩu đã được đặt lại" });
  }),
);

module.exports = router;
