const jwt = require("jsonwebtoken");
const config = require("../config/env");
const { HttpError } = require("../utils/http");

const authenticate = (req, _res, next) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return next(new HttpError(401, "Missing or malformed Authorization header"));
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
    return next(new HttpError(401, error.name === "TokenExpiredError" ? "Token expired" : "Invalid token"));
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
  if (!req.user) return next(new HttpError(401, "Authentication required"));
  if (roles.length && !roles.includes(req.user.role)) {
    return next(new HttpError(403, "You do not have permission to perform this action"));
  }
  return next();
};

const requirePermission = (permission) => (req, _res, next) => {
  if (!req.user) return next(new HttpError(401, "Authentication required"));
  if (req.user.role === "admin") return next();
  if (!req.user.permissions.includes(permission) && !req.user.permissions.includes("*")) {
    return next(new HttpError(403, `Missing permission: ${permission}`));
  }
  return next();
};

module.exports = { authenticate, optionalAuth, authorize, requirePermission };
