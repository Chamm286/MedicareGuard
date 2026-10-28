"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Bug, FileText, HardDrive, Loader2, Search, ShieldAlert, Siren, Users, type LucideIcon } from "lucide-react";
import { api, useDebounced } from "@/lib/api";
import { quickCommands } from "@/lib/nav";
import { cn, titleCase } from "@/lib/utils";

type Result = { id: string; label: string; hint?: string; group: string; href: string; icon: LucideIcon };

const GROUPS: { key: string; label: string; icon: LucideIcon; href: (id: string) => string; primary: (row: any) => string; secondary: (row: any) => string }[] = [
  { key: "alerts", label: "Cảnh báo", icon: ShieldAlert, href: (id) => `/alerts/${id}`, primary: (row) => row.title, secondary: (row) => `${titleCase(row.severity)} · ${titleCase(row.status)}` },
  { key: "threats", label: "Mối đe dọa", icon: AlertTriangle, href: (id) => `/threats/${id}`, primary: (row) => row.name, secondary: (row) => `${titleCase(row.severity)} · ${row.country || "không rõ"}` },
  { key: "assets", label: "Tài sản", icon: HardDrive, href: (id) => `/assets/${id}`, primary: (row) => row.name, secondary: (row) => `${titleCase(row.type)} · ${row.ip_address || "không có IP"}` },
  { key: "incidents", label: "Sự cố", icon: Siren, href: (id) => `/incidents/${id}`, primary: (row) => `${row.incident_key} — ${row.title}`, secondary: (row) => `${titleCase(row.severity)} · ${titleCase(row.status)}` },
  { key: "vulnerabilities", label: "Lỗ hổng", icon: Bug, href: (id) => `/vulnerabilities/${id}`, primary: (row) => row.title, secondary: (row) => `${row.cve_id} · CVSS ${row.cvss_score}` },
  { key: "reports", label: "Báo cáo", icon: FileText, href: (id) => `/reports/${id}`, primary: (row) => row.name, secondary: (row) => `${titleCase(row.type)} · ${titleCase(row.status)}` },
  { key: "users", label: "Người dùng", icon: Users, href: () => `/users`, primary: (row) => row.full_name, secondary: (row) => row.email },
];

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const debounced = useDebounced(query, 260);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 60);
      setQuery("");
      setResults(null);
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    if (!open || debounced.trim().length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    api<{ data: Record<string, any[]> }>(`/search?q=${encodeURIComponent(debounced.trim())}&limit=4`)
      .then((response) => {
        if (!cancelled) setResults(response.data);
      })
      .catch(() => {
        if (!cancelled) setResults(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, open]);

  const items = useMemo<Result[]>(() => {
    if (!results) return [];
    return GROUPS.flatMap((group) =>
      (results[group.key] || []).map((row: any) => ({
        id: `${group.key}-${row.id}`,
        label: group.primary(row) || "Không có tiêu đề",
        hint: group.secondary(row),
        group: group.label,
        href: group.href(row.id),
        icon: group.icon,
      })),
    );
  }, [results]);

  const quickItems = useMemo<Result[]>(
    () => quickCommands.map((command) => ({ id: command.href, label: command.label, group: "Thao tác nhanh", href: command.href, icon: command.icon })),
    [],
  );

  const list = query.trim().length >= 2 ? items : quickItems;

  useEffect(() => {
    setActiveIndex(0);
  }, [list.length, query]);

  const navigate = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, list.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && list[activeIndex]) {
      event.preventDefault();
      navigate(list[activeIndex].href);
    } else if (event.key === "Escape") {
      onOpenChange(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-start justify-center bg-black/70 px-4 pt-[10vh] backdrop-blur-sm" onMouseDown={() => onOpenChange(false)}>
      <div className="panel w-full max-w-2xl animate-in overflow-hidden bg-surface-850/95 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-4">
          <Search className="h-4 w-4 shrink-0 text-slate-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Tìm kiếm cảnh báo, mối đe dọa, tài sản, sự cố, CVE…"
            className="h-14 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-brand-400" />}
          <kbd className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] text-slate-500">ESC</kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-2">
          {!list.length && !loading && (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-slate-400">Không có kết quả cho “{query}”</p>
              <p className="mt-1 text-xs text-slate-600">Hãy thử địa chỉ IP, CVE, tên máy chủ hoặc tiêu đề cảnh báo.</p>
            </div>
          )}
          {list.length > 0 && (
            <>
              <p className="px-3 pb-1 pt-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                {query.trim().length >= 2 ? "Kết quả tìm kiếm" : "Thao tác nhanh"}
              </p>
              {list.map((item, index) => (
                <button
                  key={item.id}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => navigate(item.href)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                    index === activeIndex ? "bg-brand-500/15" : "hover:bg-white/[0.04]",
                  )}
                >
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", index === activeIndex ? "border-brand-400/30 bg-brand-500/10 text-brand-200" : "border-white/[0.06] bg-white/[0.03] text-slate-500")}>
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-slate-200">{item.label}</span>
                    {item.hint && <span className="block truncate text-[10px] capitalize text-slate-600">{item.hint}</span>}
                  </span>
                  <span className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-slate-600">{item.group}</span>
                  <ArrowRight className={cn("h-3.5 w-3.5 shrink-0", index === activeIndex ? "text-brand-300" : "text-slate-700")} />
                </button>
              ))}
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-white/[0.06] bg-surface-900/40 px-4 py-2.5 text-[10px] text-slate-600">
          <div className="flex items-center gap-3">
            <span><kbd className="font-mono text-slate-400">↑↓</kbd> di chuyển</span>
            <span><kbd className="font-mono text-slate-400">↵</kbd> mở</span>
          </div>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-low" /> Tìm kiếm trực tiếp</span>
        </div>
      </div>
    </div>
  );
}
