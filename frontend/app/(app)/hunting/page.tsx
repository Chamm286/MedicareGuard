"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Binoculars,
  Crosshair,
  Fingerprint,
  Flame,
  Loader2,
  Radar,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
} from "lucide-react";
import { api, useApi } from "@/lib/api";
import { canWrite, normalizeRole, ROLE_META } from "@/lib/access";
import { getUser } from "@/lib/auth";
import { useToast } from "@/components/toast";
import { cn, relativeTime, titleCase } from "@/lib/utils";

const HYPOTHESES = [
  { title: "Ransomware đang mã hóa hồ sơ bệnh án", signal: "EDR · PDF mass-write", tactic: "TA0040 Impact", tone: "border-red-400/20 bg-red-500/[0.06]", icon: Flame },
  { title: "Phiên đăng nhập bất thường vào cổng bệnh nhân", signal: "Identity · impossible travel", tactic: "TA0001 Initial Access", tone: "border-amber-400/20 bg-amber-500/[0.06]", icon: Fingerprint },
  { title: "Máy chủ EHR gửi dữ liệu tới C2 lạ", signal: "DLP · outbound volume", tactic: "TA0010 Exfiltration", tone: "border-cyan-400/20 bg-cyan-500/[0.06]", icon: Radar },
];

const severityTone: Record<string, string> = {
  critical: "border-critical/25 bg-critical/10 text-critical",
  high: "border-orange-400/25 bg-orange-500/10 text-orange-300",
  medium: "border-medium/25 bg-medium/10 text-medium",
  low: "border-low/25 bg-low/10 text-low",
};

