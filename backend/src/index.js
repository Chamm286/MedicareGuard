const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const config = require("./config/env");
const { healthCheck } = require("./config/db");
const logger = require("./utils/logger");
const { notFound, errorHandler } = require("./middleware/error");
const { authenticate } = require("./middleware/auth");
const { enumerateRoutes } = require("./utils/routes");
const swaggerUiDist = require("swagger-ui-dist");
const { buildOpenApi } = require("./openapi");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const roleRoutes = require("./routes/roles");
const alertRoutes = require("./routes/alerts");
const threatRoutes = require("./routes/threats");
const assetRoutes = require("./routes/assets");
const incidentRoutes = require("./routes/incidents");
const firewallRoutes = require("./routes/firewall");
const logRoutes = require("./routes/logs");
const statsRoutes = require("./routes/stats");
const reportRoutes = require("./routes/reports");
const aiRoutes = require("./routes/ai");
const automationRoutes = require("./routes/automation");
const demoRoutes = require("./routes/demo");
const storeRoutes = require("./routes/store");
const systemRoutes = require("./routes/system");
const { buildGenericRouter } = require("./routes/generic");
const { recordActivity } = require("./services/audit");

const app = express();
app.set("trust proxy", 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (config.corsOrigins.includes("*") || config.corsOrigins.includes(origin)) return callback(null, true);
      if (!config.isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
      if (!config.isProduction && /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(origin)) return callback(null, true);
      return callback(new Error("Nguồn gốc không được CORS cho phép"));
    },
    credentials: true,
  }),
);
app.use(compression());
app.use(express.json({ limit: "4mb" }));
app.use(express.urlencoded({ extended: true }));
if (config.env !== "test") app.use(morgan(config.isProduction ? "combined" : "dev"));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5000,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
);

const api = config.apiPrefix;

app.use(`${api}`, systemRoutes);
app.use(`${api}/auth`, authRoutes);
app.use(`${api}/users`, authenticate, userRoutes);
app.use(`${api}/roles`, authenticate, roleRoutes);
app.use(`${api}/alerts`, authenticate, alertRoutes);
app.use(`${api}/threats`, authenticate, threatRoutes);
app.use(`${api}/assets`, authenticate, assetRoutes);
app.use(`${api}/incidents`, authenticate, incidentRoutes);
app.use(`${api}/firewall-rules`, authenticate, firewallRoutes);
app.use(`${api}/logs`, authenticate, logRoutes);
app.use(`${api}/stats`, authenticate, statsRoutes);
app.use(`${api}/reports`, authenticate, reportRoutes);
app.use(`${api}/ai`, authenticate, aiRoutes);
app.use(`${api}/automation`, authenticate, automationRoutes);
app.use(`${api}/demo`, demoRoutes);
app.use(`${api}/store`, storeRoutes);
app.use(`${api}`, buildGenericRouter());

app.get("/", (_req, res) => res.json({ service: "MedicareGuard SOC API", docs: `${api}/docs`, openapi: `${api}/openapi.json`, endpoints: `${api}/_meta/endpoints`, health: `${api}/health` }));

const routes = enumerateRoutes(app);
const apiRoutes = routes.filter((route) => route.path.startsWith(api));
const openapi = buildOpenApi(apiRoutes, config);

app.get(`${api}/openapi.json`, (_req, res) => res.json(openapi));
app.use(`${api}/swagger-ui`, express.static(swaggerUiDist.absolutePath(), { maxAge: "1h" }));
const docsHtml = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MedicareGuard SOC API</title>
  <link rel="stylesheet" href="${api}/swagger-ui/swagger-ui.css" />
  <style>
    body { margin: 0; background: #f8fafc; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info .title { color: #0b1220; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="${api}/swagger-ui/swagger-ui-bundle.js"></script>
  <script src="${api}/swagger-ui/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function () {
      window.ui = SwaggerUIBundle({
        url: "${api}/openapi.json",
        dom_id: "#swagger-ui",
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: "StandaloneLayout",
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tagsSorter: "alpha",
        operationsSorter: "method"
      });
    };
  </script>
</body>
</html>`;
app.get([`${api}/docs`, `${api}/docs/`], (_req, res) => {
  res.removeHeader("Content-Security-Policy");
  res.type("html").send(docsHtml);
});

app.use(notFound);
app.use(errorHandler);

const start = async () => {
  try {
    await healthCheck();
    logger.info("PostgreSQL connection established");
    app.listen(config.port, "0.0.0.0", () => {
      logger.info(`MedicareGuard API listening on :${config.port}`, { env: config.env, endpoints: apiRoutes.length });
    });
    await recordActivity({
      eventType: "system",
      action: "startup",
      message: `API started with ${apiRoutes.length} endpoints`,
      metadata: { env: config.env },
    });
  } catch (error) {
    logger.error("Failed to start MedicareGuard API", { error: error.message });
    process.exit(1);
  }
};

if (require.main === module) start();

module.exports = { app, start, apiRoutes };
