"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Bot,
  Bug,
  Cpu,
  Database,
  HardDrive,
  MapPin,
  Network,
  RefreshCw,
  ScanLine,
  Server,
  ShieldAlert,
  Siren,
  UserRound,
} from "lucide-react";
import { api, useApi } from "@/lib/api";
import { cn, formatDate, relativeTime, riskBar, titleCase } from "@/lib/utils";
import { ComplianceGauge } from "@/components/charts";
import { DataTable, type Column } from "@/components/DataTable";
import { useToast } from "@/components/toast";
import { Avatar, Badge, Button, Card, ErrorState, KeyValue, PageHeader, ProgressBar, SeverityBadge, Skeleton, StatusBadge, Tabs } from "@/components/ui";

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const { data, loading, error, refetch } = useApi<any>(`/assets/${id}`);
  const alerts = useApi<any>(`/assets/${id}/alerts`);
  const vulnerabilities = useApi<any>(`/assets/${id}/vulnerabilities`);
  const incidents = useApi<any>(`/assets/${id}/incidents`);
  const risk = useApi<any>(`/assets/${id}/risk`);
  const [tab, setTab] = useState("alerts");
  const [scanning, setScanning] = useState(false);

  const asset = data?.data;
  const breakdown = risk.data?.data;

  const scan = async () => {
    setScanning(true);
    try {
      await api(`/assets/${id}/scan`, { method: "POST", body: { type: "vulnerability" } });
      success("Đã xếp hàng quét", "Lịch quét lỗ hổng đã được tạo cho tài sản này.");
      risk.refetch();
    } catch (err) {
      toastError("Quét thất bại", err instanceof Error ? err.message : "Không thể xếp hàng quét");
    } finally {
      setScanning(false);
    }
  };

  const alertColumns: Column[] = [
    { key: "title", header: "Cảnh báo", render: (row) => <span className="text-[11.5px] text-slate-300">{row.title}</span> },
    { key: "severity", header: "Mức độ", width: "100px", render: (row) => <SeverityBadge severity={row.severity} /> },
    { key: "status", header: "Trạng thái", width: "110px", render: (row) => <StatusBadge status={row.status} /> },
    { key: "source_ip", header: "Nguồn", width: "130px", render: (row) => <span className="font-mono text-[10px] text-slate-500">{row.source_ip || "nội bộ"}</span> },
    { key: "detected_at", header: "Phát hiện", width: "100px", render: (row) => <span className="text-[10px] text-slate-600">{relativeTime(row.detected_at)}</span> },
  ];

  const vulnColumns: Column[] = [
    { key: "title", header: "Tính dễ bị tổn thương", render: (row) => <div><p className="text-[11.5px] text-slate-300">{row.title}</p><p className="mt-0.5 font-mono text-[9px] text-slate-600">{row.cve_id}</p></div> },
    { key: "severity", header: "Mức độ", width: "100px", render: (row) => <SeverityBadge severity={row.severity} /> },
    { key: "cvss_score", header: "CVSS", width: "80px", render: (row) => <span className={cn("font-mono text-[11px]", Number(row.cvss_score) >= 9 ? "text-critical" : "text-high")}>{row.cvss_score}</span> },
    { key: "status", header: "Trạng thái", width: "110px", render: (row) => <StatusBadge status={row.status} /> },
  ];

  const incidentColumns: Column[] = [
    { key: "incident_key", header: "Sự cố", width: "150px", render: (row) => <span className="font-mono text-[9.5px] text-slate-600">{row.incident_key}</span> },
    { key: "title", header: "Tiêu đề", render: (row) => <span className="text-[11.5px] text-slate-300">{row.title}</span> },
    { key: "severity", header: "Mức độ", width: "100px", render: (row) => <SeverityBadge severity={row.severity} /> },
    { key: "status", header: "Trạng thái", width: "110px", render: (row) => <StatusBadge status={row.status} /> },
    { key: "detected_at", header: "Phát hiện", width: "100px", render: (row) => <span className="text-[10px] text-slate-600">{relativeTime(row.detected_at)}</span> },
  ];

  if (loading && !asset) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-44 rounded-xl" />
        <div className="grid gap-4 xl:grid-cols-3">
          <Skeleton className="h-80 rounded-xl xl:col-span-2" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error && !asset) return <Card><ErrorState message={error} onRetry={refetch} /></Card>;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] text-slate-600">
          <Link href="/assets" className="flex items-center gap-1 transition hover:text-brand-300"><ArrowLeft className="h-3 w-3" /> Kiểm kê tài sản</Link>
          <span className="text-slate-800">/</span>
          <span className="font-mono text-slate-500">{asset.hostname || String(id).slice(0, 8)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/ai?prompt=${encodeURIComponent(`Đánh giá rủi ro của tài sản "${asset.name}" (${asset.criticality}) và đề xuất ưu tiên khắc phục.`)}`}>
            <Button icon={Bot}>Hỏi AI</Button>
          </Link>
          <Button icon={RefreshCw} onClick={() => { risk.refetch(); refetch(); }}>Tính toán lại rủi ro</Button>
          <Button variant="primary" icon={ScanLine} loading={scanning} onClick={scan}>Quét tài sản</Button>
        </div>
      </div>

      <Card className="mb-4 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border", asset.criticality === "critical" ? "border-critical/25 bg-critical/10 text-critical" : asset.criticality === "high" ? "border-high/25 bg-high/10 text-high" : "border-white/[0.07] bg-white/[0.03] text-slate-400")}>
              {["database", "storage"].includes(asset.type) ? <Database className="h-6 w-6" /> : <Server className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-xl font-semibold text-white md:text-2xl">{asset.name}</h1>
                <StatusBadge status={asset.status} />
                <span className={cn("chip", asset.criticality === "critical" ? "border-critical/30 bg-critical/10 text-critical" : asset.criticality === "high" ? "border-high/30 bg-high/10 text-high" : "border-white/10 bg-white/5 text-slate-400")}>{titleCase(asset.criticality)} mức quan trọng</span>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[10.5px] text-slate-500">
                <span>{asset.hostname || "không có tên máy chủ"}</span>
                <span className="text-slate-800">·</span>
                <span>{asset.ip_address || "không có IP"}</span>
                <span className="text-slate-800">·</span>
                <span>{titleCase(asset.type)}</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(asset.tags || []).map((tag: string) => <span key={tag} className="rounded border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 text-[9px] text-slate-600">#{tag}</span>)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-[0.16em] text-slate-600">Rủi ro tổng hợp</p>
              <p className={cn("font-display text-3xl font-semibold", (breakdown?.score || asset.risk_score) >= 80 ? "text-critical" : (breakdown?.score || asset.risk_score) >= 60 ? "text-high" : "text-medium")}>{breakdown?.score ?? asset.risk_score}</p>
            </div>
            <div className="h-12 w-px bg-white/[0.06]" />
            <div>
              <p className="text-[9px] uppercase tracking-[0.16em] text-slate-600">Chủ sở hữu</p>
              <div className="mt-1 flex items-center gap-2">
                <Avatar name={asset.owner_name} email={asset.owner_email} size="xs" />
                <div>
                  <p className="text-[10.5px] text-slate-300">{asset.owner_name || "Chưa có chủ"}</p>
                  <p className="text-[8.5px] text-slate-600">{asset.department || "Chưa có khoa/phòng"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="panel p-3">
              <p className="text-[9px] uppercase tracking-[0.14em] text-slate-600">Cảnh báo đang mở</p>
              <p className="mt-1 font-display text-xl font-semibold text-white">{breakdown?.open_alerts ?? alerts.data?.data?.length ?? 0}</p>
              <p className="text-[9px] text-high">{breakdown?.high_alerts ?? 0} cảnh báo mức cao</p>
            </div>
            <div className="panel p-3">
              <p className="text-[9px] uppercase tracking-[0.14em] text-slate-600">Lỗ hổng</p>
              <p className="mt-1 font-display text-xl font-semibold text-white">{vulnerabilities.data?.data?.length ?? 0}</p>
              <p className="text-[9px] text-slate-600">CVSS tối đa {breakdown?.max_cvss ?? "—"}</p>
            </div>
            <div className="panel p-3">
              <p className="text-[9px] uppercase tracking-[0.14em] text-slate-600">Sự cố đang mở</p>
              <p className="mt-1 font-display text-xl font-semibold text-white">{breakdown?.open_incidents ?? incidents.data?.data?.length ?? 0}</p>
              <p className="text-[9px] text-slate-600">sự cố phản hồi</p>
            </div>
            <div className="panel p-3">
              <p className="text-[9px] uppercase tracking-[0.14em] text-slate-600">Lần cuối</p>
              <p className="mt-1 text-[13px] font-semibold text-slate-200">{relativeTime(asset.last_seen)}</p>
              <p className="text-[9px] text-slate-600">{asset.location || "không rõ vị trí"}</p>
            </div>
          </div>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.05] p-3.5">
              <Tabs
                value={tab}
                onChange={setTab}
                tabs={[
                  { key: "alerts", label: "Cảnh báo", count: alerts.data?.data?.length || 0 },
                  { key: "vulnerabilities", label: "Lỗ hổng", count: vulnerabilities.data?.data?.length || 0 },
                  { key: "incidents", label: "Sự cố", count: incidents.data?.data?.length || 0 },
                ]}
              />
              <span className="text-[10px] text-slate-600">Bối cảnh bảo mật liên quan</span>
            </div>
            {tab === "alerts" && (
              <DataTable rows={alerts.data?.data} columns={alertColumns} loading={alerts.loading} emptyTitle="Không có cảnh báo nào cho tài sản này" emptyMessage="Tài sản này chưa có phát hiện tương quan." onRowClick={(row) => router.push(`/alerts/${row.id}`)} />
            )}
            {tab === "vulnerabilities" && (
              <DataTable rows={vulnerabilities.data?.data} columns={vulnColumns} loading={vulnerabilities.loading} emptyTitle="Không có lỗ hổng" emptyMessage="Không có CVE mở nào được ánh xạ tới tài sản này." onRowClick={(row) => router.push(`/vulnerabilities/${row.id}`)} />
            )}
            {tab === "incidents" && (
              <DataTable rows={incidents.data?.data} columns={incidentColumns} loading={incidents.loading} emptyTitle="Không có sự cố" emptyMessage="Tài sản này không liên quan đến bất kỳ sự cố nào." onRowClick={(row) => router.push(`/incidents/${row.id}`)} />
            )}
          </Card>

          <Card className="p-4">
            <h2 className="font-display text-sm font-semibold text-slate-200">Hồ sơ kỹ thuật</h2>
            <div className="mt-2 grid gap-x-8 sm:grid-cols-2">
              <KeyValue label="Tên máy chủ" value={asset.hostname || "—"} mono />
              <KeyValue label="Địa chỉ IP" value={asset.ip_address || "—"} mono />
              <KeyValue label="Địa chỉ MAC" value={asset.mac_address || "—"} mono />
              <KeyValue label="Hệ điều hành" value={asset.os || "—"} />
              <KeyValue label="Khoa/Phòng" value={asset.department || "—"} />
              <KeyValue label="Vị trí" value={asset.location || "—"} />
              <KeyValue label="Tạo" value={formatDate(asset.created_at)} />
              <KeyValue label="ID tài sản" value={<span className="font-mono text-[10px]">{asset.id}</span>} />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="font-display text-sm font-semibold text-slate-200">Thành phần rủi ro</h2>
            <p className="mt-0.5 text-[11px] text-slate-600">Trọng số từ đo từ xa trực tiếp</p>
            <ComplianceGauge score={breakdown?.score ?? asset.risk_score} size={160} label="Điểm rủi ro" />
            <div className="mt-1 space-y-2">
              <RiskRow label="Trọng số mức quan trọng" value={breakdown?.criticality_weight ?? 0} max={35} />
              <RiskRow label="Cảnh báo cao" value={(breakdown?.high_alerts || 0) * 9} max={45} />
              <RiskRow label="Cảnh báo khác" value={(breakdown?.open_alerts || 0) * 3} max={30} />
              <RiskRow label="Mức phơi nhiễm CVSS" value={Number(breakdown?.max_cvss || 0) * 2} max={20} />
              <RiskRow label="Sự cố đang mở" value={(breakdown?.open_incidents || 0) * 6} max={18} />
            </div>
            <p className="mt-3 text-[9px] leading-relaxed text-slate-700">Rủi ro được tính toán lại theo yêu cầu từ mức độ quan trọng, cảnh báo mở, CVE và sự cố.</p>
          </Card>

          <Card className="p-4">
            <h2 className="font-display text-sm font-semibold text-slate-200">Quyền sở hữu</h2>
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
              <Avatar name={asset.owner_name} email={asset.owner_email} />
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-200">{asset.owner_name || "Tài sản chưa có chủ"}</p>
                <p className="truncate text-[9.5px] text-slate-600">{asset.owner_email || "Chỉ định chủ sở hữu"}</p>
              </div>
            </div>
            <div className="mt-2">
              <KeyValue label="Khoa/Phòng" value={asset.department || "—"} />
              <KeyValue label="Vị trí" value={asset.location || "—"} />
              <KeyValue label="Lần cuối" value={formatDate(asset.last_seen)} />
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="font-display text-sm font-semibold text-slate-200">Hành động bảo vệ</h2>
            <Button className="mt-3 w-full" icon={ScanLine} loading={scanning} onClick={scan}>Đưa quét lỗ hổng vào hàng đợi</Button>
            <Button className="mt-2 w-full" icon={RefreshCw} onClick={() => { risk.refetch(); refetch(); }}>Tính toán lại điểm rủi ro</Button>
            <div className="mt-3 flex items-center justify-between text-[10px]">
              <span className="text-slate-600">Giám sát</span>
              <StatusBadge status={asset.status} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function RiskRow({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px]">
        <span className="text-slate-600">{label}</span>
        <span className="font-mono text-slate-400">+{Math.round(value)}</span>
      </div>
      <ProgressBar value={(value / Math.max(max, 1)) * 100} barClassName="from-high to-critical" className="h-1" />
    </div>
  );
}
