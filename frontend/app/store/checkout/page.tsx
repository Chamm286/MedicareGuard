"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, CreditCard, Loader2, MapPin, ShieldAlert, ShieldCheck, Truck } from "lucide-react";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";
import { formatVnd, getStoreCustomer, getStoreToken, storeFetch, useStoreCart, type StoreOrder } from "@/lib/store";

type CheckoutResponse = {
  data: {
    order: StoreOrder;
    risk: { riskScore: number; flags: string[] };
    fraud: { alertId: string; dispatch: { dispatched: boolean; status: string } } | null;
    client: { ip: string; country: string; countryCode: string; ipSource: string };
    message: string;
  };
};

const countries = [
  { code: "VN", name: "Việt Nam" },
  { code: "SG", name: "Singapore" },
  { code: "NL", name: "Hà Lan" },
  { code: "US", name: "Hoa Kỳ" },
  { code: "EG", name: "Ai Cập" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, loading } = useStoreCart();
  const { error: toastError } = useToast();
  const customer = getStoreCustomer();
  useEffect(() => {
    if (!getStoreToken()) router.replace("/store/account");
  }, [router]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CheckoutResponse["data"] | null>(null);
  const [form, setForm] = useState({
    name: customer?.fullName || "",
    email: customer?.email || "",
    phone: customer?.phone || "",
    address: customer?.address || "",
    city: customer?.city || "",
    countryCode: customer?.countryCode || "VN",
    notes: "",
    paymentMethod: "cod",
  });

  useEffect(() => {
    if (customer) {
      setForm((current) => ({
        ...current,
        name: current.name || customer.fullName,
        email: current.email || customer.email,
        phone: current.phone || customer.phone || "",
        address: current.address || customer.address || "",
        city: current.city || customer.city || "",
      }));
    }
  }, [customer?.id]);

  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!cart?.items.length) return;
    setSubmitting(true);
    try {
      const country = countries.find((item) => item.code === form.countryCode);
      const response = await storeFetch<CheckoutResponse>("/checkout", {
        method: "POST",
        body: {
          cartToken: cart.token,
          paymentMethod: form.paymentMethod,
          notes: form.notes,
          shipping: { name: form.name, email: form.email, phone: form.phone, address: form.address, city: form.city, country: country?.name || "Việt Nam", countryCode: form.countryCode },
        },
      });
      setResult(response.data);
      window.localStorage.removeItem("mg_store_cart_token");
      window.dispatchEvent(new CustomEvent("mg-cart-changed", { detail: { count: 0 } }));
    } catch (err) {
      toastError("Không thể đặt hàng", err instanceof Error ? err.message : "Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    const order = result.order;
    const held = order.status === "on_hold";
    const risky = result.risk.riskScore >= 60;
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className={cn("panel overflow-hidden p-0", risky ? "border-high/25" : "border-low/25")}>
          <div className={cn("border-b px-6 py-8 text-center", held ? "border-high/15 bg-high/[0.06]" : "border-low/15 bg-low/[0.05]")}>
            <span className={cn("mx-auto flex h-14 w-14 items-center justify-center rounded-2xl", held ? "bg-high/10 text-high" : "bg-low/10 text-low")}>
              {held ? <ShieldAlert className="h-7 w-7" /> : <CheckCircle2 className="h-7 w-7" />}
            </span>
            <h1 className="mt-4 font-display text-2xl font-semibold text-white">{held ? "Đơn hàng đang được kiểm tra" : "Đặt hàng thành công"}</h1>
            <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-slate-400">{result.message}</p>
          </div>
          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Mã đơn hàng</p>
              <p className="mt-1 font-mono text-sm text-white">{order.order_number}</p>
              <p className="mt-3 text-[10px] uppercase tracking-[0.16em] text-slate-500">Tổng thanh toán</p>
              <p className="mt-1 font-display text-xl font-semibold text-white">{formatVnd(order.total)}</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Điểm rủi ro</p>
              <p className={cn("mt-1 font-display text-xl font-semibold", risky ? "text-high" : "text-low")}>{result.risk.riskScore}/100</p>
              <p className="mt-1 text-[10px] text-slate-500">IP {result.client.ip} · {result.client.country} · nguồn {result.client.ipSource}</p>
            </div>
            {risky && (
              <div className="sm:col-span-2 rounded-xl border border-high/20 bg-high/[0.04] p-4">
                <p className="flex items-center gap-2 text-xs font-medium text-high"><AlertTriangle className="h-3.5 w-3.5" /> Tín hiệu gian lận</p>
                <div className="mt-2 flex flex-wrap gap-1.5">{result.risk.flags.map((flag) => <span key={flag} className="chip border-high/20 bg-high/10 text-high">{flag}</span>)}</div>
                {result.fraud && <p className="mt-2 text-[10px] text-slate-500">Cảnh báo SOC đã tạo · n8n: {result.fraud.dispatch.dispatched ? "đã nhận workflow" : result.fraud.dispatch.status}</p>}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 border-t border-white/[0.06] px-6 py-4">
            <Link href={`/store/order/${order.id}?email=${encodeURIComponent(order.shipping_email)}`} className="btn btn-primary h-10 px-4 text-xs">Theo dõi đơn hàng</Link>
            <Link href="/store" className="btn btn-secondary h-10 px-4 text-xs">Tiếp tục mua sắm</Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"><div className="skeleton h-96 rounded-2xl" /></div>;
  }

  if (!cart?.items.length) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-24 text-center">
        <p className="text-sm text-slate-400">Giỏ hàng đang trống, không thể thanh toán.</p>
        <Link href="/store" className="btn btn-primary h-10 px-5 text-xs">Về cửa hàng</Link>
      </div>
    );
  }

  const shipping = cart.subtotal >= 500000 ? 0 : 30000;
  const tax = Math.round(cart.total * 0.08);
  const total = cart.total + shipping + tax;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/store/cart" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-300"><ArrowLeft className="h-3.5 w-3.5" /> Quay lại giỏ hàng</Link>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
        <form onSubmit={submit} className="space-y-4">
          <div className="panel p-5">
            <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-white"><MapPin className="h-4 w-4 text-brand-300" /> Thông tin giao hàng</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div><label className="label">Họ và tên</label><input required value={form.name} onChange={(event) => set("name", event.target.value)} className="input" placeholder="Nguyễn Văn An" /></div>
              <div><label className="label">Email</label><input required type="email" value={form.email} onChange={(event) => set("email", event.target.value)} className="input" placeholder="ban@example.com" /></div>
              <div><label className="label">Số điện thoại</label><input required value={form.phone} onChange={(event) => set("phone", event.target.value)} className="input" placeholder="0901 234 567" /></div>
              <div><label className="label">Tỉnh / Thành phố</label><input required value={form.city} onChange={(event) => set("city", event.target.value)} className="input" placeholder="TP. Hồ Chí Minh" /></div>
              <div className="sm:col-span-2"><label className="label">Địa chỉ</label><input required value={form.address} onChange={(event) => set("address", event.target.value)} className="input" placeholder="Số nhà, đường, phường, quận" /></div>
              <div><label className="label">Quốc gia giao hàng</label><select value={form.countryCode} onChange={(event) => set("countryCode", event.target.value)} className="select">{countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}</select></div>
              <div><label className="label">Ghi chú</label><input value={form.notes} onChange={(event) => set("notes", event.target.value)} className="input" placeholder="Không bắt buộc" /></div>
            </div>
            <p className="mt-3 text-[10px] text-slate-600">Mẹo demo gian lận tại Việt Nam: chọn thanh toán thẻ, đặt từ 20 món và đơn từ 3.000.000 ₫. Hệ thống vẫn tạm giữ đơn nếu tổng hợp các dấu hiệu vượt ngưỡng, không cần IP nước ngoài.</p>
          </div>

          <div className="panel p-5">
            <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-white"><CreditCard className="h-4 w-4 text-cyan-300" /> Phương thức thanh toán</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {[
                { value: "cod", label: "Khi nhận hàng", hint: "Thanh toán COD" },
                { value: "bank_transfer", label: "Chuyển khoản", hint: "Xác nhận thủ công" },
                { value: "card", label: "Thẻ tín dụng", hint: "Mô phỏng an toàn" },
                { value: "sepay", label: "SePay QR", hint: "Thanh toán tự động" },
              ].map((method) => (
                <button type="button" key={method.value} onClick={() => set("paymentMethod", method.value)} className={cn("rounded-xl border p-3 text-left transition", form.paymentMethod === method.value ? "border-brand-400/50 bg-brand-500/10" : "border-white/10 bg-white/[0.02] hover:border-white/20")}>
                  <p className="text-xs font-medium text-white">{method.label}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">{method.hint}</p>
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-cyan-400/15 bg-cyan-500/[0.04] p-3 text-[10px] text-slate-400">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
              Hệ thống ghi nhận IP thực từ Cloudflare, chấm điểm rủi ro và gửi cảnh báo tới SOC + n8n nếu phát hiện bất thường. Không có giao dịch thật nào được thực hiện.
            </div>
          </div>

          <button type="submit" disabled={submitting} className="btn btn-primary h-11 w-full text-sm">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Đặt hàng · {formatVnd(total)}</button>
        </form>

        <aside className="space-y-4">
          <div className="panel p-5">
            <h2 className="font-display text-sm font-semibold text-white">Đơn hàng của bạn</h2>
            <div className="mt-4 space-y-3">
              {cart.items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-900">{item.image_url ? <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" /> : null}</div>
                  <div className="min-w-0 flex-1"><p className="truncate text-xs text-slate-200">{item.name}</p><p className="text-[10px] text-slate-600">{item.quantity} × {formatVnd(item.unit_price)}</p></div>
                  <p className="text-xs text-slate-300">{formatVnd(item.line_total)}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2 border-t border-white/[0.06] pt-4 text-xs">
              <div className="flex justify-between text-slate-400"><span>Tạm tính</span><span>{formatVnd(cart.subtotal)}</span></div>
              <div className="flex justify-between text-slate-400"><span>Giảm giá</span><span className="text-low">-{formatVnd(cart.discount)}</span></div>
              <div className="flex justify-between text-slate-400"><span>Giao hàng</span><span>{shipping ? formatVnd(shipping) : "Miễn phí"}</span></div>
              <div className="flex justify-between text-slate-400"><span>VAT 8%</span><span>{formatVnd(tax)}</span></div>
              <div className="flex justify-between border-t border-white/[0.06] pt-3 text-base font-semibold text-white"><span>Tổng</span><span>{formatVnd(total)}</span></div>
            </div>
          </div>
          <div className="panel flex items-center gap-3 p-4"><Truck className="h-5 w-5 text-brand-300" /><div><p className="text-xs text-slate-200">Giao hàng 2–4 ngày</p><p className="text-[10px] text-slate-500">Miễn phí cho đơn từ 500.000 ₫</p></div></div>
        </aside>
      </div>
    </div>
  );
}
