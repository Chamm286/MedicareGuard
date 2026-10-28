"use client";

import { useCallback, useEffect, useState } from "react";
import { API_URL } from "./api";

export const STORE_URL = `${API_URL}/store`;
const CART_TOKEN_KEY = "mg_store_cart_token";
const CUSTOMER_TOKEN_KEY = "mg_store_customer_token";
const CUSTOMER_KEY = "mg_store_customer";

export type StoreReview = {
  id: string;
  rating: number;
  title?: string | null;
  body: string;
  created_at: string;
  customer_name?: string | null;
};

export type StoreProduct = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  category: string;
  brand?: string | null;
  description?: string | null;
  price: number;
  sale_price: number | null;
  effective_price: number;
  stock: number;
  image_url?: string | null;
  rating: number;
  tags?: string[];
  reviews?: StoreReview[];
};

export type CartItem = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  name: string;
  sku: string;
  slug: string;
  image_url?: string | null;
  stock: number;
  category: string;
};

export type Cart = {
  token: string;
  status: string;
  couponCode?: string | null;
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  items: CartItem[];
  itemCount: number;
};

export type StoreCustomer = {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  countryCode?: string | null;
  createdAt?: string;
};

export type StoreOrder = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string;
  subtotal: number;
  discount: number;
  shipping_fee: number;
  tax: number;
  total: number;
  currency: string;
  shipping_name: string;
  shipping_email: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_city: string;
  shipping_country: string;
  shipping_country_code: string;
  risk_score: number;
  fraud_flags: string[];
  ip_address?: string | null;
  ip_country?: string | null;
  ip_country_code?: string | null;
  ip_source?: string | null;
  created_at: string;
  items: Array<{ id: string; name: string; sku: string; quantity: number; unit_price: number; line_total: number; image_url?: string | null }>;
  payments: Array<{ provider: string; status: string; amount: number; transaction_ref?: string | null; created_at: string }>;
};

export class StoreApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

type StoreOptions = Omit<RequestInit, "body"> & { body?: unknown; auth?: "customer" | "none" };

export const getCartToken = () => (typeof window === "undefined" ? null : window.localStorage.getItem(CART_TOKEN_KEY));
export const setCartToken = (token: string) => {
  if (typeof window !== "undefined") window.localStorage.setItem(CART_TOKEN_KEY, token);
};
export const getStoreToken = () => (typeof window === "undefined" ? null : window.localStorage.getItem(CUSTOMER_TOKEN_KEY));
export const getStoreCustomer = (): StoreCustomer | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CUSTOMER_KEY);
    return raw ? (JSON.parse(raw) as StoreCustomer) : null;
  } catch {
    return null;
  }
};
export const setStoreSession = (token: string, customer: StoreCustomer) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
  window.localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer));
  window.dispatchEvent(new Event("mg-store-auth-changed"));
};
export const clearStoreSession = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CUSTOMER_TOKEN_KEY);
  window.localStorage.removeItem(CUSTOMER_KEY);
  window.dispatchEvent(new Event("mg-store-auth-changed"));
};

export const storeFetch = async <T = any>(path: string, options: StoreOptions = {}): Promise<T> => {
  const headers = new Headers(options.headers || {});
  const token = getStoreToken();
  if (options.auth !== "none" && token) headers.set("Authorization", `Bearer ${token}`);
  const cart = getCartToken();
  if (cart) headers.set("x-cart-token", cart);
  let body = options.body as BodyInit | undefined;
  if (options.body !== undefined && !(options.body instanceof FormData) && typeof options.body !== "string") {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }
  const response = await fetch(`${STORE_URL}${path}`, { ...options, headers, body, cache: "no-store" });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    throw new StoreApiError(payload?.error || `Yêu cầu thất bại (${response.status})`, response.status, payload);
  }
  return payload as T;
};

export const notifyCart = (cart: Cart) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mg-cart-changed", { detail: { count: cart.itemCount } }));
  }
};

export const ensureCart = async (): Promise<Cart> => {
  const token = getCartToken();
  const response = await storeFetch<{ data: Cart }>("/cart", { method: "POST", body: { token } });
  setCartToken(response.data.token);
  notifyCart(response.data);
  return response.data;
};

export const formatVnd = (value: number | string | null | undefined) =>
  `${Math.round(Number(value || 0)).toLocaleString("vi-VN")} ₫`;

export const formatStoreDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "—";

export const orderStatusLabel: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  processing: "Đang xử lý",
  shipped: "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
  on_hold: "Tạm giữ kiểm tra",
};

export const paymentStatusLabel: Record<string, string> = {
  unpaid: "Chưa thanh toán",
  pending: "Đang chờ",
  paid: "Đã thanh toán",
  refunded: "Đã hoàn tiền",
  failed: "Thất bại",
};

export const paymentMethodLabel: Record<string, string> = {
  cod: "Thanh toán khi nhận hàng",
  bank_transfer: "Chuyển khoản ngân hàng",
  card: "Thẻ tín dụng (mô phỏng)",
};

export const useStoreCart = () => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await ensureCart();
      setCart(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải giỏ hàng");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<{ count: number }>).detail;
      if (detail) setCart((current) => (current ? { ...current, itemCount: detail.count } : current));
    };
    window.addEventListener("mg-cart-changed", onChange);
    return () => window.removeEventListener("mg-cart-changed", onChange);
  }, [load]);

  const apply = (next: Cart) => {
    setCart(next);
    setCartToken(next.token);
    notifyCart(next);
  };

  const addItem = async (productId: string, quantity = 1) => {
    const data = await ensureCart();
    const response = await storeFetch<{ data: Cart }>(`/cart/${data.token}/items`, { method: "POST", body: { productId, quantity } });
    apply(response.data);
    return response.data;
  };

  const updateItem = async (itemId: string, quantity: number) => {
    const data = await ensureCart();
    const response = await storeFetch<{ data: Cart }>(`/cart/${data.token}/items/${itemId}`, { method: "PATCH", body: { quantity } });
    apply(response.data);
    return response.data;
  };

  const removeItem = async (itemId: string) => {
    const data = await ensureCart();
    const response = await storeFetch<{ data: Cart }>(`/cart/${data.token}/items/${itemId}`, { method: "DELETE" });
    apply(response.data);
    return response.data;
  };

  const applyCoupon = async (code: string) => {
    const data = await ensureCart();
    const response = await storeFetch<{ data: Cart }>(`/cart/${data.token}/coupon`, { method: "POST", body: { code } });
    apply(response.data);
    return response.data;
  };

  return { cart, loading, error, refresh: load, addItem, updateItem, removeItem, applyCoupon };
};

export const useCartCount = () => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let active = true;
    ensureCart()
      .then((cart) => active && setCount(cart.itemCount))
      .catch(() => {});
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<{ count: number }>).detail;
      if (detail) setCount(detail.count);
    };
    window.addEventListener("mg-cart-changed", onChange);
    return () => {
      active = false;
      window.removeEventListener("mg-cart-changed", onChange);
    };
  }, []);
  return count;
};
