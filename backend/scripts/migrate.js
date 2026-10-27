const fs = require("node:fs");
const path = require("node:path");
const { pool, query } = require("../src/config/db");
const logger = require("../src/utils/logger");

const candidates = [
  path.resolve(__dirname, "../database/schema.sql"),
  path.resolve(__dirname, "../../database/schema.sql"),
  "/app/database/schema.sql",
];

const findSchema = () => {
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error(`schema.sql not found in: ${candidates.join(", ")}`);
  return found;
};

const run = async () => {
  const file = findSchema();
  const sql = fs.readFileSync(file, "utf8");
  await query(sql);
  const tables = await query(
    `SELECT count(*)::int AS total FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
  );
  const views = await query(
    `SELECT count(*)::int AS total FROM information_schema.views WHERE table_schema = 'public'`,
  );
  logger.info("Database schema applied", { file, tables: tables.rows[0].total, views: views.rows[0].total });
  await pool.end();
};

run().catch(async (error) => {
  logger.error("Migration failed", { error: error.message });
  await pool.end().catch(() => {});
  process.exit(1);
});
