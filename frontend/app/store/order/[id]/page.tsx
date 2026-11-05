"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Package, ShieldAlert, ShieldCheck, Truck } from "lucide-react";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";
import { formatStoreDate, formatVnd, orderStatusLabel, paymentStatusLabel, paymentMethodLabel, storeFetch, type StoreOrder } from "@/lib/store";

export default function OrderDetailPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const email = searchParams.get("email") || "";
  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { error: toastError } = useToast();

  useEffect(() => {
    if (!id) return;
    const params = email ? `?email=${encodeURIComponent(email)}` : "";
    storeFetch<{ data: StoreOrder }>(`/orders/${id}${params}`)
      .then((response) => setOrder(response.data))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Không thể tải đơn hàng");
        toastError("Không thể tải đơn hàng", err instanceof Error ? err.message : "Vui lòng thử lại.");
      })
      .finally(() => setLoading(false));
  }, [id, email, toastError]);

  if (loading) {
    return <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8"><div className="h-96 animate-pulse rounded-3xl bg-slate-100" /></div>;
  }

  if (error || !order) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-24 text-center">
        <p className="text-sm text-slate-600">{error || "Không tìm thấy đơn hàng."}</p>
        <Link href="/store/orders" className="inline-flex h-10 items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 text-xs font-semibold text-white shadow-lg shadow-blue-500/25">Về danh sách đơn</Link>
      </div>
    );
  }

  const held = order.status === "on_hold";
  const risky = (order.risk_score || 0) >= 50;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/store/orders" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-blue-700"><ArrowLeft className="h-4 w-4" /> Quay lại đơn hàng</Link>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">Chi tiết đơn hàng</p>
          <h1 className="mt-1 font-mono text-2xl font-bold text-slate-900">{order.order_number}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold", held ? "border-amber-200 bg-amber-50 text-amber-700" : order.status === "delivered" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : order.status === "cancelled" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-blue-200 bg-blue-50 text-blue-700")}>{orderStatusLabel[order.status] || order.status}</span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">{paymentStatusLabel[order.payment_status] || order.payment_status}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-display text-base font-bold text-slate-900"><Package className="h-4 w-4 text-blue-600" /> Sản phẩm</h2>
            <div className="mt-4 space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">{item.image_url ? <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" /> : null}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
                    <p className="text-[11px] text-slate-500">{item.sku} · {item.quantity} × {formatVnd(item.unit_price)}</p>
                  </div>
                  <p className="text-sm font-bold text-slate-900">{formatVnd(item.line_total)}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
              <div className="flex justify-between text-slate-600"><span>Tạm tính</span><span className="font-medium">{formatVnd(order.subtotal)}</span></div>
              <div className="flex justify-between text-slate-600"><span>Giảm giá</span><span className="font-semibold text-emerald-600">-{formatVnd(order.discount)}</span></div>
              <div className="flex justify-between text-slate-600"><span>Giao hàng</span><span>{order.shipping_fee ? formatVnd(order.shipping_fee) : <span className="font-semibold text-emerald-600">Miễn phí</span>}</span></div>
              <div className="flex justify-between text-slate-600"><span>VAT</span><span className="font-medium">{formatVnd(order.tax)}</span></div>
              <div className="flex justify-between border-t border-slate-100 pt-3 text-lg font-bold text-slate-900"><span>Tổng</span><span>{formatVnd(order.total)}</span></div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-display text-base font-bold text-slate-900"><Truck className="h-4 w-4 text-blue-600" /> Giao hàng</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p><span className="font-semibold">Người nhận:</span> {order.shipping_name}</p>
              <p><span className="font-semibold">Email:</span> {order.shipping_email}</p>
              <p><span className="font-semibold">Điện thoại:</span> {order.shipping_phone}</p>
              <p><span className="font-semibold">Địa chỉ:</span> {order.shipping_address}, {order.shipping_city}, {order.shipping_country}</p>
              <p><span className="font-semibold">Phương thức:</span> {paymentMethodLabel[order.payment_method] || order.payment_method}</p>
              <p><span className="font-semibold">Ngày đặt:</span> {formatStoreDate(order.created_at)}</p>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className={cn("rounded-3xl border p-5 shadow-sm", risky ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50")}>
            <div className="flex items-center gap-2">
              {risky ? <ShieldAlert className="h-5 w-5 text-amber-600" /> : <ShieldCheck className="h-5 w-5 text-emerald-600" />}
              <h3 className={cn("font-display text-base font-bold", risky ? "text-amber-700" : "text-emerald-700")}>{risky ? "Đang kiểm tra gian lận" : "Đơn hàng an toàn"}</h3>
            </div>
            <p className="mt-2 text-sm text-slate-600">Điểm rủi ro: <span className="font-bold">{order.risk_score}/100</span></p>
            {order.ip_address && <p className="mt-1 text-[11px] text-slate-500">IP {order.ip_address} · {order.ip_country || order.shipping_country}</p>}
            {held && <p className="mt-2 text-[11px] font-medium text-amber-700">Đơn đang bị tạm giữ để SOC kiểm tra trước khi xử lý.</p>}
          </div>

          {order.sepay && (
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-display text-base font-bold text-slate-900">Thanh toán SePay</h3>
              <p className="mt-2 text-sm text-slate-600">{order.sepay.instructions}</p>
              {order.sepay.qrUrl && <img src={order.sepay.qrUrl} alt="QR SePay" className="mt-3 w-full rounded-2xl border border-slate-200" />}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
