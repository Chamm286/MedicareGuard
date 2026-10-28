const jwt = require("jsonwebtoken");
const config = require("../config/env");
const { HttpError } = require("../utils/http");

const authenticate = (req, _res, next) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return next(new HttpError(401, "Thiếu hoặc sai định dạng tiêu đề Authorization"));
  }
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      roleId: payload.roleId,
      permissions: payload.permissions || [],
    };
    return next();
  } catch (error) {
    return next(new HttpError(401, error.name === "TokenExpiredError" ? "Token đã hết hạn" : "Token không hợp lệ"));
  }
};

const optionalAuth = (req, _res, next) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme === "Bearer" && token) {
    try {
      const payload = jwt.verify(token, config.jwt.secret);
      req.user = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        roleId: payload.roleId,
        permissions: payload.permissions || [],
      };
    } catch (_error) {
      req.user = null;
    }
  }
  return next();
};

const authorize = (...roles) => (req, _res, next) => {
  if (!req.user) return next(new HttpError(401, "Yêu cầu xác thực"));
  if (roles.length && !roles.includes(req.user.role)) {
    return next(new HttpError(403, "Bạn không có quyền thực hiện hành động này"));
  }
  return next();
};

const requirePermission = (permission) => (req, _res, next) => {
  if (!req.user) return next(new HttpError(401, "Yêu cầu xác thực"));
  if (req.user.role === "admin") return next();
  if (!req.user.permissions.includes(permission) && !req.user.permissions.includes("*")) {
    return next(new HttpError(403, `Thiếu quyền: ${permission}`));
  }
  return next();
};

module.exports = { authenticate, optionalAuth, authorize, requirePermission };
