"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Circle, Clock3, CreditCard, MapPin, ShieldAlert, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatStoreDate, formatVnd, orderStatusLabel, paymentMethodLabel, paymentStatusLabel, storeFetch, type StoreOrder } from "@/lib/store";

const steps = [
  { key: "pending", label: "Đặt hàng" },
  { key: "confirmed", label: "Xác nhận" },
  { key: "processing", label: "Xử lý" },
  { key: "shipped", label: "Giao hàng" },
  { key: "delivered", label: "Hoàn tất" },
];

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!params?.id) return;
    const query = new URLSearchParams(window.location.search);
    const guestEmail = query.get("email") || "";
    setEmail(guestEmail);
    setLoading(true);
    storeFetch<{ data: StoreOrder }>(`/orders/${params.id}${guestEmail ? `?email=${encodeURIComponent(guestEmail)}` : ""}`)
      .then((response) => setOrder(response.data))
      .catch((err) => setError(err instanceof Error ? err.message : "Không thể tải đơn hàng"))
      .finally(() => setLoading(false));
  }, [params?.id]);

  if (loading) {
    return <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8"><div className="skeleton h-96 rounded-2xl" /></div>;
  }

  if (error || !order) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-24 text-center">
        <p className="text-sm text-slate-400">{error || "Không tìm thấy đơn hàng."}</p>
        <Link href="/store/orders" className="btn btn-secondary h-10 px-5 text-xs"><ArrowLeft className="h-3.5 w-3.5" /> Danh sách đơn hàng</Link>
      </div>
    );
  }

  const activeIndex = order.status === "cancelled" ? -1 : order.status === "on_hold" ? 0 : steps.findIndex((step) => step.key === order.status);
  const risky = order.risk_score >= 60;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/store/orders" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-300"><ArrowLeft className="h-3.5 w-3.5" /> Danh sách đơn hàng</Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-300">Chi tiết đơn hàng</p>
          <h1 className="mt-1 font-mono text-2xl font-semibold text-white">{order.order_number}</h1>
          <p className="mt-1 text-[11px] text-slate-500">Đặt lúc {formatStoreDate(order.created_at)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={cn("chip", order.status === "cancelled" ? "border-critical/25 bg-critical/10 text-critical" : order.status === "on_hold" ? "border-high/25 bg-high/10 text-high" : "border-brand-400/25 bg-brand-500/10 text-brand-200")}>{orderStatusLabel[order.status] || order.status}</span>
          <span className="chip border-white/10 bg-white/[0.03] text-slate-400">{paymentStatusLabel[order.payment_status] || order.payment_status}</span>
        </div>
      </div>

      {order.payment_method === "sepay" && order.payment_status !== "paid" && order.sepay && (
        <div className="panel mt-5 border-brand-400/20 bg-brand-500/[0.04] p-5">
          <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-white"><CreditCard className="h-4 w-4 text-brand-300" /> Thanh toán SePay tự động</h2>
          <div className="mt-4 grid gap-5 md:grid-cols-[1fr_220px]">
            <div className="space-y-2 text-xs text-slate-300">
              <p>{order.sepay.instructions}</p>
              <p>Nội dung chuyển khoản: <span className="font-mono font-semibold text-brand-200">{order.sepay.content}</span></p>
              <p>Số tiền: <span className="font-semibold text-white">{formatVnd(order.sepay.amount)}</span></p>
              {order.sepay.accountNumber ? <p>Tài khoản: <span className="font-mono text-white">{order.sepay.accountNumber}</span> · {order.sepay.bankCode}</p> : null}
              <p className="text-[10px] text-slate-500">Sau khi chuyển khoản, hệ thống tự động xác nhận qua webhook SePay và cập nhật đơn hàng.</p>
            </div>
            {order.sepay.qrUrl ? <img src={order.sepay.qrUrl} alt="Mã QR SePay" className="h-52 w-52 rounded-xl border border-white/10 bg-white p-2" /> : <div className="flex h-52 w-52 items-center justify-center rounded-xl border border-white/10 text-xs text-slate-500">Chưa cấu hình QR</div>}
          </div>
        </div>
      )}

      {order.status === "on_hold" && (
        <div className="panel mt-5 flex items-start gap-3 border-high/20 bg-high/[0.04] p-4"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-high" /><div><p className="text-xs font-medium text-high">Đơn hàng đang được SOC kiểm tra gian lận</p><p className="mt-1 text-[11px] leading-relaxed text-slate-400">Điểm rủi ro {order.risk_score}/100 từ IP {order.ip_address} ({order.ip_country}). Đơn sẽ được xử lý sau khi đội an ninh xác minh.</p>{order.fraud_flags?.length ? <div className="mt-2 flex flex-wrap gap-1.5">{order.fraud_flags.map((flag) => <span key={flag} className="chip border-high/20 bg-high/10 text-high">{flag}</span>)}</div> : null}</div></div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.5fr_0.9fr]">
        <div className="space-y-4">
          <div className="panel p-5">
            <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-white"><Truck className="h-4 w-4 text-brand-300" /> Tiến trình đơn hàng</h2>
            {order.status === "cancelled" ? (
              <p className="mt-4 rounded-lg border border-critical/20 bg-critical/[0.04] p-3 text-xs text-red-300">Đơn hàng đã bị hủy.</p>
            ) : (
              <div className="mt-5 flex items-center">
                {steps.map((step, index) => {
                  const done = index <= activeIndex;
                  return (
                    <div key={step.key} className="flex flex-1 items-center last:flex-none">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className={cn("flex h-7 w-7 items-center justify-center rounded-full border", done ? "border-brand-400/40 bg-brand-500/15 text-brand-200" : "border-white/10 text-slate-700")}>{done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}</span>
                        <span className={cn("text-[9px]", done ? "text-slate-300" : "text-slate-600")}>{step.label}</span>
                      </div>
                      {index < steps.length - 1 && <span className={cn("mx-1 mb-4 h-px flex-1", index < activeIndex ? "bg-brand-400/40" : "bg-white/10")} />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="panel p-5">
            <h2 className="font-display text-sm font-semibold text-white">Sản phẩm ({order.items.length})</h2>
            <div className="mt-4 space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-900">{item.image_url ? <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" /> : null}</div>
                  <div className="min-w-0 flex-1"><p className="truncate text-xs text-slate-200">{item.name}</p><p className="mt-0.5 text-[10px] text-slate-600">SKU {item.sku} · {item.quantity} × {formatVnd(item.unit_price)}</p></div>
                  <p className="text-xs text-slate-300">{formatVnd(item.line_total)}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2 border-t border-white/[0.06] pt-4 text-xs">
              <div className="flex justify-between text-slate-400"><span>Tạm tính</span><span>{formatVnd(order.subtotal)}</span></div>
              <div className="flex justify-between text-slate-400"><span>Giảm giá</span><span className="text-low">-{formatVnd(order.discount)}</span></div>
              <div className="flex justify-between text-slate-400"><span>Giao hàng</span><span>{order.shipping_fee ? formatVnd(order.shipping_fee) : "Miễn phí"}</span></div>
              <div className="flex justify-between text-slate-400"><span>VAT</span><span>{formatVnd(order.tax)}</span></div>
              <div className="flex justify-between border-t border-white/[0.06] pt-3 text-base font-semibold text-white"><span>Tổng</span><span>{formatVnd(order.total)}</span></div>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="panel p-5">
            <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-white"><MapPin className="h-4 w-4 text-brand-300" /> Giao tới</h2>
            <p className="mt-3 text-xs font-medium text-slate-200">{order.shipping_name}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{order.shipping_address}<br />{order.shipping_city}, {order.shipping_country}</p>
            <p className="mt-2 text-[10px] text-slate-600">{order.shipping_phone} · {order.shipping_email}</p>
            <div className="mt-4 border-t border-white/[0.06] pt-3 text-[11px] text-slate-400"><p className="flex justify-between"><span>Thanh toán</span><span className="text-slate-300">{paymentMethodLabel[order.payment_method] || order.payment_method}</span></p><p className="mt-1 flex justify-between"><span>Trạng thái</span><span className="text-slate-300">{paymentStatusLabel[order.payment_status]}</span></p></div>
          </div>
          <div className="panel p-5">
            <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-white"><Clock3 className="h-4 w-4 text-cyan-300" /> Dấu vết bảo mật</h2>
            <div className="mt-3 space-y-2 text-[11px]">
              <p className="flex justify-between"><span className="text-slate-500">Điểm rủi ro</span><span className={risky ? "text-high" : "text-low"}>{order.risk_score}/100</span></p>
              <p className="flex justify-between"><span className="text-slate-500">IP</span><span className="font-mono text-slate-300">{order.ip_address || "—"}</span></p>
              <p className="flex justify-between"><span className="text-slate-500">Quốc gia IP</span><span className="text-slate-300">{order.ip_country || "—"} ({order.ip_country_code || "—"})</span></p>
              <p className="flex justify-between"><span className="text-slate-500">Nguồn IP</span><span className="text-slate-300">{order.ip_source || "—"}</span></p>
              {email && <p className="mt-2 text-[10px] text-slate-600">Tra cứu khách vãng lai bằng email {email}</p>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
