const express = require("express");
const { query, healthCheck } = require("../config/db");
const { asyncHandler } = require("../utils/http");
const { resources, dedicatedResources } = require("../config/resources");
const { enumerateRoutes } = require("../utils/routes");
const { authenticate, optionalAuth } = require("../middleware/auth");

const router = express.Router();

router.get(
  "/health",
  asyncHandler(async (_req, res) => {
    res.json({ status: "ok", service: "medicareguard-api", version: "1.0.0", timestamp: new Date().toISOString(), uptime: Math.round(process.uptime()) });
  }),
);

router.get(
  "/health/db",
  asyncHandler(async (_req, res) => {
    const started = Date.now();
    const info = await healthCheck();
    res.json({ status: "ok", database: info.database, serverTime: info.now, latencyMs: Date.now() - started });
  }),
);

router.get(
  "/metrics",
  asyncHandler(async (_req, res) => {
    const rows = await query(`SELECT
      (SELECT count(*) FROM alerts) AS alerts,
      (SELECT count(*) FROM threats) AS threats,
      (SELECT count(*) FROM incidents) AS incidents,
      (SELECT count(*) FROM assets) AS assets,
      (SELECT count(*) FROM users) AS users,
      (SELECT count(*) FROM activity_logs) AS logs`);
    const m = rows.rows[0];
    const lines = [
      "# HELP medicareguard_records_total Total records per domain",
      "# TYPE medicareguard_records_total gauge",
      ...Object.entries(m).map(([key, value]) => `medicareguard_records_total{domain="${key}"} ${value}`),
      "# HELP medicareguard_uptime_seconds Process uptime",
      "# TYPE medicareguard_uptime_seconds gauge",
      `medicareguard_uptime_seconds ${Math.round(process.uptime())}`,
    ];
    res.setHeader("Content-Type", "text/plain; version=0.0.4");
    res.send(`${lines.join("\n")}\n`);
  }),
);

router.get(
  "/_meta/endpoints",
  asyncHandler(async (req, res) => {
    const routes = enumerateRoutes(req.app).filter((route) => route.path.startsWith("/api"));
    res.json({
      total: routes.length,
      byMethod: routes.reduce((acc, route) => ({ ...acc, [route.method]: (acc[route.method] || 0) + 1 }), {}),
      routes,
    });
  }),
);

router.get(
  "/_meta/resources",
  asyncHandler(async (_req, res) => {
    const counts = {};
    await Promise.all(
      resources.map(async (resource) => {
        try {
          const result = await query(`SELECT count(*)::int AS total FROM ${resource.table}`);
          counts[resource.name] = result.rows[0].total;
        } catch (_error) {
          counts[resource.name] = null;
        }
      }),
    );
    res.json({
      data: {
        dedicated: dedicatedResources,
        generic: resources.map((resource) => ({
          name: resource.name,
          label: resource.label,
          group: resource.group,
          description: resource.description,
          columns: resource.columns,
          count: counts[resource.name],
          endpoints: 11,
        })),
        totals: { resources: resources.length + dedicatedResources.length, documentedEndpoints: resources.length * 11 + 60 },
      },
    });
  }),
);

router.get(
  "/search",
  authenticate,
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || "").trim();
    if (q.length < 2) return res.status(400).json({ error: "Từ khóa tìm kiếm phải có ít nhất 2 ký tự" });
    const like = `%${q}%`;
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 6));
    const [alerts, threats, assets, incidents, users, vulnerabilities, reports] = await Promise.all([
      query("SELECT id, title, severity, status, source_ip FROM alerts WHERE title ILIKE $1 OR description ILIKE $1 OR source_ip ILIKE $1 LIMIT $2", [like, limit]),
      query("SELECT id, name, severity, country, source_ip FROM threats WHERE name ILIKE $1 OR source_ip ILIKE $1 OR ioc_value ILIKE $1 LIMIT $2", [like, limit]),
      query("SELECT id, name, type, criticality, ip_address FROM assets WHERE name ILIKE $1 OR hostname ILIKE $1 OR ip_address ILIKE $1 LIMIT $2", [like, limit]),
      query("SELECT id, incident_key, title, severity, status FROM incidents WHERE title ILIKE $1 OR incident_key ILIKE $1 LIMIT $2", [like, limit]),
      query("SELECT id, full_name, email, department FROM users WHERE full_name ILIKE $1 OR email ILIKE $1 LIMIT $2", [like, limit]),
      query("SELECT id, title, cve_id, severity, cvss_score FROM vulnerabilities WHERE title ILIKE $1 OR cve_id ILIKE $1 LIMIT $2", [like, limit]),
      query("SELECT id, name, type, status FROM reports WHERE name ILIKE $1 OR summary ILIKE $1 LIMIT $2", [like, limit]),
    ]);
    res.json({
      query: q,
      data: {
        alerts: alerts.rows,
        threats: threats.rows,
        assets: assets.rows,
        incidents: incidents.rows,
        users: users.rows,
        vulnerabilities: vulnerabilities.rows,
        reports: reports.rows,
      },
      total: alerts.rowCount + threats.rowCount + assets.rowCount + incidents.rowCount + users.rowCount + vulnerabilities.rowCount + reports.rowCount,
    });
  }),
);

