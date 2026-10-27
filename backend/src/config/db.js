const { Pool } = require("pg");
const config = require("./env");
const logger = require("../utils/logger");

const pool = new Pool({
  connectionString: config.database.url,
  ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on("error", (error) => {
  logger.error("Unexpected PostgreSQL pool error", { error: error.message });
});

const query = async (text, params = []) => {
  const startedAt = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - startedAt;
  if (duration > 750) {
    logger.warn("Slow query", { duration, text: text.slice(0, 160) });
  }
  return result;
};

const withTransaction = async (handler) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await handler(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const healthCheck = async () => {
  const { rows } = await query("SELECT now() AS now, current_database() AS database");
  return rows[0];
};

module.exports = { pool, query, withTransaction, healthCheck };
