"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Database, Download, HardDrive, Plus, RefreshCw, ShieldAlert, Server, Activity } from "lucide-react";
import { api, apiDownload, buildQuery, useApi, useDebounced } from "@/lib/api";
import { cn, formatNumber, relativeTime, riskBar, titleCase } from "@/lib/utils";
import { DataTable, type Column } from "@/components/DataTable";
import { useToast } from "@/components/toast";
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Field,
  Input,
  Modal,
  PageHeader,
  Pagination,
  ProgressBar,
  SearchInput,
  Select,
  Skeleton,
  StatCard,
  StatusBadge,
} from "@/components/ui";

const TYPES = ["server", "web_server", "database", "api_gateway", "vpn", "identity", "kubernetes", "workstation", "storage", "medical_device", "iot", "siem", "dns", "email", "ci_cd", "gateway"];
const CRITICALITIES = ["critical", "high", "medium", "low"];

export default function AssetsPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [criticality, setCriticality] = useState("");
  const [status, setStatus] = useState("");
  const [minRisk, setMinRisk] = useState("");
  const [sort, setSort] = useState("risk_score");
  const [createOpen, setCreateOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const query = useDebounced(search, 300);

  const stats = useApi<any>("/assets/stats", { refreshInterval: 60000 });
  const listPath = useMemo(
    () => `/assets${buildQuery({ page, limit: 12, q: query || undefined, type: type || undefined, criticality: criticality || undefined, status: status || undefined, min_risk: minRisk || undefined, sort, order: "desc" })}`,
    [page, query, type, criticality, status, minRisk, sort],
  );
  const { data, loading, error, refetch, refreshing } = useApi<any>(listPath, { refreshInterval: 45000 });

  useEffect(() => setPage(1), [query, type, criticality, status, minRisk, sort]);

  const statsData = stats.data?.data;
  const summary = statsData?.summary;
  const byType = statsData?.byType || [];
  const byCriticality = statsData?.byCriticality || [];
  const topRisk = statsData?.topRisk || [];
  const criticalCount = byCriticality.find((item: any) => item.criticality === "critical")?.total || 0;

  const exportCsv = async () => {
    setExporting(true);
    try {
      await apiDownload("/assets/export", `medicareguard-assets-${Date.now()}.csv`);
      success("Xuất thành công", "Danh mục tài sản đã được xuất dưới dạng CSV.");
    } catch (err) {
      toastError("Xuất thất bại", err instanceof Error ? err.message : "Không thể xuất tài sản");
    } finally {
      setExporting(false);
    }
  };

  const columns: Column[] = [
    {
      key: "name",
      header: "Tài sản",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", row.criticality === "critical" ? "border-critical/20 bg-critical/10 text-critical" : row.criticality === "high" ? "border-high/20 bg-high/10 text-high" : "border-white/[0.06] bg-white/[0.03] text-slate-500")}>
            {["database", "storage"].includes(row.type) ? <Database className="h-3.5 w-3.5" /> : <Server className="h-3.5 w-3.5" />}
          </span>
          <div className="min-w-0">
            <p className="max-w-[150px] truncate text-[12.5px] font-medium text-slate-200">{row.name}</p>
            <p className="truncate font-mono text-[9.5px] text-slate-600">{row.hostname || row.ip_address || "không có tên máy chủ"}</p>
          </div>
        </div>
      ),
    },
    { key: "type", header: "Loại", width: "105px", render: (row) => <Badge>{titleCase(row.type)}</Badge> },
    {
      key: "criticality",
      header: "Mức quan trọng",
      width: "95px",
      render: (row) => (
        <span className={cn("chip", row.criticality === "critical" ? "border-critical/30 bg-critical/10 text-critical" : row.criticality === "high" ? "border-high/30 bg-high/10 text-high" : "border-white/10 bg-white/5 text-slate-400")}>
          {titleCase(row.criticality)}
        </span>
      ),
    },
    { key: "ip_address", header: "Địa chỉ IP", width: "105px", render: (row) => <span className="font-mono text-[10px] text-slate-500">{row.ip_address || "—"}</span> },
    { key: "os", header: "Hệ điều hành", width: "110px", render: (row) => <span className="text-[10.5px] text-slate-500">{row.os || "—"}</span> },
    { key: "owner", header: "Chủ sở hữu", width: "110px", render: (row) => <span className="text-[10.5px] text-slate-500">{row.owner_name || <span className="text-slate-700">Không có chủ sở hữu</span>}</span> },
    {
      key: "risk_score",
      header: "Rủi ro",
      width: "105px",
      render: (row) => (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className={cn("font-mono text-[11px]", row.risk_score >= 80 ? "text-critical" : row.risk_score >= 60 ? "text-high" : row.risk_score >= 40 ? "text-medium" : "text-low")}>{row.risk_score}</span>
            <span className="text-[8px] text-slate-700">/100</span>
          </div>
          <ProgressBar value={row.risk_score} barClassName={riskBar(row.risk_score)} className="h-1" />
        </div>
      ),
    },
    { key: "status", header: "Trạng thái", width: "95px", render: (row) => <StatusBadge status={row.status} /> },
    { key: "last_seen", header: "Lần cuối", width: "80px", render: (row) => <span className="text-[9.5px] text-slate-600">{relativeTime(row.last_seen)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Kiểm kê tài sản"
        subtitle="Mọi máy chủ, cơ sở dữ liệu, thiết bị và bề mặt nhận dạng trong khu vực Medicare"
        icon={HardDrive}
        badge={<Badge>{summary?.total || 0} tài sản</Badge>}
        actions={
          <>
            <Button icon={RefreshCw} onClick={() => { refetch(); stats.refetch(); }} loading={refreshing}>Làm mới</Button>
            <Button icon={Download} onClick={exportCsv} loading={exporting}>Xuất</Button>
            <Button variant="primary" icon={Plus} onClick={() => setCreateOpen(true)}>Thêm tài sản</Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.loading && !stats.data ? (
          Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-[112px] rounded-xl" />)
        ) : (
          <>
            <StatCard label="Tài sản được quản lý" value={formatNumber(summary?.total)} hint={`${byType.length} lớp tài sản`} icon={HardDrive} tone="brand" />
            <StatCard label="Rủi ro trung bình" value={`${summary?.avg_risk || 0}`} hint="Có trọng số trên toàn bộ tài sản" icon={Activity} tone="warning" />
            <StatCard label="Tài sản quan trọng" value={formatNumber(criticalCount)} hint="Tác động kinh doanh cao nhất" icon={ShieldAlert} tone="critical" />
            <StatCard label="Tài sản rủi ro cao" value={formatNumber(topRisk.filter((item: any) => item.risk_score >= 70).length)} hint="Điểm rủi ro 70+" icon={Server} tone="success" />
          </>
        )}
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-3">
        <Card className="p-4 xl:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-200">Điểm nóng rủi ro</h2>
              <p className="mt-0.5 text-[11px] text-slate-600">Tài sản cần khắc phục</p>
            </div>
            <Link href="/vulnerabilities" className="flex items-center gap-1 text-[10px] text-slate-500 transition hover:text-brand-300">Lỗ hổng <ArrowUpRight className="h-3 w-3" /></Link>
          </div>
          <div className="mt-3 space-y-2.5">
            {topRisk.slice(0, 6).map((asset: any) => (
              <Link key={asset.id} href={`/assets/${asset.id}`} className="group flex items-center gap-3">
                <span className="w-36 shrink-0 truncate text-[11px] text-slate-400 group-hover:text-slate-200">{asset.name}</span>
                <div className="flex-1">
                  <ProgressBar value={asset.risk_score} barClassName={riskBar(asset.risk_score)} />
                </div>
                <span className={cn("w-8 text-right font-mono text-[10px]", asset.risk_score >= 80 ? "text-critical" : asset.risk_score >= 60 ? "text-high" : "text-medium")}>{asset.risk_score}</span>
                <span className="hidden w-24 truncate font-mono text-[9px] text-slate-700 sm:block">{asset.ip_address}</span>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="font-display text-sm font-semibold text-slate-200">Phân bổ tài sản</h2>
          <p className="mt-0.5 text-[11px] text-slate-600">Tài sản theo loại</p>
          <div className="mt-3 space-y-2">
            {byType.slice(0, 7).map((item: any) => (
              <div key={item.type}>
                <div className="mb-1 flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">{titleCase(item.type)}</span>
                  <span className="text-slate-400">{item.total}</span>
                </div>
                <ProgressBar value={(item.total / Math.max(summary?.total || 1, 1)) * 100} barClassName="from-brand-500 to-cyan-400" className="h-1" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.05] p-3.5">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-sm font-semibold text-slate-200">Danh sách tài sản</h2>
            <Badge>{data?.pagination?.total || 0} bản ghi</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Tìm kiếm tên, máy chủ, IP…" className="w-full sm:w-56" />
            <Select value={type} onChange={(event) => setType(event.target.value)} className="w-36">
              <option value="">Tất cả các loại</option>
              {byType.map((item: any) => <option key={item.type} value={item.type}>{titleCase(item.type)}</option>)}
            </Select>
            <Select value={criticality} onChange={(event) => setCriticality(event.target.value)} className="w-32">
              <option value="">Mức quan trọng</option>
              {CRITICALITIES.map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}
            </Select>
            <Select value={status} onChange={(event) => setStatus(event.target.value)} className="w-28">
              <option value="">Trạng thái</option>
              <option value="online">Trực tuyến</option>
              <option value="offline">Ngoại tuyến</option>
              <option value="maintenance">Bảo trì</option>
            </Select>
            <Select value={minRisk} onChange={(event) => setMinRisk(event.target.value)} className="w-28">
              <option value="">Rủi ro</option>
              <option value="40">40+</option>
              <option value="60">60+</option>
              <option value="80">80+</option>
            </Select>
            <Select value={sort} onChange={(event) => setSort(event.target.value)} className="w-32">
              <option value="risk_score">Rủi ro cao nhất</option>
              <option value="name">Tên</option>
              <option value="last_seen">Lần cuối</option>
            </Select>
          </div>
        </div>
        {error && !data ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : (
          <DataTable
            rows={data?.data}
            columns={columns}
            loading={loading && !data}
            onRowClick={(row) => router.push(`/assets/${row.id}`)}
            emptyTitle="Không có tài sản nào phù hợp với chế độ xem này"
            emptyMessage="Điều chỉnh bộ lọc hoặc thêm tài sản mới."
            footer={data?.pagination ? <Pagination page={data.pagination.page} pages={data.pagination.pages} total={data.pagination.total} limit={data.pagination.limit} onPage={setPage} /> : null}
          />
        )}
      </Card>

      <CreateAssetModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); refetch(); stats.refetch(); }} />
    </div>
  );
}

function CreateAssetModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { success, error: toastError } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", type: "server", hostname: "", ip_address: "", os: "", department: "", location: "",
    criticality: "medium", status: "online", risk_score: 25, tags: "",
  });

  useEffect(() => {
    if (open) setForm({ name: "", type: "server", hostname: "", ip_address: "", os: "", department: "", location: "", criticality: "medium", status: "online", risk_score: 25, tags: "" });
  }, [open]);

  const set = (key: string, value: string | number) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api("/assets", {
        method: "POST",
        body: { ...form, risk_score: Number(form.risk_score), tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean) },
      });
      success("Đã thêm tài sản", "Tài sản đã được thêm vào danh mục.");
      onCreated();
    } catch (err) {
      toastError("Không thể thêm tài sản", err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Thêm tài sản"
      description="Đăng ký máy chủ, khối lượng công việc, thiết bị hoặc bề mặt nhận dạng mới."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button variant="primary" loading={saving} onClick={submit}>Thêm tài sản</Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <Field label="Tên tài sản" className="md:col-span-2">
          <Input value={form.name} onChange={(event) => set("name", event.target.value)} placeholder="Ví dụ: API xử lý khiếu nại" required />
        </Field>
        <Field label="Loại tài sản">
          <Select value={form.type} onChange={(event) => set("type", event.target.value)}>{TYPES.map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}</Select>
        </Field>
        <Field label="Mức quan trọng">
          <Select value={form.criticality} onChange={(event) => set("criticality", event.target.value)}>{CRITICALITIES.map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}</Select>
        </Field>
        <Field label="Tên máy chủ">
          <Input value={form.hostname} onChange={(event) => set("hostname", event.target.value)} placeholder="claims-api-01.medicareguard.io" />
        </Field>
        <Field label="Địa chỉ IP">
          <Input value={form.ip_address} onChange={(event) => set("ip_address", event.target.value)} placeholder="10.10.4.21" className="font-mono" />
        </Field>
        <Field label="Hệ điều hành">
          <Input value={form.os} onChange={(event) => set("os", event.target.value)} placeholder="Ubuntu 24.04 / Máy chủ Windows 2022" />
        </Field>
        <Field label="Khoa/Phòng">
          <Input value={form.department} onChange={(event) => set("department", event.target.value)} placeholder="Hệ thống lâm sàng" />
        </Field>
        <Field label="Vị trí">
          <Input value={form.location} onChange={(event) => set("location", event.target.value)} placeholder="ap-southeast-1 / on-prem-dc1" />
        </Field>
        <Field label="Trạng thái">
          <Select value={form.status} onChange={(event) => set("status", event.target.value)}>
            <option value="online">Trực tuyến</option>
            <option value="offline">Ngoại tuyến</option>
            <option value="maintenance">Bảo trì</option>
          </Select>
        </Field>
        <Field label={`Điểm rủi ro ban đầu — ${form.risk_score}`}>
          <input type="range" min={0} max={100} value={form.risk_score} onChange={(event) => set("risk_score", Number(event.target.value))} className="input h-9 cursor-pointer accent-brand-500" />
        </Field>
        <Field label="Thẻ" hint="Phân cách bằng dấu phẩy">
          <Input value={form.tags} onChange={(event) => set("tags", event.target.value)} placeholder="lâm sàng, pci, truy cập internet" />
        </Field>
      </form>
    </Modal>
  );
}
