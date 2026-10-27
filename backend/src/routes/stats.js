const express = require("express");
const { query } = require("../config/db");
const { asyncHandler } = require("../utils/http");

const router = express.Router();

const COUNTRY_COORDS = {
  CN: { lat: 35.86, lon: 104.19 }, RU: { lat: 61.52, lon: 105.32 }, US: { lat: 37.09, lon: -95.71 },
  BR: { lat: -14.24, lon: -51.93 }, IN: { lat: 20.59, lon: 78.96 }, IR: { lat: 32.43, lon: 53.69 },
  KP: { lat: 40.34, lon: 127.51 }, VN: { lat: 14.06, lon: 108.28 }, DE: { lat: 51.17, lon: 10.45 },
  NL: { lat: 52.13, lon: 5.29 }, UA: { lat: 48.38, lon: 31.17 }, RO: { lat: 45.94, lon: 24.97 },
  NG: { lat: 9.08, lon: 8.68 }, ID: { lat: -0.79, lon: 113.92 }, KR: { lat: 35.91, lon: 127.77 },
  TR: { lat: 38.96, lon: 35.24 }, GB: { lat: 55.38, lon: -3.44 }, FR: { lat: 46.23, lon: 2.21 },
  SG: { lat: 1.35, lon: 103.82 }, JP: { lat: 36.2, lon: 138.25 }, PH: { lat: 12.88, lon: 121.77 },
  TH: { lat: 15.87, lon: 100.99 }, MY: { lat: 4.21, lon: 101.98 }, AU: { lat: -25.27, lon: 133.78 },
  CA: { lat: 56.13, lon: -106.35 }, UN: { lat: 0, lon: 0 },
};

router.get(
  "/overview",
  asyncHandler(async (_req, res) => {
    const [counters, risk, compliance, trend] = await Promise.all([
      query(`SELECT
        (SELECT count(*)::int FROM alerts) AS total_alerts,
        (SELECT count(*)::int FROM alerts WHERE status IN ('open','investigating')) AS open_alerts,
        (SELECT count(*)::int FROM alerts WHERE severity = 'critical' AND status NOT IN ('resolved','false_positive')) AS critical_alerts,
        (SELECT count(*)::int FROM threats WHERE status = 'active') AS active_threats,
        (SELECT count(*)::int FROM incidents WHERE status NOT IN ('resolved','closed')) AS open_incidents,
        (SELECT count(*)::int FROM assets) AS total_assets,
        (SELECT count(*)::int FROM assets WHERE risk_score >= 70) AS high_risk_assets,
        (SELECT count(*)::int FROM firewall_rules WHERE enabled) AS active_rules,
        (SELECT count(*)::int FROM vulnerabilities WHERE status = 'open') AS open_vulnerabilities,
        (SELECT count(*)::int FROM users WHERE status = 'active') AS active_users`),
      query("SELECT round(avg(risk_score))::int AS avg_asset_risk FROM assets"),
      query("SELECT round(avg(score))::int AS compliance_score FROM compliance_controls"),
      query(`SELECT
        (SELECT count(*)::int FROM alerts WHERE detected_at > now() - interval '24 hours') AS alerts_24h,
        (SELECT count(*)::int FROM alerts WHERE detected_at > now() - interval '48 hours' AND detected_at <= now() - interval '24 hours') AS alerts_prev_24h,
        (SELECT count(*)::int FROM threats WHERE last_seen > now() - interval '24 hours') AS threats_24h`),
    ]);
    const c = counters.rows[0];
    const t = trend.rows[0];
    const change = t.alerts_prev_24h ? Math.round(((t.alerts_24h - t.alerts_prev_24h) / t.alerts_prev_24h) * 100) : 0;
    res.json({
      data: {
        ...c,
        avg_asset_risk: risk.rows[0].avg_asset_risk || 0,
        compliance_score: compliance.rows[0].compliance_score || 0,
        alerts_24h: t.alerts_24h,
        threats_24h: t.threats_24h,
        alert_change_percent: change,
        detection_sources: 12,
        uptime_percent: 99.98,
      },
    });
  }),
);

router.get(
  "/attacks-by-country",
  asyncHandler(async (req, res) => {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const rows = await query("SELECT * FROM v_attacks_by_country LIMIT $1", [limit]);
    const data = rows.rows.map((row) => ({
      ...row,
      ...(COUNTRY_COORDS[row.country_code] || COUNTRY_COORDS.UN),
    }));
    res.json({ data, total: data.reduce((sum, row) => sum + row.attacks, 0) });
  }),
);

router.get(
  "/top-attackers",
  asyncHandler(async (req, res) => {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const rows = await query("SELECT * FROM v_top_attackers LIMIT $1", [limit]);
    res.json({ data: rows.rows.map((row, index) => ({ ...row, rank: index + 1 })) });
  }),
);