router.get(
  "/dashboard/summary",
  optionalAuth,
  asyncHandler(async (_req, res) => {
    const [overview, timeline, countries, attackers, severity, categories, alerts, incidents, compliance, firewall, health] = await Promise.all([
      query(`SELECT
        (SELECT count(*)::int FROM alerts) AS total_alerts,
        (SELECT count(*)::int FROM alerts WHERE status IN ('open','investigating')) AS open_alerts,
        (SELECT count(*)::int FROM alerts WHERE severity = 'critical' AND status NOT IN ('resolved','false_positive')) AS critical_alerts,
        (SELECT count(*)::int FROM threats WHERE status = 'active') AS active_threats,
        (SELECT count(*)::int FROM incidents WHERE status NOT IN ('resolved','closed')) AS open_incidents,
        (SELECT count(*)::int FROM assets) AS total_assets,
        (SELECT count(*)::int FROM assets WHERE risk_score >= 70) AS high_risk_assets,
        (SELECT count(*)::int FROM vulnerabilities WHERE status = 'open') AS open_vulnerabilities,
        (SELECT count(*)::int FROM firewall_rules WHERE enabled) AS active_rules,
        (SELECT count(*)::int FROM users WHERE status = 'active') AS active_users,
        (SELECT round(avg(risk_score))::int FROM assets) AS avg_asset_risk,
        (SELECT round(avg(score))::int FROM compliance_controls) AS compliance_score,
        (SELECT count(*)::int FROM alerts WHERE detected_at > now() - interval '24 hours') AS alerts_24h,
        (SELECT count(*)::int FROM alerts WHERE detected_at > now() - interval '48 hours' AND detected_at <= now() - interval '24 hours') AS alerts_prev_24h,
        (SELECT count(*)::int FROM threats WHERE last_seen > now() - interval '24 hours') AS threats_24h`),
      query(`SELECT to_char(date_trunc('hour', detected_at), 'YYYY-MM-DD HH24:00') AS bucket, count(*)::int AS total,
                    count(*) FILTER (WHERE severity IN ('critical','high'))::int AS critical_high
             FROM alerts WHERE detected_at > now() - interval '7 days' GROUP BY 1 ORDER BY 1`),
      query("SELECT * FROM v_attacks_by_country LIMIT 12"),
      query("SELECT * FROM v_top_attackers LIMIT 8"),
      query("SELECT severity, count(*)::int AS total FROM alerts GROUP BY severity"),
      query("SELECT coalesce(category,'Uncategorised') AS category, count(*)::int AS total FROM threats GROUP BY category ORDER BY total DESC LIMIT 8"),
      query("SELECT a.id, a.title, a.severity, a.status, a.source_ip, a.country, a.risk_score, a.detected_at, u.full_name AS assignee_name FROM alerts a LEFT JOIN users u ON u.id = a.assignee_id ORDER BY a.detected_at DESC LIMIT 8"),
      query("SELECT i.id, i.incident_key, i.title, i.severity, i.status, i.priority, i.detected_at FROM incidents i WHERE i.status NOT IN ('resolved','closed') ORDER BY i.detected_at DESC LIMIT 6"),
      query("SELECT * FROM v_compliance_score ORDER BY score DESC"),
      query("SELECT action, count(*)::int AS total, coalesce(sum(hit_count),0)::bigint AS hits FROM firewall_rules GROUP BY action"),
      query("SELECT count(*) FILTER (WHERE status = 'up')::int AS monitors_up, count(*)::int AS monitors_total FROM monitors"),
    ]);
    const o = overview.rows[0];
    const change = o.alerts_prev_24h ? Math.round(((o.alerts_24h - o.alerts_prev_24h) / o.alerts_prev_24h) * 100) : 0;
    res.json({
      data: {
        overview: { ...o, alert_change_percent: change, uptime_percent: 99.98 },
        timeline: timeline.rows,
        countries: countries.rows,
        attackers: attackers.rows,
        severity: severity.rows,
        categories: categories.rows,
        recentAlerts: alerts.rows,
        openIncidents: incidents.rows,
        compliance: compliance.rows,
        firewall: firewall.rows,
        monitors: health.rows[0],
        generatedAt: new Date().toISOString(),
      },
    });
  }),
);

module.exports = router;
