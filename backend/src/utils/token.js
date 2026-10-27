const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const config = require("../config/env");

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const signAccessToken = (user) =>
  jwt.sign(
    {
      email: user.email,
      name: user.full_name,
      role: user.role_name || user.role,
      roleId: user.role_id,
      permissions: user.permissions || [],
    },
    config.jwt.secret,
    { subject: user.id, expiresIn: config.jwt.expiresIn, issuer: "medicareguard-soc" },
  );

const signResetToken = (user) =>
  jwt.sign({ email: user.email, purpose: "password_reset" }, config.jwt.secret, {
    subject: user.id,
    expiresIn: "15m",
    issuer: "medicareguard-soc",
  });

const expiresInMs = (value = config.jwt.expiresIn) => {
  const match = String(value).match(/^(\d+)([smhd])$/);
  if (!match) return 12 * 60 * 60 * 1000;
  const amount = Number(match[1]);
  const unit = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2]];
  return amount * unit;
};

module.exports = { hashToken, signAccessToken, signResetToken, expiresInMs };