router.get(
  "/attack-timeline",
  asyncHandler(async (req, res) => {
    const range = ["24h", "7d", "30d"].includes(req.query.range) ? req.query.range : "7d";
    const config = { "24h": { interval: "24 hours", bucket: "hour" }, "7d": { interval: "7 days", bucket: "day" }, "30d": { interval: "30 days", bucket: "day" } }[range];
    const rows = await query(
      `SELECT to_char(date_trunc('${config.bucket}', detected_at), ${config.bucket === "hour" ? "'YYYY-MM-DD HH24:00'" : "'YYYY-MM-DD'"}) AS bucket,
              count(*)::int AS total,
              count(*) FILTER (WHERE severity = 'critical')::int AS critical,
              count(*) FILTER (WHERE severity = 'high')::int AS high,
              count(*) FILTER (WHERE severity = 'medium')::int AS medium,
              count(*) FILTER (WHERE severity = 'low')::int AS low
       FROM alerts WHERE detected_at > now() - interval '${config.interval}'
       GROUP BY 1 ORDER BY 1`,
    );
    res.json({ data: rows.rows, range });
  }),
);

router.get(
  "/severity-distribution",
  asyncHandler(async (_req, res) => {
    const [alerts, threats, incidents] = await Promise.all([
      query("SELECT severity, count(*)::int AS total FROM alerts GROUP BY severity"),
      query("SELECT severity, count(*)::int AS total FROM threats GROUP BY severity"),
      query("SELECT severity, count(*)::int AS total FROM incidents GROUP BY severity"),
    ]);
    res.json({ data: { alerts: alerts.rows, threats: threats.rows, incidents: incidents.rows } });
  }),
);

router.get(
  "/threat-categories",
  asyncHandler(async (_req, res) => {
    const result = await query(
      `SELECT coalesce(category, 'Uncategorised') AS category, count(*)::int AS total,
              round(avg(risk_score))::int AS avg_risk
       FROM threats GROUP BY category ORDER BY total DESC`,
    );
    res.json({ data: result.rows });
  }),
);

router.get(
  "/asset-risk",
  asyncHandler(async (_req, res) => {
    const [buckets, byCriticality, trend] = await Promise.all([
      query(`SELECT CASE WHEN risk_score >= 80 THEN 'critical' WHEN risk_score >= 60 THEN 'high' WHEN risk_score >= 40 THEN 'medium' ELSE 'low' END AS bucket,
                    count(*)::int AS total FROM assets GROUP BY 1`),
      query(`SELECT criticality, count(*)::int AS total, round(avg(risk_score))::int AS avg_risk FROM assets GROUP BY criticality`),
      query(`SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, round(avg(risk_score))::int AS avg_risk
             FROM assets WHERE created_at > now() - interval '30 days' GROUP BY 1 ORDER BY 1`),
    ]);
    res.json({ data: { buckets: buckets.rows, byCriticality: byCriticality.rows, trend: trend.rows } });
  }),
);

router.get(
  "/alert-trend",
  asyncHandler(async (req, res) => {
    const days = Math.min(90, Math.max(1, Number(req.query.days) || 14));
    const result = await query(
      `SELECT to_char(date_trunc('day', detected_at), 'YYYY-MM-DD') AS day,
              count(*)::int AS total,
              count(*) FILTER (WHERE status IN ('resolved','false_positive'))::int AS resolved
       FROM alerts WHERE detected_at > now() - ($1 || ' days')::interval
       GROUP BY 1 ORDER BY 1`,
      [days],
    );
    res.json({ data: result.rows });
  }),
);

router.get(
  "/mttr",
  asyncHandler(async (_req, res) => {
    const result = await query(
      `SELECT severity,
              round(avg(extract(epoch FROM (resolved_at - detected_at)) / 3600)::numeric, 1) AS avg_hours,
              count(*)::int AS resolved
       FROM incidents WHERE resolved_at IS NOT NULL GROUP BY severity`,
    );
    res.json({ data: result.rows });
  }),
);

router.get(
  "/compliance",
  asyncHandler(async (_req, res) => {
    const [frameworks, controls, byStatus] = await Promise.all([
      query("SELECT * FROM v_compliance_score ORDER BY score DESC"),
      query("SELECT framework, count(*)::int AS total, count(*) FILTER (WHERE status = 'compliant')::int AS compliant FROM compliance_controls GROUP BY framework"),
      query("SELECT status, count(*)::int AS total FROM compliance_controls GROUP BY status"),
    ]);
    res.json({ data: { frameworks: frameworks.rows, controls: controls.rows, byStatus: byStatus.rows } });
  }),
);

