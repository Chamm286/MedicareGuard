"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, PackageSearch, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatStoreDate, formatVnd, getStoreCustomer, getStoreToken, orderStatusLabel, paymentStatusLabel, storeFetch, type StoreCustomer } from "@/lib/store";

type OrderSummary = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string;
  total: number;
  shipping_city: string;
  shipping_country: string;
  risk_score: number;
  created_at: string;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [customer, setCustomer] = useState<StoreCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setCustomer(getStoreCustomer());
    sync();
    window.addEventListener("mg-store-auth-changed", sync);
    return () => window.removeEventListener("mg-store-auth-changed", sync);
  }, []);

  useEffect(() => {
    if (!getStoreToken()) {
      setLoading(false);
      return;
    }
    storeFetch<{ data: OrderSummary[] }>("/orders")
      .then((response) => setOrders(response.data))
      .catch((err) => setError(err instanceof Error ? err.message : "Không thể tải đơn hàng"))
      .finally(() => setLoading(false));
  }, []);

  if (!customer && !getStoreToken()) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-24 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-blue-600"><PackageSearch className="h-8 w-8" /></span>
        <div><h1 className="font-display text-2xl font-bold text-slate-900">Đăng nhập để xem đơn hàng</h1><p className="mt-1 text-sm text-slate-500">Bạn cũng có thể tra cứu đơn khách vãng lai bằng mã đơn và email.</p></div>
        <div className="flex gap-2"><Link href="/store/account" className="inline-flex h-10 items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 text-xs font-semibold text-white shadow-lg shadow-blue-500/25">Đăng nhập</Link><Link href="/store" className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700">Về cửa hàng</Link></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">Tài khoản</p><h1 className="mt-1 font-display text-3xl font-bold text-slate-900">Đơn hàng của tôi</h1></div>
        <Link href="/store" className="text-sm font-medium text-slate-500 transition hover:text-blue-700">Mua sắm tiếp →</Link>
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-3xl bg-slate-100" />)}</div>
      ) : error ? (
        <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error}</div>
      ) : !orders.length ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-3xl border border-slate-200 bg-white py-16 text-center shadow-sm"><PackageSearch className="h-9 w-9 text-slate-300" /><p className="text-sm text-slate-500">Bạn chưa có đơn hàng nào.</p><Link href="/store" className="inline-flex h-9 items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 text-xs font-semibold text-white shadow-lg shadow-blue-500/25">Bắt đầu mua sắm</Link></div>
      ) : (
        <div className="mt-6 space-y-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/store/order/${order.id}`} className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono text-sm font-semibold text-slate-900">{order.order_number}</p>
                  <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-semibold", order.status === "cancelled" ? "border-rose-200 bg-rose-50 text-rose-700" : order.status === "on_hold" ? "border-amber-200 bg-amber-50 text-amber-700" : order.status === "delivered" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-blue-200 bg-blue-50 text-blue-700")}>{orderStatusLabel[order.status] || order.status}</span>
                  {order.risk_score >= 50 && <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700"><ShieldAlert className="h-3 w-3" /> Rủi ro {order.risk_score}</span>}
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">{formatStoreDate(order.created_at)} · {order.shipping_city}, {order.shipping_country}</p>
              </div>
              <div className="flex items-center justify-between gap-4 sm:justify-end">
                <div className="text-right"><p className="text-sm font-bold text-slate-900">{formatVnd(order.total)}</p><p className="text-[11px] text-slate-500">{paymentStatusLabel[order.payment_status] || order.payment_status}</p></div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
