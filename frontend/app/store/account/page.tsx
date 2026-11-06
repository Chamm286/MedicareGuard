"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2, LogOut, Mail, MapPin, Phone, ShieldCheck, UserRound } from "lucide-react";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";
import { clearStoreSession, getStoreCustomer, getStoreToken, setStoreSession, storeFetch, type StoreCustomer } from "@/lib/store";

export default function AccountPage() {
  const { success, error: toastError } = useToast();
  const [customer, setCustomer] = useState<StoreCustomer | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", fullName: "", phone: "", address: "", city: "" });

  useEffect(() => {
    const sync = () => setCustomer(getStoreCustomer());
    sync();
    window.addEventListener("mg-store-auth-changed", sync);
    return () => window.removeEventListener("mg-store-auth-changed", sync);
  }, []);

  useEffect(() => {
    if (!getStoreToken()) return;
    storeFetch<{ customer: StoreCustomer }>("/auth/me")
      .then((response) => {
        setStoreSession(getStoreToken() as string, response.customer);
        setCustomer(response.customer);
      })
      .catch(() => clearStoreSession());
  }, []);

  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const response = await storeFetch<{ token: string; customer: StoreCustomer }>("/auth/login", { method: "POST", auth: "none", body: { email: form.email, password: form.password } });
        setStoreSession(response.token, response.customer);
        setCustomer(response.customer);
        success("Đăng nhập thành công", `Chào mừng ${response.customer.fullName}.`);
      } else {
        const response = await storeFetch<{ token: string; customer: StoreCustomer }>("/auth/register", { method: "POST", auth: "none", body: form });
        setStoreSession(response.token, response.customer);
        setCustomer(response.customer);
        success("Tạo tài khoản thành công", "Bạn có thể theo dõi đơn hàng ngay bây giờ.");
      }
    } catch (err) {
      toastError(mode === "login" ? "Đăng nhập thất bại" : "Đăng ký thất bại", err instanceof Error ? err.message : "Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  if (customer) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-cyan-50 px-6 py-8">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 font-display text-xl font-bold text-blue-700">{customer.fullName.slice(0, 1)}</span>
              <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">Tài khoản Medicare Store</p><h1 className="mt-1 font-display text-2xl font-bold text-slate-900">{customer.fullName}</h1><p className="mt-0.5 text-sm text-slate-500">{customer.email}</p></div>
            </div>
          </div>
          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"><Mail className="mt-0.5 h-4 w-4 text-blue-600" /><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Email</p><p className="mt-1 text-sm text-slate-900">{customer.email}</p></div></div>
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"><Phone className="mt-0.5 h-4 w-4 text-blue-600" /><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Điện thoại</p><p className="mt-1 text-sm text-slate-900">{customer.phone || "Chưa cập nhật"}</p></div></div>
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2"><MapPin className="mt-0.5 h-4 w-4 text-blue-600" /><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Địa chỉ</p><p className="mt-1 text-sm text-slate-900">{[customer.address, customer.city, customer.country].filter(Boolean).join(", ") || "Chưa cập nhật"}</p></div></div>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-slate-100 px-6 py-4">
            <Link href="/store/orders" className="inline-flex h-10 items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 text-xs font-semibold text-white shadow-lg shadow-blue-500/25">Đơn hàng của tôi <ArrowRight className="h-3.5 w-3.5" /></Link>
            <Link href="/store" className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700">Tiếp tục mua sắm</Link>
            <button onClick={() => { clearStoreSession(); setCustomer(null); }} className="ml-auto inline-flex h-10 items-center gap-2 rounded-2xl px-4 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"><LogOut className="h-3.5 w-3.5" /> Đăng xuất</button>
          </div>
        </div>
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-cyan-200 bg-cyan-50 p-4"><ShieldCheck className="mt-0.5 h-4 w-4 text-cyan-600" /><p className="text-[11px] leading-relaxed text-slate-600">Tài khoản khách hàng tách biệt với tài khoản SOC. Mọi đơn hàng vẫn được SOC giám sát và bảo vệ tự động.</p></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><UserRound className="h-6 w-6" /></span>
          <h1 className="mt-4 font-display text-xl font-bold text-slate-900">{mode === "login" ? "Đăng nhập cửa hàng" : "Tạo tài khoản mới"}</h1>
          <p className="mt-1 text-sm text-slate-500">Theo dõi đơn hàng và nhận hỗ trợ từ Medicare Store.</p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
          <button onClick={() => setMode("login")} className={cn("rounded-xl py-2 text-sm font-semibold transition", mode === "login" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Đăng nhập</button>
          <button onClick={() => setMode("register")} className={cn("rounded-xl py-2 text-sm font-semibold transition", mode === "register" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Đăng ký</button>
        </div>
        <form onSubmit={submit} className="mt-5 space-y-3">
          {mode === "register" && (
            <>
              <div><label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Họ và tên</label><input required value={form.fullName} onChange={(event) => set("fullName", event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="Nguyễn Văn An" /></div>
              <div className="grid grid-cols-2 gap-3"><div><label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Điện thoại</label><input value={form.phone} onChange={(event) => set("phone", event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="0901..." /></div><div><label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Thành phố</label><input value={form.city} onChange={(event) => set("city", event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="TP. HCM" /></div></div>
              <div><label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Địa chỉ</label><input value={form.address} onChange={(event) => set("address", event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="Số nhà, đường..." /></div>
            </>
          )}
          <div><label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Email</label><input required type="email" value={form.email} onChange={(event) => set("email", event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="ban@example.com" /></div>
          <div><label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Mật khẩu</label><input required type="password" minLength={8} value={form.password} onChange={(event) => set("password", event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="Tối thiểu 8 ký tự" /></div>
          <button type="submit" disabled={loading} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:from-blue-700 hover:to-cyan-600 disabled:cursor-not-allowed disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}</button>
        </form>
        <p className="mt-4 text-center text-[11px] text-slate-500">Tài khoản demo: <span className="font-medium text-slate-700">an.nguyen@example.com</span> / <span className="font-medium text-slate-700">Customer@123</span></p>
      </div>
    </div>
  );
}
