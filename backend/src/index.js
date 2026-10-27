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
      return callback(new Error("Origin not allowed by CORS"));
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
app.use(`${api}`, buildGenericRouter());

app.get("/", (_req, res) => res.json({ service: "MedicareGuard SOC API", docs: `${api}/_meta/endpoints`, health: `${api}/health` }));

app.use(notFound);
app.use(errorHandler);

const routes = enumerateRoutes(app);
const apiRoutes = routes.filter((route) => route.path.startsWith(api));

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
