"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clearSession, getToken } from "./auth";
import { downloadBlob } from "./utils";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? "/api" : "http://localhost:4000/api");

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

type ApiOptions = Omit<RequestInit, "body"> & { body?: unknown; raw?: boolean };

export const api = async <T = any>(path: string, options: ApiOptions = {}): Promise<T> => {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let body = options.body as BodyInit | undefined;
  if (options.body !== undefined && !(options.body instanceof FormData) && typeof options.body !== "string") {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body,
    cache: options.cache || "no-store",
  });

  if (response.status === 401) {
    clearSession();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
  }

  if (options.raw) return response as unknown as T;

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    throw new ApiError(payload?.error || `Yêu cầu thất bại (${response.status})`, response.status, payload);
  }
  return payload as T;
};

export const apiDownload = async (path: string, filename: string) => {
  const response = await api<Response>(path, { raw: true });
  if (!response.ok) throw new ApiError(`Tải xuống thất bại (${response.status})`, response.status);
  const blob = await response.blob();
  downloadBlob(blob, filename);
};

type UseApiOptions = {
  refreshInterval?: number;
  enabled?: boolean;
};

export const useApi = <T = any>(path: string | null, options: UseApiOptions = {}) => {
  const { refreshInterval = 0, enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(path && enabled));
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);
  const initial = useRef(true);

  const load = useCallback(async () => {
    if (!path || !enabled) {
      setLoading(false);
      return;
    }
    if (initial.current) setLoading(true);
    else setRefreshing(true);
    try {
      const result = await api<T>(path);
      if (mounted.current) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (mounted.current) setError(err instanceof Error ? err.message : "Không thể tải dữ liệu");
    } finally {
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
        initial.current = false;
      }
    }
  }, [path, enabled]);

  useEffect(() => {
    mounted.current = true;
    load();
    if (!refreshInterval) return () => { mounted.current = false; };
    const timer = setInterval(load, refreshInterval);
    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, [load, refreshInterval]);

  return { data, error, loading, refreshing, refetch: load, setData };
};

export const useDebounced = <T = string>(value: T, delay = 350): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

export const buildQuery = (params: Record<string, string | number | boolean | undefined | null>) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  const result = query.toString();
  return result ? `?${result}` : "";
};