export default function HuntingPage() {
  const user = getUser();
  const role = normalizeRole(user?.role);
  const meta = ROLE_META[role];
  const writable = canWrite(user);
  const { success, error: toastError } = useToast();
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const alerts = useApi<any>("/alerts?limit=8&sort=detected_at&order=desc", { refreshInterval: 30000 });
  const threats = useApi<any>("/threats?limit=6&sort=risk_score&order=desc", { refreshInterval: 45000 });
  const intel = useApi<any>("/threat-intel?limit=6&sort=confidence&order=desc", { refreshInterval: 60000 });
  const assets = useApi<any>("/assets?limit=5&sort=risk_score&order=desc", { refreshInterval: 60000 });

  const signals = useMemo(() => {
    const rows = [...(alerts.data?.data || []), ...(threats.data?.data || [])];
    const needle = query.trim().toLowerCase();
    return needle ? rows.filter((row) => JSON.stringify(row).toLowerCase().includes(needle)) : rows;
  }, [alerts.data, threats.data, query]);

  const saveHypothesis = async (title: string, tactic: string) => {
    if (!writable) return;
    setSaving(true);
    try {
      await api("/cases", {
        method: "POST",
        body: {
          title: `[Hunter] ${title}`,
          status: "open",
          severity: "high",
          summary: `Giả thuyết săn tìm mối đe dọa (${tactic}). Tạo bởi ${user?.fullName || "threat hunter"}.`,
          metadata: { source: "hunting-workspace", tactic, createdAt: new Date().toISOString() },
        },
      });
      success("Đã lưu giả thuyết", "Hồ sơ điều tra mới đã được tạo trong hàng đợi SOC.");
    } catch (err) {
      toastError("Không thể lưu giả thuyết", err instanceof Error ? err.message : "Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-cyan-500/[0.08] via-surface-900 to-surface-950 p-6 sm:p-7">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]", meta.tone)}>
              <Binoculars className="h-3 w-3" /> {meta.label} · Workspace chuyên biệt
            </div>
            <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">Săn tìm mối đe dọa có giả thuyết</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">{meta.description} Tương quan cảnh báo, IOC và tài sản rủi ro cao để tìm tín hiệu mà hàng đợi triage có thể bỏ sót.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Tín hiệu", value: signals.length, icon: Activity },
              { label: "IOC", value: intel.data?.data?.length ?? "—", icon: Fingerprint },
              { label: "Tài sản", value: assets.data?.data?.length ?? "—", icon: Crosshair },
            ].map((item) => (
              <div key={item.label} className="min-w-[84px] rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-3">
                <item.icon className="mx-auto h-4 w-4 text-cyan-300" />
                <p className="mt-1.5 font-display text-xl font-semibold text-white">{item.value}</p>
                <p className="text-[9px] uppercase tracking-[0.14em] text-slate-600">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {HYPOTHESES.map((item) => (
          <div key={item.title} className={cn("rounded-2xl border p-4", item.tone)}>
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white"><item.icon className="h-4 w-4" /></span>
              <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 font-mono text-[9px] text-slate-400">{item.tactic}</span>
            </div>
            <p className="mt-3 text-sm font-semibold leading-snug text-white">{item.title}</p>
            <p className="mt-1 text-[10px] text-slate-500">{item.signal}</p>
            <button
              onClick={() => saveHypothesis(item.title, item.tactic)}
              disabled={!writable || saving}
              className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-semibold text-cyan-300 transition hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Lưu thành hồ sơ điều tra
            </button>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="panel overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Target className="h-4 w-4 text-cyan-300" /> Bảng tín hiệu săn tìm</h2>
              <p className="mt-0.5 text-[11px] text-slate-500">Cảnh báo mới nhất và mối đe dọa có điểm rủi ro cao.</p>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-600" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Lọc IP, tiêu đề, tác nhân…" className="input h-9 w-56 pl-9 text-xs" />
            </div>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {(alerts.loading || threats.loading) && <div className="px-5 py-12 text-center text-xs text-slate-500"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></div>}
            {!alerts.loading && !threats.loading && signals.length === 0 && <p className="px-5 py-12 text-center text-xs text-slate-600">Không có tín hiệu phù hợp bộ lọc.</p>}
            {signals.map((row: any) => (
              <div key={`${row.id}-${row.title || row.name}`} className="flex items-start gap-3 px-5 py-3.5 transition hover:bg-white/[0.025]">
                <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", severityTone[row.severity] || "border-white/10 bg-white/[0.03] text-slate-400")}>
                  {row.title ? <ShieldAlert className="h-4 w-4" /> : <Radar className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-200">{row.title || row.name}</p>
                  <p className="mt-0.5 truncate text-[10px] text-slate-600">
                    {row.source_ip || row.ioc_value || row.source || "nội bộ"} · {relativeTime(row.detected_at || row.last_seen || row.created_at)} · {row.country || "Việt Nam"}
                  </p>
                </div>
                <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold", severityTone[row.severity] || "border-white/10 bg-white/[0.03] text-slate-400")}>
                  {titleCase(row.severity)}
                </span>
                <span className="hidden shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[9px] text-slate-400 sm:inline">{row.risk_score ?? row.confidence ?? "—"}/100</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Fingerprint className="h-4 w-4 text-cyan-300" /> IOC ưu tiên</h2>
              <Link href="/threat-intel" className="text-[10px] text-slate-500 hover:text-cyan-300">Xem tất cả</Link>
            </div>
            <div className="mt-4 space-y-2.5">
              {(intel.data?.data || []).slice(0, 5).map((row: any) => (
                <div key={row.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-slate-500">{row.indicator_type}</span>
                    <span className="text-[9px] font-semibold text-cyan-300">{row.confidence}%</span>
                  </div>
                  <p className="mt-1.5 truncate font-mono text-[11px] text-slate-300">{row.indicator}</p>
                  <p className="mt-0.5 truncate text-[9px] text-slate-600">{row.threat_actor || "Chưa quy kết"} · {row.country || "Toàn cầu"}</p>
                </div>
              ))}
              {!intel.loading && !(intel.data?.data || []).length && <p className="py-6 text-center text-[11px] text-slate-600">Chưa có IOC.</p>}
            </div>
          </div>

          <div className="panel p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Crosshair className="h-4 w-4 text-cyan-300" /> Tài sản rủi ro cao</h2>
            <div className="mt-4 space-y-2">
              {(assets.data?.data || []).slice(0, 5).map((asset: any) => (
                <Link key={asset.id} href={`/assets/${asset.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.05] px-3 py-2 transition hover:border-cyan-400/20 hover:bg-white/[0.03]">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium text-slate-200">{asset.name}</p>
                    <p className="truncate text-[9px] text-slate-600">{asset.hostname || asset.ip_address}</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-semibold text-orange-300">{asset.risk_score}/100</span>
                </Link>
              ))}
            </div>
            <Link href="/assets" className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-300">Mở kiểm kê tài sản <ArrowRight className="h-3 w-3" /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