router.get(
  "/incident-funnel",
  asyncHandler(async (_req, res) => {
    const stages = ["open", "investigating", "contained", "eradicated", "recovered", "resolved", "closed"];
    const result = await query("SELECT status, count(*)::int AS total FROM incidents GROUP BY status");
    const map = Object.fromEntries(result.rows.map((row) => [row.status, row.total]));
    res.json({ data: stages.map((stage) => ({ stage, total: map[stage] || 0 })) });
  }),
);

router.get(
  "/firewall",
  asyncHandler(async (_req, res) => {
    const [summary, topRules, recent] = await Promise.all([
      query(`SELECT count(*)::int AS total, count(*) FILTER (WHERE enabled)::int AS enabled,
                    count(*) FILTER (WHERE action = 'deny')::int AS deny_rules,
                    coalesce(sum(hit_count),0)::bigint AS total_hits FROM firewall_rules`),
      query("SELECT id, name, action, hit_count, source_ip, priority FROM firewall_rules ORDER BY hit_count DESC LIMIT 10"),
      query("SELECT id, name, action, enabled, updated_at FROM firewall_rules ORDER BY updated_at DESC LIMIT 10"),
    ]);
    res.json({ data: { summary: summary.rows[0], topRules: topRules.rows, recent: recent.rows } });
  }),
);

router.get(
  "/threat-map",
  asyncHandler(async (_req, res) => {
    const origins = await query(
      `SELECT coalesce(country_code,'UN') AS country_code, coalesce(country,'Unknown') AS country,
              count(*)::int AS attacks, round(avg(risk_score))::int AS risk,
              count(*) FILTER (WHERE severity IN ('critical','high'))::int AS high_risk
       FROM threats GROUP BY 1,2 ORDER BY attacks DESC LIMIT 30`,
    );
    const data = origins.rows.map((row) => ({ ...row, ...(COUNTRY_COORDS[row.country_code] || COUNTRY_COORDS.UN) }));
    res.json({ data });
  }),
);

router.get(
  "/realtime",
  asyncHandler(async (_req, res) => {
    const [alerts, threats, logs] = await Promise.all([
      query("SELECT id, title, severity, source_ip, country, detected_at FROM alerts ORDER BY detected_at DESC LIMIT 8"),
      query("SELECT id, name, severity, country, last_seen FROM threats ORDER BY last_seen DESC LIMIT 8"),
      query("SELECT id, level, event_type, message, created_at FROM activity_logs ORDER BY created_at DESC LIMIT 10"),
    ]);
    res.json({ data: { alerts: alerts.rows, threats: threats.rows, logs: logs.rows, generated_at: new Date().toISOString() } });
  }),
);

router.get(
  "/soc-health",
  asyncHandler(async (_req, res) => {
    const [sources, agents, monitors, queue] = await Promise.all([
      query("SELECT status, count(*)::int AS total FROM data_sources GROUP BY status"),
      query("SELECT status, count(*)::int AS total FROM agents GROUP BY status"),
      query("SELECT count(*)::int AS total, round(avg(uptime_percent),2) AS avg_uptime FROM monitors"),
      query("SELECT count(*)::int AS pending FROM scans WHERE status IN ('queued','running')"),
    ]);
    res.json({ data: { sources: sources.rows, agents: agents.rows, monitors: monitors.rows[0], scanQueue: queue.rows[0] } });
  }),
);

router.get(
  "/executive-summary",
  asyncHandler(async (_req, res) => {
    const [overview, countries, attackers, categories, compliance] = await Promise.all([
      query(`SELECT
        (SELECT count(*)::int FROM alerts WHERE detected_at > now() - interval '30 days') AS alerts_30d,
        (SELECT count(*)::int FROM incidents WHERE detected_at > now() - interval '30 days') AS incidents_30d,
        (SELECT count(*)::int FROM threats WHERE last_seen > now() - interval '30 days') AS threats_30d,
        (SELECT round(avg(risk_score))::int FROM assets) AS avg_risk`),
      query("SELECT * FROM v_attacks_by_country LIMIT 5"),
      query("SELECT * FROM v_top_attackers LIMIT 5"),
      query("SELECT coalesce(category,'Uncategorised') AS category, count(*)::int AS total FROM threats GROUP BY category ORDER BY total DESC LIMIT 5"),
      query("SELECT round(avg(score))::int AS score FROM compliance_controls"),
    ]);
    res.json({
      data: {
        overview: overview.rows[0],
        topCountries: countries.rows,
        topAttackers: attackers.rows,
        topCategories: categories.rows,
        complianceScore: compliance.rows[0].score || 0,
        generatedAt: new Date().toISOString(),
      },
    });
  }),
);

module.exports = router;
