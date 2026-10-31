"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bug,
  CheckCircle2,
  Download,
  Gauge,
  HardDrive,
  Radar,
  RefreshCw,
  ServerCog,
  ShieldAlert,
  Siren,
  Workflow,
} from "lucide-react";
import { api, useApi } from "@/lib/api";
import { useState } from "react";
import { getUser } from "@/lib/auth";
import { normalizeRole, ROLE_META } from "@/lib/access";
import { cn, countryName, formatNumber, relativeTime, riskBar, severityDot, titleCase } from "@/lib/utils";
import { AttackAreaChart, SeverityDonut, SeverityLegend, TopAttackersBar } from "@/components/charts";
import { ThreatMap } from "@/components/ThreatMap";
import { Button, Card, ErrorState, PageHeader, ProgressBar, SeverityBadge, Skeleton, StatCard, StatusBadge } from "@/components/ui";
import { useToast } from "@/components/toast";

const ROLE_ACTIONS: Record<string, { label: string; href: string }[]> = {
  admin: [
    { label: "Quản lý người dùng", href: "/users" },
    { label: "Cài đặt nền tảng", href: "/settings" },
    { label: "Tự động hóa n8n", href: "/automation" },
  ],
  analyst: [
    { label: "Hàng đợi cảnh báo", href: "/alerts" },
    { label: "Ứng phó sự cố", href: "/incidents" },
    { label: "Tự động hóa n8n", href: "/automation" },
  ],
  hunter: [
    { label: "Workspace săn tìm", href: "/hunting" },
    { label: "Tình báo mối đe dọa", href: "/threat-intel" },
    { label: "Tài sản rủi ro cao", href: "/assets" },
  ],
  viewer: [
    { label: "Báo cáo an ninh", href: "/reports" },
    { label: "Cảnh báo đang mở", href: "/alerts" },
    { label: "Chuyên viên AI", href: "/ai" },
  ],
};

