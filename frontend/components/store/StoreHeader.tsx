"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, HeartPulse, LayoutDashboard, LogOut, Menu, Search, ShoppingBag, ShoppingCart, UserRound, X } from "lucide-react";
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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const sync = () => setCustomer(getStoreCustomer());
    sync();
    window.addEventListener("mg-store-auth-changed", sync);
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => {
      window.removeEventListener("mg-store-auth-changed", sync);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <header className={cn("sticky top-0 z-50 border-b transition-all", scrolled ? "border-slate-200 bg-white/90 shadow-sm backdrop-blur-xl" : "border-transparent bg-white/70 backdrop-blur-lg")}>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/store" className="group flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/25 transition group-hover:scale-105">
            <HeartPulse className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <p className="font-display text-sm font-bold text-slate-900">Medicare <span className="text-blue-600">Store</span></p>
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-400">Thiết bị y tế chính hãng</p>
          </div>
        </Link>

        <nav className="ml-6 hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-xl px-3.5 py-2 text-sm font-medium transition",
                pathname === link.href ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/dashboard" className="hidden items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 transition hover:border-blue-300 hover:text-blue-700 sm:flex">
            <LayoutDashboard className="h-3.5 w-3.5" /> SOC
          </Link>
          <Link href="/store/cart" className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-blue-300 hover:text-blue-700">
            <ShoppingCart className="h-4 w-4" />
            {count > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white shadow-md">{count}</span>
            )}
          </Link>
          {customer ? (
            <div className="relative">
              <button onClick={() => setMenu((value) => !value)} className="flex items-center gap-2 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-blue-300">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">{customer.fullName.slice(0, 1)}</span>
                <span className="hidden max-w-24 truncate sm:block">{customer.fullName}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              {menu && (
                <div className="absolute right-0 top-12 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="truncate text-xs font-semibold text-slate-900">{customer.fullName}</p>
                    <p className="truncate text-[10px] text-slate-500">{customer.email}</p>
                  </div>
                  <Link href="/store/account" onClick={() => setMenu(false)} className="flex items-center gap-2 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50"><UserRound className="h-3.5 w-3.5" /> Tài khoản</Link>
                  <Link href="/store/orders" onClick={() => setMenu(false)} className="flex items-center gap-2 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50"><ShoppingBag className="h-3.5 w-3.5" /> Đơn hàng</Link>
                  <button onClick={() => { clearStoreSession(); setMenu(false); }} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs text-red-600 hover:bg-red-50"><LogOut className="h-3.5 w-3.5" /> Đăng xuất</button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/store/account" className="hidden items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/25 sm:flex">
              <UserRound className="h-3.5 w-3.5" /> Đăng nhập
            </Link>
          )}
          <button onClick={() => setOpen((value) => !value)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 md:hidden">
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-slate-100 bg-white px-4 py-3 md:hidden">
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">{link.label}</Link>
          ))}
          <Link href="/dashboard" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-50">Mở SOC</Link>
        </div>
      )}
    </header>
  );
}

export function StoreFooter() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 text-slate-900"><HeartPulse className="h-5 w-5 text-blue-600" /><span className="font-display text-base font-bold">Medicare Store</span></div>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-500">Cửa hàng thiết bị y tế và chăm sóc sức khỏe thuộc hệ sinh thái MedicareGuard. Mọi giao dịch được bảo vệ bởi SOC, phát hiện gian lận theo thời gian thực và tự động hóa n8n.</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Mua sắm</p>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <Link href="/store" className="block hover:text-blue-700">Tất cả sản phẩm</Link>
            <Link href="/store/cart" className="block hover:text-blue-700">Giỏ hàng</Link>
            <Link href="/store/orders" className="block hover:text-blue-700">Tra cứu đơn hàng</Link>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">An toàn</p>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <span className="block">Thanh toán mô phỏng</span>
            <span className="block">Giám sát gian lận 24/7</span>
            <span className="block">Dữ liệu y tế được bảo vệ</span>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">© 2026 MedicareGuard. Bản demo phục vụ học tập.</div>
    </footer>
  );
}
