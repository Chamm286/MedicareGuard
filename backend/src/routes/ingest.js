const express = require("express");
const crypto = require("node:crypto");
const { query } = require("../config/db");
const { asyncHandler, HttpError } = require("../utils/http");
const { n8nBaseUrl } = require("../services/automationRuntime");

const router = express.Router();

const COUNTRY_NAMES = {
  VN: "Việt Nam", US: "Hoa Kỳ", CN: "Trung Quốc", RU: "Nga", SG: "Singapore",
  NL: "Hà Lan", DE: "Đức", FR: "Pháp", GB: "Vương quốc Anh", JP: "Nhật Bản",
  UN: "Không xác định",
};

const severityOf = (value) => {
  const s = String(value || "medium").toLowerCase();
  return ["critical", "high", "medium", "low", "info"].includes(s) ? s : "medium";
};

const dispatchLiveMonitor = async (alert) => {
  try {
    const response = await fetch(`${n8nBaseUrl()}/webhook/mg-attack-monitor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityId: alert.id, mode: "ingest", triggeredBy: "security-log-ingest", startedAt: new Date().toISOString() }),
      signal: AbortSignal.timeout(2500),
    });
    return { dispatched: response.ok, status: response.ok ? "dispatched" : `HTTP ${response.status}` };
  } catch (error) {
    return { dispatched: false, status: error.name === "TimeoutError" ? "timeout" : "n8n-offline" };
  }
};

router.post(
  "/security-log",
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const title = String(body.title || body.message || "Security log event").slice(0, 240);
    const severity = severityOf(body.severity);
    const sourceIp = String(body.sourceIp || body.source_ip || body.ip || "unknown").slice(0, 80);
    const countryCode = String(body.countryCode || body.country_code || (sourceIp.startsWith("10.") ? "VN" : "UN")).toUpperCase().slice(0, 2);
    const country = COUNTRY_NAMES[countryCode] || body.country || "Không xác định";
    const riskScore = Number.isFinite(Number(body.riskScore)) ? Math.max(0, Math.min(100, Number(body.riskScore))) : severity === "critical" ? 90 : severity === "high" ? 75 : 40;

    const alert = await query(
      `INSERT INTO alerts
        (title, description, severity, status, source, source_ip, country, country_code, risk_score, confidence, tags, metadata, detected_at)
       VALUES ($1,$2,$3,'open',$4,$5,$6,$7,$8,$9,$10,$11,now())
       RETURNING id, title, severity, status, source, source_ip, country, country_code, risk_score, detected_at`,
      [
        title,
        String(body.description || body.message || title).slice(0, 2000),
        severity,
        String(body.source || "External Security Log").slice(0, 120),
        sourceIp,
        country,
        countryCode,
        riskScore,
        Number.isFinite(Number(body.confidence)) ? Number(body.confidence) : 85,
        ["ingest", "security-log"],
        JSON.stringify({ ingest: true, raw: body }),
      ],
    ).then((r) => r.rows[0]);

    const dispatch = await dispatchLiveMonitor(alert);
    res.status(201).json({ data: { alert, dispatch } });
  }),
);

module.exports = router;