function RoleWorkspaceBanner({ role }: { role: string }) {
  const meta = ROLE_META[normalizeRole(role)];
  const actions = ROLE_ACTIONS[normalizeRole(role)] || [];
  return (
    <div className="mb-4 flex flex-col justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 sm:flex-row sm:items-center">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-brand-300"><ShieldAlert className="h-4 w-4" /></span>
        <div>
          <p className="text-xs font-medium text-slate-200">Workspace {meta.label}</p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-slate-600">{meta.description}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {actions.map((action) => (
          <Link key={action.href} href={action.href} className="inline-flex items-center gap-1 rounded-lg border border-white/[0.07] bg-white/[0.025] px-2.5 py-1.5 text-[10px] text-slate-400 transition hover:border-brand-400/25 hover:text-brand-200">
            {action.label} <ArrowRight className="h-3 w-3" />
          </Link>
        ))}
        {normalizeRole(role) === "viewer" && <span className="rounded-full border border-medium/25 bg-medium/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-medium">Chỉ đọc</span>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const user = getUser();
  const role = normalizeRole(user?.role);
  const { data, loading, error, refetch, refreshing } = useApi<any>("/dashboard/summary", { refreshInterval: 30000 });
  const runtime = useApi<any>("/automation/runtime", { refreshInterval: 30000 });
  const { success, error: toastError } = useToast();
  const [simulating, setSimulating] = useState(false);

  const simulateAttack = async () => {
    setSimulating(true);
    try {
      const response = await api<any>("/demo/attack", { method: "POST", body: { scenario: "ransomware", patientId: "BN-2401" } });
      success("Đã mô phỏng tấn công", `Alert ${response.data?.alert?.id || ""} đã được tạo và gửi tới n8n.`);
      refetch();
    } catch (err) {
      toastError("Mô phỏng thất bại", err instanceof Error ? err.message : "Không thể gọi API demo.");
    } finally {
      setSimulating(false);
    }
  };
  const summary = data?.data;
  const overview = summary?.overview;

  const timelineSpark = (summary?.timeline || []).slice(-18).map((item: any) => Number(item.total || 0));
  const criticalSpark = (summary?.timeline || []).slice(-18).map((item: any) => Number(item.critical_high || 0));
  const complianceAverage = summary?.compliance?.length
    ? Math.round(summary.compliance.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / summary.compliance.length)
    : 0;
  const firewallHits = (summary?.firewall || []).reduce((sum: number, item: any) => sum + Number(item.hits || 0), 0);

  return (
    <div>
      <PageHeader
        title="Trung tâm chỉ huy"
        subtitle="Phát hiện trực tiếp, phản hồi và đo lường phơi nhiễm từ xa trên nền tảng Medicare"
        icon={Gauge}
        badge={
          <span className="flex items-center gap-1.5 rounded-full border border-low/25 bg-low/[0.07] px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-emerald-300">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-low opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-low" />
            </span>
            trực tiếp
          </span>
        }
        actions={
          <>
            <span className="hidden items-center gap-1.5 text-[10px] text-slate-600 md:flex">
              <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
              {summary?.generatedAt ? relativeTime(summary.generatedAt) : "đang đồng bộ"}
            </span>
            <Button icon={RefreshCw} onClick={() => refetch()} loading={refreshing}>Làm mới</Button>
            {role !== "viewer" && (
              <Button variant="danger" icon={Siren} onClick={simulateAttack} loading={simulating}>Mô phỏng Tấn công</Button>
            )}
            <Link href="/reports">
              <Button variant="primary" icon={Download}>Xuất tóm tắt</Button>
            </Link>
          </>
        }
      />

      <RoleWorkspaceBanner role={role} />

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs">
        <span className="font-medium text-slate-200">n8n Runtime</span>
        <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", runtime.data?.data?.online ? "border-low/25 bg-low/10 text-low" : "border-critical/25 bg-critical/10 text-critical")}>
          {runtime.data?.data?.online ? "Online" : "Offline"}
        </span>
        <span className="text-slate-500">Latency: {runtime.data?.data?.latencyMs ?? "—"} ms</span>
      </div>

      {loading && !summary ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-[118px] rounded-xl" />)}
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            <Skeleton className="h-[330px] rounded-xl xl:col-span-2" />
            <Skeleton className="h-[330px] rounded-xl" />
          </div>
          <Skeleton className="h-[430px] rounded-xl" />
        </div>
      ) : error && !summary ? (
        <Card><ErrorState message={error} onRetry={refetch} /></Card>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <StatCard
              label="Cảnh báo đang mở"
              value={formatNumber(overview?.open_alerts)}
              delta={`${overview?.alert_change_percent > 0 ? "+" : ""}${overview?.alert_change_percent}% so với 24 giờ trước`}
              hint={`${overview?.alerts_24h} phát hiện trong 24 giờ qua`}
              icon={ShieldAlert}
              tone="warning"
              spark={timelineSpark}
            />
            <StatCard
              label="Cảnh báo nghiêm trọng"
              value={formatNumber(overview?.critical_alerts)}
              hint="Yêu cầu phân loại ngay lập tức"
              icon={Activity}
              tone="critical"
              spark={criticalSpark}
            />
            <StatCard
              label="Mối đe dọa đang hoạt động"
              value={formatNumber(overview?.active_threats)}
              hint={`${overview?.threats_24h} quan sát trong 24 giờ qua`}
              icon={Radar}
              tone="cyan"
              spark={criticalSpark.map((value: number) => value + 3)}
            />
            <StatCard
              label="Sự cố đang mở"
              value={formatNumber(overview?.open_incidents)}
              hint="Trên tất cả các hàng đợi phản hồi"
              icon={Siren}
              tone="brand"
            />
            <StatCard
              label="Tài sản rủi ro cao"
              value={formatNumber(overview?.high_risk_assets)}
              hint={`${overview?.total_assets} tài sản đã kiểm kê`}
              icon={HardDrive}
              tone="success"
              spark={timelineSpark.map((value: number) => value + 1)}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="p-4 xl:col-span-2">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-display text-sm font-semibold text-slate-200">Khối lượng phát hiện</h2>
                  <p className="mt-0.5 text-[11px] text-slate-600">Phát hiện cảnh báo theo giờ trong 7 ngày qua</p>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-brand-400" /> Tất cả cảnh báo</span>
                  <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-critical" /> Nghiêm trọng / cao</span>
                </div>
              </div>
              <AttackAreaChart data={summary?.timeline || []} height={268} />
            </Card>

            <Card className="p-4">
              <div className="mb-1 flex items-start justify-between">
                <div>
                  <h2 className="font-display text-sm font-semibold text-slate-200">Phân bố mức độ nghiêm trọng</h2>
                  <p className="mt-0.5 text-[11px] text-slate-600">Tổng phân bố cảnh báo</p>
                </div>
                <Link href="/alerts" className="flex items-center gap-1 text-[10px] text-slate-500 transition hover:text-brand-300">
                  Phân loại <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              <SeverityDonut data={summary?.severity || []} height={176} />
              <div className="mt-1">
                <SeverityLegend data={summary?.severity || []} />
              </div>
              <div className="mt-3 flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2">
                <span className="text-[10px] text-slate-600">Thời gian xác nhận trung bình</span>
                <span className="font-mono text-[11px] text-slate-300">4m 12s</span>
              </div>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="overflow-hidden xl:col-span-2">
              <ThreatMap data={summary?.countries || []} className="border-0" />
            </Card>
            <Card className="p-4">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <h2 className="font-display text-sm font-semibold text-slate-200">Các nguồn tấn công hàng đầu</h2>
                  <p className="mt-0.5 text-[11px] text-slate-600">Được nhóm theo IP nguồn</p>
                </div>
                <Link href="/threats" className="flex items-center gap-1 text-[10px] text-slate-500 transition hover:text-brand-300">
                  Tình báo <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              <TopAttackersBar data={summary?.attackers || []} height={272} />
              <div className="mt-2 space-y-1.5">
                {summary?.categories?.slice(0, 3).map((item: any) => (
                  <div key={item.category} className="flex items-center gap-2 text-[10px]">
                    <span className="h-1 w-1 rounded-full bg-brand-400" />
                    <span className="flex-1 truncate text-slate-500">{item.category}</span>
                    <span className="text-slate-400">{item.total}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3">
                <div>
                  <h2 className="font-display text-sm font-semibold text-slate-200">Phát hiện gần đây</h2>
                  <p className="mt-0.5 text-[11px] text-slate-600">Cảnh báo mới nhất trên mọi cảm biến</p>
                </div>
                <Link href="/alerts" className="flex items-center gap-1 text-[10px] text-slate-500 transition hover:text-brand-300">
                  Xem hàng đợi <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="divide-y divide-white/[0.03]">
                {(summary?.recentAlerts || []).map((alert: any) => (
                  <Link key={alert.id} href={`/alerts/${alert.id}`} className="group flex items-center gap-3 px-4 py-2.5 transition hover:bg-white/[0.025]">
                    <span className={cn("h-7 w-[3px] shrink-0 rounded-full", severityDot[alert.severity] || "bg-slate-600")} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-300 group-hover:text-white">{alert.title}</p>
                      <p className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-600">
                        <span className="font-mono">{alert.source_ip || "nội bộ"}</span>
                        {alert.country && <span>· {countryName(alert.country)}</span>}
                        <span>· {alert.assignee_name || "Chưa phân công"}</span>
                      </p>
                    </div>
                    <div className="hidden items-center gap-2 sm:flex">
                      <SeverityBadge severity={alert.severity} />
                      <StatusBadge status={alert.status} />
                    </div>
                    <span className="w-14 shrink-0 text-right text-[9px] text-slate-600">{relativeTime(alert.detected_at)}</span>
                    <ArrowRight className="h-3 w-3 shrink-0 text-slate-700 transition group-hover:text-brand-300" />
                  </Link>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-white/[0.05] px-4 py-2.5">
                <span className="text-[10px] text-slate-600">{overview?.total_alerts} cảnh báo · {overview?.active_users} chuyên viên đang trực tuyến</span>
                <Link href="/ai" className="flex items-center gap-1 text-[10px] text-brand-300/80 transition hover:text-brand-200">
                  Hỏi Chuyên viên AI <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3">
                <div>
                  <h2 className="font-display text-sm font-semibold text-slate-200">Sự cố đang mở</h2>
                  <p className="mt-0.5 text-[11px] text-slate-600">Các trường hợp đang phản hồi</p>
                </div>
                <Link href="/incidents" className="flex items-center gap-1 text-[10px] text-slate-500 transition hover:text-brand-300">
                  Tất cả <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="divide-y divide-white/[0.03]">
                {(summary?.openIncidents || []).map((incident: any) => (
                  <Link key={incident.id} href={`/incidents/${incident.id}`} className="group block px-4 py-3 transition hover:bg-white/[0.025]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[9px] text-slate-600">{incident.incident_key}</span>
                      <span className="text-[9px] text-slate-700">{incident.priority}</span>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-300 group-hover:text-white">{incident.title}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <SeverityBadge severity={incident.severity} />
                      <StatusBadge status={incident.status} />
                      <span className="ml-auto text-[9px] text-slate-700">{relativeTime(incident.detected_at)}</span>
                    </div>
                  </Link>
                ))}
                {!summary?.openIncidents?.length && <p className="px-4 py-8 text-center text-xs text-slate-600">Không có sự cố mở. Làm tốt lắm.</p>}
              </div>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display text-sm font-semibold text-slate-200">Tư thế tuân thủ</h2>
                  <p className="mt-0.5 text-[11px] text-slate-600">Kiểm soát phạm vi bảo hiểm theo khung</p>
                </div>
                <CheckCircle2 className="h-4 w-4 text-low" />
              </div>
              <div className="mt-3 flex items-center gap-4">
                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
                  <svg viewBox="0 0 80 80" className="absolute inset-0 -rotate-90">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(148,163,184,0.08)" strokeWidth="7" />
                    <circle cx="40" cy="40" r="34" fill="none" stroke="url(#complianceRing)" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(complianceAverage / 100) * 213.6} 213.6`} />
                    <defs>
                      <linearGradient id="complianceRing" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#22d3ee" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="text-center">
                    <p className="font-display text-xl font-semibold text-white">{complianceAverage}%</p>
                    <p className="text-[7px] uppercase tracking-[0.16em] text-slate-600">trung bình</p>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {(summary?.compliance || []).map((item: any) => (
                    <div key={item.framework}>
                      <div className="mb-1 flex items-center justify-between text-[10px]">
                        <span className="text-slate-500">{item.framework}</span>
                        <span className="text-slate-400">{item.score}%</span>
                      </div>
                      <ProgressBar value={item.score} barClassName={item.score >= 85 ? "from-emerald-500 to-cyan-400" : "from-amber-500 to-orange-400"} />
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display text-sm font-semibold text-slate-200">Thực thi tường lửa</h2>
                  <p className="mt-0.5 text-[11px] text-slate-600">Hành động chính sách và số lần truy cập phiên</p>
                </div>
                <Link href="/firewall" className="text-slate-600 transition hover:text-brand-300"><ArrowUpRight className="h-4 w-4" /></Link>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {(summary?.firewall || []).map((item: any) => (
                  <div key={item.action} className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                    <p className="text-[9px] uppercase tracking-[0.14em] text-slate-600">{item.action}</p>
                    <p className="mt-1 font-display text-xl font-semibold text-white">{item.total}</p>
                    <p className="text-[9px] text-slate-600">{formatNumber(item.hits)} hits</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px]">
                <span className="text-slate-600">Quy tắc hoạt động</span>
                <span className="text-slate-300">{overview?.active_rules} enforcing</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px]">
                <span className="text-slate-600">Tổng lưu lượng truy cập phù hợp</span>
                <span className="font-mono text-slate-300">{formatNumber(firewallHits)}</span>
              </div>
              <Link href="/firewall" className="mt-3 flex items-center justify-center gap-1 rounded-lg border border-white/[0.06] py-1.5 text-[10px] text-slate-500 transition hover:border-brand-400/20 hover:text-brand-300">
                Quản lý chính sách <ArrowRight className="h-3 w-3" />
              </Link>
            </Card>

            <Card className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display text-sm font-semibold text-slate-200">Sức khỏe hoạt động</h2>
                  <p className="mt-0.5 text-[11px] text-slate-600">Tính khả dụng và phạm vi phủ sóng của nền tảng</p>
                </div>
                <ServerCog className="h-4 w-4 text-brand-400" />
              </div>
              <div className="mt-3 space-y-3">
                <div>
                  <div className="mb-1 flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">Màn hình trực tuyến</span>
                    <span className="text-slate-300">{summary?.monitors?.monitors_up}/{summary?.monitors?.monitors_total}</span>
                  </div>
                  <ProgressBar value={((summary?.monitors?.monitors_up || 0) / Math.max(summary?.monitors?.monitors_total || 1, 1)) * 100} barClassName="from-cyan-500 to-brand-400" />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">Thời gian hoạt động của nền tảng</span>
                    <span className="text-emerald-300">{overview?.uptime_percent}%</span>
                  </div>
                  <ProgressBar value={overview?.uptime_percent || 0} barClassName="from-emerald-500 to-teal-400" />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">Rủi ro tài sản trung bình</span>
                    <span className="text-amber-300">{overview?.avg_asset_risk}/100</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div className={cn("h-full rounded-full bg-gradient-to-r", riskBar(overview?.avg_asset_risk || 0))} style={{ width: `${overview?.avg_asset_risk || 0}%` }} />
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link href="/vulnerabilities" className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-2.5 py-2 transition hover:bg-white/[0.04]">
                  <Bug className="h-3.5 w-3.5 text-high" />
                  <div>
                    <p className="text-[13px] font-semibold text-slate-200">{overview?.open_vulnerabilities}</p>
                    <p className="text-[8px] uppercase tracking-wider text-slate-600">CVE mở</p>
                  </div>
                </Link>
                <Link href="/automation" className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-2.5 py-2 transition hover:bg-white/[0.04]">
                  <Workflow className="h-3.5 w-3.5 text-cyan-400" />
                  <div>
                    <p className="text-[13px] font-semibold text-slate-200">n8n</p>
                    <p className="text-[8px] uppercase tracking-wider text-slate-600">sức khỏe SOAR</p>
                  </div>
                </Link>
              </div>
            </Card>
          </div>

          <div className="flex flex-col items-start justify-between gap-2 rounded-xl border border-white/[0.05] bg-gradient-to-r from-brand-500/[0.07] via-transparent to-cyan-500/[0.05] px-4 py-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-500/10 text-brand-300"><ShieldAlert className="h-3.5 w-3.5" /></span>
              <span><span className="font-medium text-slate-200">{overview?.critical_alerts} cảnh báo quan trọng</span> vẫn mở - phân loại AI có thể liên hệ chúng với các sự cố đang diễn ra và thông tin về mối đe dọa.</span>
            </div>
            <Link href="/ai" className="flex items-center gap-1 text-[11px] font-medium text-brand-300 transition hover:text-brand-200">
              Điều tra bằng AI <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
