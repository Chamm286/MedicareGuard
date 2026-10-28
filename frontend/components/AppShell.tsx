"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Bell,
  Bot,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  Command,
  LogOut,
  Menu,
  Radio,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Workflow,
  X,
} from "lucide-react";
import { api, useApi } from "@/lib/api";
import { clearSession, getToken, getUser, setSession, type SessionUser } from "@/lib/auth";
import { navGroups, pageTitles } from "@/lib/nav";
import { cn, firstName, relativeTime, titleCase } from "@/lib/utils";
import { Avatar, Button } from "./ui";
import { CommandPalette } from "./CommandPalette";
import { ToastProvider, useToast } from "./toast";

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <Link href="/dashboard" className="group flex items-center gap-3 px-4 py-5">
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 via-brand-600 to-cyan-500 shadow-[0_8px_30px_-8px_rgba(59,130,246,0.8)]">
        <Shield className="h-5 w-5 text-white" strokeWidth={2.2} />
        <span className="absolute -inset-1 rounded-2xl border border-brand-400/20" />
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate font-display text-[15px] font-semibold tracking-tight text-white">
            Medicare<span className="text-brand-300">Guard</span>
          </p>
          <p className="text-[8px] font-medium uppercase tracking-[0.28em] text-slate-600">Vận hành an ninh</p>
        </div>
      )}
    </Link>
  );
}

function NavBadge({ badge }: { badge: string }) {
  const styles: Record<string, string> = {
    live: "bg-critical/15 text-critical border-critical/25",
    n8n: "bg-cyan-500/10 text-cyan-300 border-cyan-400/25",
    AI: "bg-violet-500/10 text-violet-300 border-violet-400/25",
  };
  return (
    <span className={cn("rounded border px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.1em]", styles[badge] || "border-white/10 bg-white/5 text-slate-500")}>
      {badge === "live" ? (
        <span className="flex items-center gap-1">
          <span className="relative flex h-1 w-1">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-critical" />
            <span className="relative inline-flex h-1 w-1 rounded-full bg-critical" />
          </span>
          {badge}
        </span>
      ) : (
        badge
      )}
    </span>
  );
}

