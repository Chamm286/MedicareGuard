#!/usr/bin/env node
const jwt = require("jsonwebtoken");
const config = require("../src/config/env");
const { query } = require("../src/config/db");

const main = async () => {
  const email = process.argv[2] || process.env.N8N_SERVICE_EMAIL || "admin@medicareguard.io";
  const expiresIn = process.argv[3] || process.env.N8N_SERVICE_TOKEN_TTL || "30d";
  const result = await query(
    `SELECT u.id, u.email, u.full_name, r.id AS role_id, r.name AS role_name, r.permissions
     FROM users u LEFT JOIN roles r ON r.id = u.role_id
     WHERE lower(u.email) = lower($1) LIMIT 1`,
    [email],
  );
  const user = result.rows[0];
  if (!user) throw new Error(`User not found: ${email}`);
  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.full_name,
      role: user.role_name,
      roleId: user.role_id,
      permissions: user.permissions || [],
      aud: "medicareguard-n8n",
    },
    config.jwt.secret,
    { expiresIn },
  );
  process.stdout.write(token + "\n");
};

main().catch((error) => {
  process.stderr.write(`Could not mint n8n service token: ${error.message}\n`);
  process.exit(1);
});
