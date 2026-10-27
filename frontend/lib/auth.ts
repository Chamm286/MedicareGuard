export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  roleId?: string;
  department?: string;
  permissions?: string[];
  avatarUrl?: string | null;
};

const TOKEN_KEY = "mg_token";
const USER_KEY = "mg_user";

export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
};

export const getUser = (): SessionUser | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
};

export const setSession = (token: string, user: SessionUser) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("mg-session"));
};

export const clearSession = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event("mg-session"));
};

export const isAuthenticated = () => Boolean(getToken());
