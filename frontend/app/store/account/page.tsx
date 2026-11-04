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
        <div className="panel overflow-hidden p-0">
          <div className="border-b border-white/[0.06] bg-gradient-to-r from-brand-500/10 to-cyan-500/5 px-6 py-8">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/20 font-display text-xl font-semibold text-brand-200">{customer.fullName.slice(0, 1)}</span>
              <div><p className="text-[10px] uppercase tracking-[0.18em] text-brand-300">Tài khoản Medicare Store</p><h1 className="mt-1 font-display text-2xl font-semibold text-white">{customer.fullName}</h1><p className="mt-0.5 text-xs text-slate-500">{customer.email}</p></div>
            </div>
          </div>
          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"><Mail className="mt-0.5 h-4 w-4 text-brand-300" /><div><p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Email</p><p className="mt-1 text-xs text-slate-200">{customer.email}</p></div></div>
            <div className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"><Phone className="mt-0.5 h-4 w-4 text-brand-300" /><div><p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Điện thoại</p><p className="mt-1 text-xs text-slate-200">{customer.phone || "Chưa cập nhật"}</p></div></div>
            <div className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 sm:col-span-2"><MapPin className="mt-0.5 h-4 w-4 text-brand-300" /><div><p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Địa chỉ</p><p className="mt-1 text-xs text-slate-200">{[customer.address, customer.city, customer.country].filter(Boolean).join(", ") || "Chưa cập nhật"}</p></div></div>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-white/[0.06] px-6 py-4">
            <Link href="/store/orders" className="btn btn-primary h-10 px-4 text-xs">Đơn hàng của tôi <ArrowRight className="h-3.5 w-3.5" /></Link>
            <Link href="/store" className="btn btn-secondary h-10 px-4 text-xs">Tiếp tục mua sắm</Link>
            <button onClick={() => { clearStoreSession(); setCustomer(null); }} className="btn btn-ghost ml-auto h-10 px-4 text-xs text-red-300"><LogOut className="h-3.5 w-3.5" /> Đăng xuất</button>
          </div>
        </div>
        <div className="panel mt-4 flex items-start gap-3 p-4"><ShieldCheck className="mt-0.5 h-4 w-4 text-cyan-300" /><p className="text-[11px] leading-relaxed text-slate-500">Tài khoản khách hàng tách biệt với tài khoản SOC. Mọi đơn hàng vẫn được SOC giám sát và bảo vệ tự động.</p></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="panel p-6">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300"><UserRound className="h-6 w-6" /></span>
          <h1 className="mt-4 font-display text-xl font-semibold text-white">{mode === "login" ? "Đăng nhập cửa hàng" : "Tạo tài khoản mới"}</h1>
          <p className="mt-1 text-xs text-slate-500">Theo dõi đơn hàng và nhận hỗ trợ từ Medicare Store.</p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
          <button onClick={() => setMode("login")} className={cn("rounded-lg py-2 text-xs transition", mode === "login" ? "bg-white/[0.08] text-white" : "text-slate-500 hover:text-slate-300")}>Đăng nhập</button>
          <button onClick={() => setMode("register")} className={cn("rounded-lg py-2 text-xs transition", mode === "register" ? "bg-white/[0.08] text-white" : "text-slate-500 hover:text-slate-300")}>Đăng ký</button>
        </div>
        <form onSubmit={submit} className="mt-5 space-y-3">
          {mode === "register" && (
            <>
              <div><label className="label">Họ và tên</label><input required value={form.fullName} onChange={(event) => set("fullName", event.target.value)} className="input" placeholder="Nguyễn Văn An" /></div>
              <div className="grid grid-cols-2 gap-3"><div><label className="label">Điện thoại</label><input value={form.phone} onChange={(event) => set("phone", event.target.value)} className="input" placeholder="0901..." /></div><div><label className="label">Thành phố</label><input value={form.city} onChange={(event) => set("city", event.target.value)} className="input" placeholder="TP. HCM" /></div></div>
              <div><label className="label">Địa chỉ</label><input value={form.address} onChange={(event) => set("address", event.target.value)} className="input" placeholder="Số nhà, đường..." /></div>
            </>
          )}
          <div><label className="label">Email</label><input required type="email" value={form.email} onChange={(event) => set("email", event.target.value)} className="input" placeholder="ban@example.com" /></div>
          <div><label className="label">Mật khẩu</label><input required type="password" minLength={8} value={form.password} onChange={(event) => set("password", event.target.value)} className="input" placeholder="Tối thiểu 8 ký tự" /></div>
          <button type="submit" disabled={loading} className="btn btn-primary h-11 w-full text-sm">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}</button>
        </form>
        <p className="mt-4 text-center text-[10px] text-slate-600">Tài khoản demo: <span className="text-slate-400">an.nguyen@example.com</span> / <span className="text-slate-400">Customer@123</span></p>
      </div>
    </div>
  );
}
