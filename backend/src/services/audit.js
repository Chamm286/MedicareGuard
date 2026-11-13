const { query } = require("../config/db");
const logger = require("../utils/logger");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const actorFrom = (req, fallbackEmail = null) => {
  const actor = req?.user || {};
  return {
    id: UUID_RE.test(String(actor.id || "")) ? String(actor.id) : null,
    email: actor.email || fallbackEmail,
  };
};

const clientIp = (req) => {
  const forwarded = req?.headers?.["x-forwarded-for"];
  return (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req?.ip) || null;
};

const recordAudit = async ({ req, action, resource, resourceId, details = {} }) => {
  try {
    const actor = actorFrom(req, "system@medicareguard.io");
    await query(
      `INSERT INTO audit_logs
        (actor_id, actor_email, action, resource, resource_id, ip_address, user_agent, details)
       VALUES ((SELECT id FROM users WHERE id = $1::uuid), $2, $3, $4, $5, $6, $7, $8)`,
      [
        actor.id,
        actor.email,
        action,
        resource || null,
        resourceId ? String(resourceId) : null,
        clientIp(req),
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
    const actor = actorFrom(req);
    await query(
      `INSERT INTO activity_logs
        (level, event_type, actor_id, actor_email, source_ip, user_agent, resource, resource_id, action, message, metadata)
       VALUES ($1, $2, (SELECT id FROM users WHERE id = $3::uuid), $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        level,
        eventType,
        actor.id,
        actor.email,
        clientIp(req),
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