function NotificationsMenu({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { data, refetch } = useApi<any>("/notifications?limit=8&sort=created_at&order=desc", { refreshInterval: 60000 });
  const { success } = useToast();
  const notifications = data?.data || [];
  const unread = notifications.filter((item: any) => !item.read).length;

  const open = async (item: any) => {
    try {
      if (!item.read) await api(`/notifications/${item.id}`, { method: "PATCH", body: { read: true } });
    } catch {
      // non-blocking
    }
    refetch();
    onClose();
    if (item.link) router.push(item.link);
  };

  const markAll = async () => {
    const unreadItems = notifications.filter((item: any) => !item.read);
    await Promise.allSettled(unreadItems.map((item: any) => api(`/notifications/${item.id}`, { method: "PATCH", body: { read: true } })));
    refetch();
    success("Đã dọn hộp thư", `${unreadItems.length} thông báo đã được đánh dấu đã đọc.`);
  };

  return (
    <div className="absolute right-0 top-11 z-50 w-[360px] overflow-hidden rounded-2xl border border-white/10 bg-surface-850/95 shadow-2xl backdrop-blur-2xl">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white">Thông báo</p>
          {unread > 0 && <span className="rounded-full bg-critical/15 px-1.5 py-0.5 text-[9px] font-semibold text-critical">{unread} mới</span>}
        </div>
        {unread > 0 && (
          <button onClick={markAll} className="flex items-center gap-1 text-[10px] text-slate-500 transition hover:text-brand-300">
            <CheckCheck className="h-3 w-3" /> Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>
      <div className="max-h-[360px] overflow-y-auto">
        {notifications.length === 0 && <p className="px-4 py-10 text-center text-xs text-slate-600">Chưa có thông báo nào.</p>}
        {notifications.map((item: any) => (
          <button key={item.id} onClick={() => open(item)} className="flex w-full gap-3 border-b border-white/[0.03] px-4 py-3 text-left transition last:border-0 hover:bg-white/[0.03]">
            <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border", item.read ? "border-white/[0.06] bg-white/[0.02] text-slate-600" : "border-brand-400/25 bg-brand-500/10 text-brand-300")}>
              <Bell className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn("block truncate text-xs", item.read ? "text-slate-400" : "font-medium text-slate-200")}>{item.title}</span>
              {item.message && <span className="mt-0.5 line-clamp-2 block text-[10px] leading-relaxed text-slate-600">{item.message}</span>}
              <span className="mt-1 block text-[9px] text-slate-700">{relativeTime(item.created_at)} · {titleCase(item.type)}</span>
            </span>
            {!item.read && <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />}
          </button>
        ))}
      </div>
      <Link href="/logs" onClick={onClose} className="flex items-center justify-center gap-1 border-t border-white/[0.06] bg-surface-900/40 py-2.5 text-[10px] text-slate-500 transition hover:text-brand-300">
        Xem nhật ký hoạt động <ChevronLeft className="h-3 w-3 rotate-180" />
      </Link>
    </div>
  );
}

function ShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { success } = useToast();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [clock, setClock] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const health = useApi<{ status: string }>("/health", { refreshInterval: 30000 });
  const notifications = useApi<any>(user ? "/notifications?limit=20&sort=created_at&order=desc" : null, { refreshInterval: 60000 });
  const unread = (notifications.data?.data || []).filter((item: any) => !item.read).length;

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setUser(getUser());
    setChecking(false);
    api<{ data: SessionUser }>("/auth/me")
      .then((response) => {
        setUser(response.data);
        const token = getToken();
        if (token) setSession(token, response.data);
      })
      .catch(() => {});
    const stored = window.localStorage.getItem("mg_sidebar");
    if (stored === "collapsed") setCollapsed(true);
  }, [router]);

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "UTC" }));
    }, 1000);
    setClock(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "UTC" }));
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setNotificationsOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
      if (mod && event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const toggleSidebar = useCallback(() => {
    setCollapsed((value) => {
      const next = !value;
      window.localStorage.setItem("mg_sidebar", next ? "collapsed" : "expanded");
      return next;
    });
  }, []);

  const signOut = async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    clearSession();
    router.replace("/login");
  };

  const current = useMemo(() => {
    const match = Object.keys(pageTitles)
      .filter((key) => pathname === key || pathname.startsWith(`${key}/`))
      .sort((a, b) => b.length - a.length)[0];
    return match ? pageTitles[match] : { title: "MedicareGuard", subtitle: "Trung tâm vận hành an ninh", icon: Shield };
  }, [pathname]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-950">
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-cyan-500">
            <Shield className="h-6 w-6 text-white" />
            <span className="absolute -inset-2 animate-ping rounded-3xl border border-brand-400/30" />
          </div>
          <p className="text-xs text-slate-500">Đang thiết lập phiên bảo mật…</p>
        </div>
      </div>
    );
  }

  const sidebar = (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/[0.06] bg-surface-950/95 backdrop-blur-2xl transition-all duration-300",
        collapsed ? "w-[82px]" : "w-[264px]",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
    >
      <div className="relative">
        <Brand collapsed={collapsed} />
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-7 hidden h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-surface-850 text-slate-500 transition hover:text-white lg:flex"
          aria-label="Thu gọn thanh bên"
        >
          <ChevronLeft className={cn("h-3.5 w-3.5 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-2.5 pb-4 pt-1 scrollbar-thin">
        {navGroups.map((group) => (
          <div key={group.title}>
            {!collapsed && <p className="mb-1.5 px-2.5 text-[8px] font-semibold uppercase tracking-[0.22em] text-slate-700">{group.title}</p>}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] transition-all duration-150",
                      active ? "bg-brand-500/[0.12] text-white" : "text-slate-500 hover:bg-white/[0.035] hover:text-slate-200",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    {active && <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-brand-400 shadow-[0_0_12px_2px_rgba(96,165,250,0.6)]" />}
                    <item.icon className={cn("h-[17px] w-[17px] shrink-0 transition", active ? "text-brand-300" : "text-slate-600 group-hover:text-slate-400")} />
                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                    {!collapsed && item.badge && <NavBadge badge={item.badge} />}
                    {collapsed && item.badge === "live" && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-critical" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-2.5 pb-3">
        {!collapsed ? (
          <div className="rounded-xl border border-white/[0.06] bg-gradient-to-b from-white/[0.035] to-transparent p-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-600">Trạng thái SOC</span>
              <span className="flex items-center gap-1 text-[9px] text-low">
                <span className="h-1.5 w-1.5 rounded-full bg-low" /> Hoạt động
              </span>
            </div>
            <div className="mt-2.5 space-y-1.5">
              <div className="flex items-center gap-2 text-[10px]">
                <Activity className="h-3 w-3 text-brand-400" />
                <span className="flex-1 text-slate-500">API cốt lõi</span>
                <span className={health.data ? "text-emerald-400" : "text-medium"}>{health.data ? "trực tuyến" : "đang kiểm tra"}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <Workflow className="h-3 w-3 text-cyan-400" />
                <span className="flex-1 text-slate-500">Tự động hóa n8n</span>
                <span className="text-emerald-400">đã kết nối</span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <Sparkles className="h-3 w-3 text-violet-400" />
                <span className="flex-1 text-slate-500">Chuyên viên AI</span>
                <span className="text-emerald-400">sẵn sàng</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-low opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-low" />
            </span>
          </div>
        )}
      </div>

      <div className={cn("border-t border-white/[0.06] p-3", collapsed && "px-2")}>
        <Link href="/settings" className={cn("flex items-center gap-2.5 rounded-lg p-1.5 transition hover:bg-white/[0.04]", collapsed && "justify-center")}>
          <Avatar name={user?.fullName} email={user?.email} src={user?.avatarUrl} size="sm" />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium text-slate-200">{user?.fullName || "Chuyên viên"}</p>
              <p className="truncate text-[9px] uppercase tracking-wider text-slate-600">{titleCase(user?.role) || "SOC"}</p>
            </div>
          )}
        </Link>
        {!collapsed && <p className="mt-2 text-center font-mono text-[8px] text-slate-800">v1.0.0 · bản dựng 2026.10</p>}
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-surface-950 text-slate-200">
      {sidebar}
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />}

      <div className={cn("transition-[padding] duration-300", collapsed ? "lg:pl-[82px]" : "lg:pl-[264px]")}>
        <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-surface-950/80 backdrop-blur-2xl">
          <div className="flex h-16 items-center gap-3 px-4 md:px-6">
            <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-slate-400 transition hover:bg-white/[0.05] lg:hidden" aria-label="Mở menu">
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
                <span className="hidden sm:inline">MedicareGuard</span>
                <span className="hidden sm:inline text-slate-800">/</span>
                <span className="truncate text-slate-500">{current.title}</span>
              </div>
              <p className="truncate text-[13px] font-medium text-slate-200 md:hidden">{current.title}</p>
            </div>

            <button
              onClick={() => setCommandOpen(true)}
              className="hidden h-9 w-64 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-left text-xs text-slate-600 transition hover:border-white/[0.12] hover:bg-white/[0.04] md:flex xl:w-80"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="flex-1">Tìm kiếm SOC…</span>
              <kbd className="flex items-center gap-0.5 rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px]">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </button>
            <button onClick={() => setCommandOpen(true)} className="rounded-lg p-2 text-slate-500 transition hover:bg-white/[0.05] md:hidden" aria-label="Tìm kiếm">
              <Search className="h-4.5 w-4.5" />
            </button>

            <div className="hidden items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-[9px] text-slate-500 sm:flex">
              <Radio className="h-3 w-3 text-low" />
              <span className="font-mono">{clock || "00:00:00"} UTC</span>
            </div>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => {
                  setNotificationsOpen((open) => !open);
                  setUserMenuOpen(false);
                }}
                className="relative rounded-lg p-2 text-slate-500 transition hover:bg-white/[0.05] hover:text-white"
                aria-label="Thông báo"
              >
                <Bell className="h-4.5 w-4.5" />
                {unread > 0 && <span className="absolute right-1.5 top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-critical px-0.5 text-[8px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
              </button>
              {notificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                  <NotificationsMenu onClose={() => setNotificationsOpen(false)} />
                </>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  setUserMenuOpen((open) => !open);
                  setNotificationsOpen(false);
                }}
                className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] py-1 pl-1 pr-2 transition hover:bg-white/[0.05]"
              >
                <Avatar name={user?.fullName} email={user?.email} src={user?.avatarUrl} size="xs" />
                <span className="hidden text-left lg:block">
                  <span className="block max-w-[120px] truncate text-[11px] font-medium text-slate-200">{firstName(user?.fullName)}</span>
                  <span className="block text-[8px] uppercase tracking-wider text-slate-600">{titleCase(user?.role)}</span>
                </span>
                <ChevronDown className="hidden h-3 w-3 text-slate-600 lg:block" />
              </button>
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-11 z-50 w-60 overflow-hidden rounded-2xl border border-white/10 bg-surface-850/95 shadow-2xl backdrop-blur-2xl">
                    <div className="border-b border-white/[0.06] px-4 py-3">
                      <p className="truncate text-xs font-medium text-white">{user?.fullName}</p>
                      <p className="truncate text-[10px] text-slate-600">{user?.email}</p>
                      <p className="mt-1.5 inline-flex items-center gap-1 rounded border border-brand-400/20 bg-brand-500/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-brand-300">
                        <ShieldCheck className="h-2.5 w-2.5" /> {titleCase(user?.role)}
                      </p>
                    </div>
                    <div className="p-1.5">
                      <Link href="/settings" className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-slate-400 transition hover:bg-white/[0.04] hover:text-white">
                        <Settings className="h-3.5 w-3.5" /> Hồ sơ &amp; cài đặt
                      </Link>
                      <Link href="/ai" className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-slate-400 transition hover:bg-white/[0.04] hover:text-white">
                        <Bot className="h-3.5 w-3.5" /> Chuyên viên AI
                      </Link>
                      <Link href="/automation" className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-slate-400 transition hover:bg-white/[0.04] hover:text-white">
                        <Workflow className="h-3.5 w-3.5" /> Tự động hóa
                      </Link>
                    </div>
                    <div className="border-t border-white/[0.06] p-1.5">
                      <button onClick={signOut} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-slate-500 transition hover:bg-critical/10 hover:text-critical">
                        <LogOut className="h-3.5 w-3.5" /> Đăng xuất
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-6 lg:py-7">{children}</main>
      </div>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ShellInner>{children}</ShellInner>
    </ToastProvider>
  );
}
