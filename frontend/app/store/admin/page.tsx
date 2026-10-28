"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertTriangle, ArrowUpRight, Boxes, CreditCard, Loader2, RefreshCw, ShieldAlert, ShoppingBag, Users } from "lucide-react";
import { api, useApi } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";
import { formatStoreDate, formatVnd, orderStatusLabel } from "@/lib/store";

type Stats = {
  products: number;
  orders: number;
  openOrders: number;
  customers: number;
  revenue: number;
  paidOrders: number;
  topProducts: Array<{ sku: string; name: string; quantity: number; revenue: number }>;
  recentOrders: Array<{ id: string; order_number: string; shipping_name: string; total: number; status: string; payment_status: string; risk_score: number; ip_address: string; created_at: string }>;
  fraudEvents: Array<{ id: string; event_type: string; severity: string; ip_address: string; country: string; risk_score: number; created_at: string }>;
};

type Order = { id: string; order_number: string; shipping_name: string; shipping_email: string; total: number; status: string; payment_status: string; risk_score: number; ip_address: string; ip_country: string; created_at: string };

export default function StoreAdminPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const stats = useApi<{ data: Stats }>("/store/admin/stats", { refreshInterval: 15000, enabled: ready });
  const orders = useApi<{ data: Order[] }>("/store/admin/orders?limit=25", { refreshInterval: 15000, enabled: ready });

  useEffect(() => {
    if (!getToken()) router.replace("/login");
    else setReady(true);
  }, [router]);

  const updateStatus = async (order: Order, status: string) => {
    setBusy(order.id);
    try {
      await api(`/store/admin/orders/${order.id}`, { method: "PATCH", body: { status, paymentStatus: status === "delivered" ? "paid" : undefined } });
      success("Đã cập nhật đơn hàng", `${order.order_number} → ${orderStatusLabel[status] || status}`);
      stats.refetch();
      orders.refetch();
    } catch (err) {
      toastError("Không thể cập nhật", err instanceof Error ? err.message : "Vui lòng thử lại.");
    } finally {
      setBusy(null);
    }
  };

  if (!ready) return <div className="mx-auto max-w-7xl px-4 py-12"><div className="skeleton h-96 rounded-2xl" /></div>;

  const data = stats.data?.data;
  const cards = [
    { label: "Doanh thu đã thanh toán", value: formatVnd(data?.revenue), icon: CreditCard, tone: "text-low" },
    { label: "Đơn hàng", value: data?.orders ?? "—", icon: ShoppingBag, tone: "text-brand-300" },
    { label: "Đơn cần xử lý", value: data?.openOrders ?? "—", icon: AlertTriangle, tone: "text-high" },
    { label: "Khách hàng", value: data?.customers ?? "—", icon: Users, tone: "text-cyan-300" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Quản trị · SOC</p><h1 className="mt-1 font-display text-2xl font-semibold text-white">Điều hành Medicare Store</h1><p className="mt-1 text-xs text-slate-500">Theo dõi doanh thu, đơn hàng và sự kiện gian lận theo thời gian thực.</p></div>
        <div className="flex gap-2">
          <button onClick={() => { stats.refetch(); orders.refetch(); }} className="btn btn-secondary h-9 px-3 text-xs"><RefreshCw className="h-3.5 w-3.5" /> Làm mới</button>
          <Link href="/dashboard" className="btn btn-primary h-9 px-3 text-xs">Về SOC <ArrowUpRight className="h-3.5 w-3.5" /></Link>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="panel p-4">
            <div className="flex items-start justify-between"><p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{card.label}</p><card.icon className={cn("h-4 w-4", card.tone)} /></div>
            <p className="mt-2 font-display text-2xl font-semibold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.5fr_0.9fr]">
        <div className="panel overflow-hidden p-0">
          <div className="panel-header"><div><h2 className="panel-title">Đơn hàng gần đây</h2><p className="panel-subtitle">Cập nhật trạng thái và thanh toán</p></div></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead><tr className="border-b border-white/[0.06]"><th className="table-th">Đơn</th><th className="table-th">Khách</th><th className="table-th">Tổng</th><th className="table-th">Rủi ro</th><th className="table-th">Trạng thái</th></tr></thead>
              <tbody>
                {(orders.data?.data || []).map((order) => (
                  <tr key={order.id} className="table-row">
                    <td className="table-td"><p className="font-mono text-xs text-white">{order.order_number}</p><p className="mt-0.5 text-[10px] text-slate-600">{formatStoreDate(order.created_at)}</p></td>
                    <td className="table-td"><p className="text-xs text-slate-200">{order.shipping_name}</p><p className="text-[10px] text-slate-600">{order.ip_address} · {order.ip_country}</p></td>
                    <td className="table-td text-xs text-white">{formatVnd(order.total)}</td>
                    <td className="table-td"><span className={cn("chip", order.risk_score >= 70 ? "border-critical/25 bg-critical/10 text-critical" : order.risk_score >= 40 ? "border-high/25 bg-high/10 text-high" : "border-low/25 bg-low/10 text-low")}>{order.risk_score}</span></td>
                    <td className="table-td">
                      <select value={order.status} onChange={(event) => updateStatus(order, event.target.value)} disabled={busy === order.id} className="select h-8 w-36 py-1 text-[11px]">
                        {Object.entries(orderStatusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel p-5">
            <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-white"><ShieldAlert className="h-4 w-4 text-high" /> Sự kiện gian lận</h2>
            <div className="mt-3 space-y-2">
              {(data?.fraudEvents || []).length ? data?.fraudEvents.map((event) => (
                <div key={event.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between gap-2"><p className="text-[11px] font-medium text-slate-200">{event.event_type}</p><span className="chip border-high/20 bg-high/10 text-high">{event.risk_score}</span></div>
                  <p className="mt-1 text-[10px] text-slate-600">{event.ip_address} · {event.country} · {formatStoreDate(event.created_at)}</p>
                </div>
              )) : <p className="text-xs text-slate-600">Chưa có sự kiện gian lận.</p>}
            </div>
          </div>
          <div className="panel p-5">
            <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-white"><Boxes className="h-4 w-4 text-brand-300" /> Bán chạy</h2>
            <div className="mt-3 space-y-2">
              {(data?.topProducts || []).map((product) => (
                <div key={product.sku} className="flex items-center justify-between gap-2 text-[11px]"><span className="min-w-0 truncate text-slate-300">{product.name}</span><span className="shrink-0 text-slate-500">{product.quantity} · {formatVnd(product.revenue)}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {stats.loading && <p className="mt-4 flex items-center gap-2 text-[10px] text-slate-600"><Loader2 className="h-3 w-3 animate-spin" /> Đang đồng bộ dữ liệu...</p>}
    </div>
  );
}
