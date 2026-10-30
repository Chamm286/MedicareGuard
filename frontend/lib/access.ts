import type { SessionUser } from "./auth";

export type Role = "admin" | "analyst" | "hunter" | "viewer";

export const ROLES: Role[] = ["admin", "analyst", "hunter", "viewer"];

export const ROLE_META: Record<Role, { label: string; short: string; description: string; tone: string; home: string }> = {
  admin: {
    label: "Quản trị viên",
    short: "Admin",
    description: "Toàn quyền nền tảng, người dùng, cài đặt và vận hành SOC.",
    tone: "border-violet-400/25 bg-violet-500/10 text-violet-200",
    home: "/dashboard",
  },
  analyst: {
    label: "Chuyên viên SOC",
    short: "Analyst",
    description: "Phân loại, ứng phó sự cố, tường lửa, báo cáo và tự động hóa.",
    tone: "border-brand-400/25 bg-brand-500/10 text-brand-200",
    home: "/dashboard",
  },
  hunter: {
    label: "Chuyên viên săn tìm",
    short: "Hunter",
    description: "Săn tìm mối đe dọa, tình báo, phát hiện và điều tra chuyên sâu.",
    tone: "border-cyan-400/25 bg-cyan-500/10 text-cyan-200",
    home: "/hunting",
  },
  viewer: {
    label: "Bên liên quan",
    short: "Viewer",
    description: "Chỉ đọc báo cáo, cảnh báo và tình trạng an ninh để giám sát.",
    tone: "border-slate-400/25 bg-slate-500/10 text-slate-200",
    home: "/reports",
  },
};

export const normalizeRole = (role?: string | null): Role => {
  const value = String(role || "").toLowerCase();
  if (value.includes("admin")) return "admin";
  if (value.includes("hunter")) return "hunter";
  if (value.includes("viewer")) return "viewer";
  return "analyst";
};

export const roleHome = (role?: string | null) => ROLE_META[normalizeRole(role)].home;

export const hasPermission = (user: SessionUser | null | undefined, permission: string) => {
  if (!user) return false;
  const permissions = user.permissions || [];
  return permissions.includes("*") || permissions.includes(permission);
};

export const roleAllowed = (role: string | null | undefined, roles?: Role[]) => {
  if (!roles || roles.length === 0) return true;
  return roles.includes(normalizeRole(role));
};

export const canAccessRoles = (user: SessionUser | null | undefined, roles?: Role[]) => roleAllowed(user?.role, roles);

export const canWrite = (user: SessionUser | null | undefined) => hasPermission(user, "write");

type RouteRule = { prefix: string; roles: Role[] };

export const ROUTE_RULES: RouteRule[] = [
  { prefix: "/dashboard", roles: ["admin", "analyst", "hunter", "viewer"] },
  { prefix: "/hunting", roles: ["admin", "analyst", "hunter"] },
  { prefix: "/alerts", roles: ["admin", "analyst", "hunter", "viewer"] },
  { prefix: "/incidents", roles: ["admin", "analyst", "hunter", "viewer"] },
  { prefix: "/threats", roles: ["admin", "analyst", "hunter"] },
  { prefix: "/threat-intel", roles: ["admin", "analyst", "hunter"] },
  { prefix: "/vulnerabilities", roles: ["admin", "analyst", "hunter"] },
  { prefix: "/assets", roles: ["admin", "analyst", "hunter"] },
  { prefix: "/firewall", roles: ["admin", "analyst"] },
  { prefix: "/playbooks", roles: ["admin", "analyst"] },
  { prefix: "/automation", roles: ["admin", "analyst"] },
  { prefix: "/ai", roles: ["admin", "analyst", "hunter", "viewer"] },
  { prefix: "/reports", roles: ["admin", "analyst", "hunter", "viewer"] },
  { prefix: "/logs", roles: ["admin", "analyst", "hunter"] },
  { prefix: "/users", roles: ["admin", "analyst"] },
  { prefix: "/settings", roles: ["admin"] },
  { prefix: "/store/admin", roles: ["admin", "analyst"] },
];

export const routeRule = (pathname: string) =>
  ROUTE_RULES.filter((rule) => pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)).sort(
    (a, b) => b.prefix.length - a.prefix.length,
  )[0];

export const canAccessPath = (pathname: string, role?: string | null) => {
  const rule = routeRule(pathname);
  return !rule || rule.roles.includes(normalizeRole(role));
};

export const allowedRolesForPath = (pathname: string) => routeRule(pathname)?.roles || ROLES;
