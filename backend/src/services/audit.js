const { query } = require("../config/db");
const logger = require("../utils/logger");

const recordAudit = async ({ req, action, resource, resourceId, details = {} }) => {
  try {
    const actor = req?.user || {};
    const forwarded = req?.headers?.["x-forwarded-for"];
    const ip = (typeof forwarded === "string" ? forwarded.split(",")[0] : req?.ip) || null;
    await query(
      `INSERT INTO audit_logs
        (actor_id, actor_email, action, resource, resource_id, ip_address, user_agent, details)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        actor.id || null,
        actor.email || "system@medicareguard.io",
        action,
        resource || null,
        resourceId ? String(resourceId) : null,
        ip,
        req?.headers?.["user-agent"] || null,
        JSON.stringify(details),
      ],
    );
  } catch (error) {
    logger.warn("Could not persist audit log", { error: error.message, action, resource });
  }
};

const recordActivity = async ({ level = "info", eventType = "system", req, resource, resourceId, action, message, metadata = {} }) => {
  try {
    const actor = req?.user || {};
    const forwarded = req?.headers?.["x-forwarded-for"];
    const ip = (typeof forwarded === "string" ? forwarded.split(",")[0] : req?.ip) || null;
    await query(
      `INSERT INTO activity_logs
        (level, event_type, actor_id, actor_email, source_ip, user_agent, resource, resource_id, action, message, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        level,
        eventType,
        actor.id || null,
        actor.email || null,
        ip,
        req?.headers?.["user-agent"] || null,
        resource || null,
        resourceId ? String(resourceId) : null,
        action || null,
        message || null,
        JSON.stringify(metadata),
      ],
    );
  } catch (error) {
    logger.warn("Could not persist activity log", { error: error.message, resource, action });
  }
};

module.exports = { recordAudit, recordActivity };
