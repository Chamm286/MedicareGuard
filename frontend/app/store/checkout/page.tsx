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
    const risky = result.risk.riskScore >= 50;
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className={cn("overflow-hidden rounded-3xl border bg-white shadow-sm", risky ? "border-amber-200" : "border-emerald-200")}>
          <div className={cn("border-b px-6 py-8 text-center", held ? "border-amber-100 bg-amber-50" : "border-emerald-100 bg-emerald-50")}>
            <span className={cn("mx-auto flex h-14 w-14 items-center justify-center rounded-2xl", held ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600")}>
              {held ? <ShieldAlert className="h-7 w-7" /> : <CheckCircle2 className="h-7 w-7" />}
            </span>
            <h1 className="mt-4 font-display text-2xl font-bold text-slate-900">{held ? "Đơn hàng đang được kiểm tra" : "Đặt hàng thành công"}</h1>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-600">{result.message}</p>
          </div>
          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Mã đơn hàng</p>
              <p className="mt-1 font-mono text-sm font-semibold text-slate-900">{order.order_number}</p>
              <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Tổng thanh toán</p>
              <p className="mt-1 font-display text-2xl font-bold text-slate-900">{formatVnd(order.total)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Điểm rủi ro</p>
              <p className={cn("mt-1 font-display text-2xl font-bold", risky ? "text-amber-600" : "text-emerald-600")}>{result.risk.riskScore}/100</p>
              <p className="mt-1 text-[11px] text-slate-500">IP {result.client.ip} · {result.client.country} · nguồn {result.client.ipSource}</p>
            </div>
            {risky && (
              <div className="sm:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-amber-700"><AlertTriangle className="h-4 w-4" /> Tín hiệu gian lận</p>
                <div className="mt-2 flex flex-wrap gap-1.5">{result.risk.flags.map((flag) => <span key={flag} className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-700">{flag}</span>)}</div>
                {result.fraud && <p className="mt-2 text-[11px] text-slate-500">Cảnh báo SOC đã tạo · n8n: {result.fraud.dispatch.dispatched ? "đã nhận workflow" : result.fraud.dispatch.status}</p>}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 border-t border-slate-100 px-6 py-4">
            <Link href={`/store/order/${order.id}?email=${encodeURIComponent(order.shipping_email)}`} className="inline-flex h-10 items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 text-xs font-semibold text-white shadow-lg shadow-blue-500/25">Theo dõi đơn hàng</Link>
            <Link href="/store" className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700">Tiếp tục mua sắm</Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"><div className="h-96 animate-pulse rounded-3xl bg-slate-100" /></div>;
  }

  if (!cart?.items.length) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-24 text-center">
        <p className="text-sm text-slate-600">Giỏ hàng đang trống, không thể thanh toán.</p>
        <Link href="/store" className="inline-flex h-10 items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 text-xs font-semibold text-white shadow-lg shadow-blue-500/25">Về cửa hàng</Link>
      </div>
    );
  }

  const shipping = cart.subtotal >= 500000 ? 0 : 30000;
  const tax = Math.round(cart.total * 0.08);
  const total = cart.total + shipping + tax;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/store/cart" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-blue-700"><ArrowLeft className="h-4 w-4" /> Quay lại giỏ hàng</Link>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
        <form onSubmit={submit} className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-display text-base font-bold text-slate-900"><MapPin className="h-4 w-4 text-blue-600" /> Thông tin giao hàng</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div><label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Họ và tên</label><input required value={form.name} onChange={(event) => set("name", event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="Nguyễn Văn An" /></div>
              <div><label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Email</label><input required type="email" value={form.email} onChange={(event) => set("email", event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="ban@example.com" /></div>
              <div><label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Số điện thoại</label><input required value={form.phone} onChange={(event) => set("phone", event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="0901 234 567" /></div>
              <div><label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Tỉnh / Thành phố</label><input required value={form.city} onChange={(event) => set("city", event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="TP. Hồ Chí Minh" /></div>
              <div className="sm:col-span-2"><label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Địa chỉ</label><input required value={form.address} onChange={(event) => set("address", event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="Số nhà, đường, phường, quận" /></div>
              <div><label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Quốc gia giao hàng</label><select value={form.countryCode} onChange={(event) => set("countryCode", event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100">{countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}</select></div>
              <div><label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Ghi chú</label><input value={form.notes} onChange={(event) => set("notes", event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="Không bắt buộc" /></div>
            </div>
            <p className="mt-3 text-[11px] text-slate-500">Mẹo demo gian lận tại Việt Nam: chọn thanh toán thẻ, đặt từ 20 món và đơn từ 3.000.000 ₫. Hệ thống vẫn tạm giữ đơn nếu tổng hợp các dấu hiệu vượt ngưỡng, không cần IP nước ngoài.</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-display text-base font-bold text-slate-900"><CreditCard className="h-4 w-4 text-cyan-600" /> Phương thức thanh toán</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { value: "cod", label: "Khi nhận hàng", hint: "Thanh toán COD" },
                { value: "bank_transfer", label: "Chuyển khoản", hint: "Xác nhận thủ công" },
                { value: "card", label: "Thẻ tín dụng", hint: "Mô phỏng an toàn" },
                { value: "sepay", label: "SePay QR", hint: "Thanh toán tự động" },
              ].map((method) => (
                <button type="button" key={method.value} onClick={() => set("paymentMethod", method.value)} className={cn("rounded-2xl border p-3 text-left transition", form.paymentMethod === method.value ? "border-blue-500 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-blue-200")}>
                  <p className={cn("text-sm font-semibold", form.paymentMethod === method.value ? "text-blue-700" : "text-slate-900")}>{method.label}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{method.hint}</p>
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-cyan-200 bg-cyan-50 p-3 text-[11px] text-slate-600">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />
              Hệ thống ghi nhận IP thực từ Cloudflare, chấm điểm rủi ro và gửi cảnh báo tới SOC + n8n nếu phát hiện bất thường. Không có giao dịch thật nào được thực hiện.
            </div>
          </div>

          <button type="submit" disabled={submitting} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:from-blue-700 hover:to-cyan-600 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Đặt hàng · {formatVnd(total)}</button>
        </form>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-display text-base font-bold text-slate-900">Đơn hàng của bạn</h2>
            <div className="mt-4 space-y-3">
              {cart.items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100">{item.image_url ? <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" /> : null}</div>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-900">{item.name}</p><p className="text-[11px] text-slate-500">{item.quantity} × {formatVnd(item.unit_price)}</p></div>
                  <p className="text-sm font-semibold text-slate-900">{formatVnd(item.line_total)}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
              <div className="flex justify-between text-slate-600"><span>Tạm tính</span><span className="font-medium">{formatVnd(cart.subtotal)}</span></div>
              <div className="flex justify-between text-slate-600"><span>Giảm giá</span><span className="font-semibold text-emerald-600">-{formatVnd(cart.discount)}</span></div>
              <div className="flex justify-between text-slate-600"><span>Giao hàng</span><span>{shipping ? formatVnd(shipping) : <span className="font-semibold text-emerald-600">Miễn phí</span>}</span></div>
              <div className="flex justify-between text-slate-600"><span>VAT 8%</span><span className="font-medium">{formatVnd(tax)}</span></div>
              <div className="flex justify-between border-t border-slate-100 pt-3 text-lg font-bold text-slate-900"><span>Tổng</span><span>{formatVnd(total)}</span></div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><Truck className="h-5 w-5 text-blue-600" /><div><p className="text-sm font-semibold text-slate-900">Giao hàng 2–4 ngày</p><p className="text-[11px] text-slate-500">Miễn phí cho đơn từ 500.000 ₫</p></div></div>
        </aside>
      </div>
    </div>
  );
}
