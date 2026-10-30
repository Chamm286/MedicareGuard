const logger = require("../utils/logger");
const { HttpError } = require("../utils/http");

const notFound = (req, res) => {
  res.status(404).json({
    error: "Không tìm thấy tuyến đường",
    method: req.method,
    path: req.originalUrl,
  });
};

const errorHandler = (error, req, res, _next) => {
  const status = error instanceof HttpError ? error.status : error.status || 500;
  const message = status >= 500 ? "Lỗi máy chủ nội bộ" : error.message;

  if (status >= 500) {
    logger.error("Lỗi yêu cầu chưa được xử lý", {
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
