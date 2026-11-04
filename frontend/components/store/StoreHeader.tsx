"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, HeartPulse, LayoutDashboard, LogOut, Menu, ShoppingBag, ShoppingCart, UserRound, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { clearStoreSession, getStoreCustomer, useCartCount, type StoreCustomer } from "@/lib/store";

const links = [
  { href: "/store", label: "Cửa hàng" },
  { href: "/store/orders", label: "Đơn hàng" },
  { href: "/store/account", label: "Tài khoản" },
];

export function StoreHeader() {
  const pathname = usePathname();
  const count = useCartCount();
  const [customer, setCustomer] = useState<StoreCustomer | null>(null);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const sync = () => setCustomer(getStoreCustomer());
    sync();
    window.addEventListener("mg-store-auth-changed", sync);
    return () => window.removeEventListener("mg-store-auth-changed", sync);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-surface-950/80 backdrop-blur-2xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/store" className="group flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-cyan-500 shadow-[0_8px_30px_-8px_rgba(59,130,246,0.8)]">
            <HeartPulse className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <p className="font-display text-sm font-semibold text-white">Medicare <span className="text-brand-300">Store</span></p>
            <p className="text-[9px] uppercase tracking-[0.22em] text-slate-600">Thiết bị y tế chính hãng</p>
          </div>
        </Link>

        <nav className="ml-6 hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm transition",
                pathname === link.href ? "bg-white/[0.07] text-white" : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/dashboard" className="hidden items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400 transition hover:border-brand-400/30 hover:text-brand-200 sm:flex">
            <LayoutDashboard className="h-3.5 w-3.5" /> SOC
          </Link>
          <Link href="/store/cart" className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-300 transition hover:border-brand-400/30 hover:text-white">
            <ShoppingCart className="h-4 w-4" />
            {count > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[9px] font-bold text-white">{count}</span>
            )}
          </Link>
          {customer ? (
            <div className="relative">
              <button onClick={() => setMenu((value) => !value)} className="flex items-center gap-2 rounded-xl border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-brand-400/30">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500/20 text-[10px] font-semibold text-brand-200">{customer.fullName.slice(0, 1)}</span>
                <span className="hidden max-w-24 truncate sm:block">{customer.fullName}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              {menu && (
                <div className="absolute right-0 top-11 w-52 overflow-hidden rounded-xl border border-white/10 bg-surface-850/95 shadow-2xl backdrop-blur-xl">
                  <div className="border-b border-white/[0.06] px-3 py-2.5">
                    <p className="truncate text-xs font-medium text-white">{customer.fullName}</p>
                    <p className="truncate text-[10px] text-slate-500">{customer.email}</p>
                  </div>
                  <Link href="/store/account" onClick={() => setMenu(false)} className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.05]"><UserRound className="h-3.5 w-3.5" /> Tài khoản</Link>
                  <Link href="/store/orders" onClick={() => setMenu(false)} className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.05]"><ShoppingBag className="h-3.5 w-3.5" /> Đơn hàng</Link>
                  <button onClick={() => { clearStoreSession(); setMenu(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-300 hover:bg-red-500/10"><LogOut className="h-3.5 w-3.5" /> Đăng xuất</button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/store/account" className="hidden items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-500 px-3.5 py-2 text-xs font-medium text-white sm:flex">
              <UserRound className="h-3.5 w-3.5" /> Đăng nhập
            </Link>
          )}
          <button onClick={() => setOpen((value) => !value)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-300 md:hidden">
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-white/[0.06] px-4 py-3 md:hidden">
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-white/[0.05]">{link.label}</Link>
          ))}
          <Link href="/dashboard" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm text-brand-300">Mở SOC</Link>
        </div>
      )}
    </header>
  );
}

export function StoreFooter() {
  return (
    <footer className="mt-16 border-t border-white/[0.06] bg-surface-950/60">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 text-white"><HeartPulse className="h-4 w-4 text-brand-300" /><span className="font-display text-sm font-semibold">Medicare Store</span></div>
          <p className="mt-3 max-w-md text-xs leading-relaxed text-slate-500">Cửa hàng thiết bị y tế và chăm sóc sức khỏe thuộc hệ sinh thái MedicareGuard. Mọi giao dịch được bảo vệ bởi SOC, phát hiện gian lận theo thời gian thực và tự động hóa n8n.</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Mua sắm</p>
          <div className="mt-3 space-y-2 text-xs text-slate-400">
            <Link href="/store" className="block hover:text-brand-300">Tất cả sản phẩm</Link>
            <Link href="/store/cart" className="block hover:text-brand-300">Giỏ hàng</Link>
            <Link href="/store/orders" className="block hover:text-brand-300">Tra cứu đơn hàng</Link>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">An toàn</p>
          <div className="mt-3 space-y-2 text-xs text-slate-400">
            <span className="block">Thanh toán mô phỏng</span>
            <span className="block">Giám sát gian lận 24/7</span>
            <span className="block">Dữ liệu y tế được bảo vệ</span>
          </div>
        </div>
      </div>
      <div className="border-t border-white/[0.04] py-4 text-center text-[10px] text-slate-600">© 2026 MedicareGuard. Bản demo phục vụ học tập.</div>
    </footer>
  );
}
