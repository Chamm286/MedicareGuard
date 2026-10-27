const logger = require("../utils/logger");
const { HttpError } = require("../utils/http");

const notFound = (req, res) => {
  res.status(404).json({
    error: "Route not found",
    method: req.method,
    path: req.originalUrl,
  });
};

const errorHandler = (error, req, res, _next) => {
  const status = error instanceof HttpError ? error.status : error.status || 500;
  const message = status >= 500 ? "Internal server error" : error.message;

  if (status >= 500) {
    logger.error("Unhandled request error", {
      path: req.originalUrl,
      method: req.method,
      error: error.message,
      stack: error.stack?.split("\n").slice(0, 4),
    });
  }

  res.status(status).json({
    error: message,
    ...(error.details ? { details: error.details } : {}),
    ...(process.env.NODE_ENV !== "production" && status >= 500 ? { stack: error.stack } : {}),
  });
};

module.exports = { notFound, errorHandler };
