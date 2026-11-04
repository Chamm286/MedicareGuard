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
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-300"><PackageSearch className="h-7 w-7" /></span>
        <div><h1 className="font-display text-xl font-semibold text-white">Đăng nhập để xem đơn hàng</h1><p className="mt-1 text-xs text-slate-500">Bạn cũng có thể tra cứu đơn khách vãng lai bằng mã đơn và email.</p></div>
        <div className="flex gap-2"><Link href="/store/account" className="btn btn-primary h-10 px-5 text-xs">Đăng nhập</Link><Link href="/store" className="btn btn-secondary h-10 px-5 text-xs">Về cửa hàng</Link></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-4">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-300">Tài khoản</p><h1 className="mt-1 font-display text-2xl font-semibold text-white">Đơn hàng của tôi</h1></div>
        <Link href="/store" className="text-xs text-slate-500 hover:text-brand-300">Mua sắm tiếp</Link>
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="skeleton h-24 rounded-2xl" />)}</div>
      ) : error ? (
        <div className="panel mt-6 p-6 text-sm text-red-300">{error}</div>
      ) : !orders.length ? (
        <div className="panel mt-6 flex flex-col items-center gap-3 py-16 text-center"><PackageSearch className="h-9 w-9 text-slate-700" /><p className="text-sm text-slate-400">Bạn chưa có đơn hàng nào.</p><Link href="/store" className="btn btn-primary h-9 px-4 text-xs">Bắt đầu mua sắm</Link></div>
      ) : (
        <div className="mt-6 space-y-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/store/order/${order.id}`} className="panel panel-hover flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono text-sm text-white">{order.order_number}</p>
                  <span className={cn("chip", order.status === "cancelled" ? "border-critical/25 bg-critical/10 text-critical" : order.status === "on_hold" ? "border-high/25 bg-high/10 text-high" : order.status === "delivered" ? "border-low/25 bg-low/10 text-low" : "border-brand-400/25 bg-brand-500/10 text-brand-200")}>{orderStatusLabel[order.status] || order.status}</span>
                  {order.risk_score >= 50 && <span className="chip border-high/25 bg-high/10 text-high"><ShieldAlert className="h-3 w-3" /> Rủi ro {order.risk_score}</span>}
                </div>
                <p className="mt-1.5 text-[10px] text-slate-500">{formatStoreDate(order.created_at)} · {order.shipping_city}, {order.shipping_country}</p>
              </div>
              <div className="flex items-center justify-between gap-4 sm:justify-end">
                <div className="text-right"><p className="text-sm font-semibold text-white">{formatVnd(order.total)}</p><p className="text-[10px] text-slate-500">{paymentStatusLabel[order.payment_status] || order.payment_status}</p></div>
                <ArrowRight className="h-4 w-4 text-slate-600" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
