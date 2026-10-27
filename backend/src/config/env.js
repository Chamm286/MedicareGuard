const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });
require("dotenv").config();

const bool = (value, fallback = false) => {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
};

const config = {
  env: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  apiPrefix: process.env.API_PREFIX || "/api",
  isProduction: process.env.NODE_ENV === "production",
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:8080")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  jwt: {
    secret: process.env.JWT_SECRET || "change-me-in-production-medicareguard-2026",
    expiresIn: process.env.JWT_EXPIRES_IN || "12h",
  },
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 10),
  database: {
    url:
      process.env.DATABASE_URL ||
      `postgresql://${process.env.POSTGRES_USER || "medicare"}:${process.env.POSTGRES_PASSWORD || "medicare"}@${process.env.POSTGRES_HOST || "localhost"}:${process.env.POSTGRES_PORT || 5433}/${process.env.POSTGRES_DB || "medicareguard"}`,
    ssl: bool(process.env.DATABASE_SSL, false),
  },
  seedOnStart: bool(process.env.SEED_ON_START, false),
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  },
};

module.exports = config;
