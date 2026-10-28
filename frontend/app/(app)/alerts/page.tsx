"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  CheckCircle2,
  Download,
  Plus,
  RefreshCw,
  ShieldAlert,
  Timer,
} from "lucide-react";
import { api, apiDownload, buildQuery, useApi, useDebounced } from "@/lib/api";
import { cn, countryFlag, countryName, formatDate, formatNumber, relativeTime, titleCase } from "@/lib/utils";
import { DataTable, type Column } from "@/components/DataTable";
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
  SearchInput,
  Select,
  SeverityBadge,
  Skeleton,
  StatCard,
  StatusBadge,
  Tabs,
  Textarea,
} from "@/components/ui";
import { useToast } from "@/components/toast";

const SEVERITIES = ["critical", "high", "medium", "low", "info"];

export default function AlertsPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("detected_at");
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const query = useDebounced(search, 300);

  const stats = useApi<any>("/alerts/stats", { refreshInterval: 60000 });
  const listPath = useMemo(
    () => `/alerts${buildQuery({ page, limit: 12, q: query || undefined, severity: severity || undefined, status: status || undefined, sort, order: "desc" })}`,
    [page, query, severity, status, sort],
  );
  const { data, loading, error, refetch, refreshing } = useApi<any>(listPath, { refreshInterval: 30000 });

  useEffect(() => {
    setPage(1);
  }, [query, severity, status, sort]);

  const bySeverity = stats.data?.data?.bySeverity || [];
  const byStatus = stats.data?.data?.byStatus || [];
  const severityCount = (name: string) => bySeverity.find((item: any) => item.severity === name)?.total || 0;
  const statusCount = (name: string) => byStatus.find((item: any) => item.status === name)?.total || 0;

  const tabs = [
    { key: "", label: "Tất cả cảnh báo", count: byStatus.reduce((sum: number, item: any) => sum + item.total, 0) },
    { key: "open", label: "Mở", count: statusCount("open") },
    { key: "investigating", label: "Đang điều tra", count: statusCount("investigating") },
    { key: "contained", label: "Đã cô lập", count: statusCount("contained") },
    { key: "resolved", label: "Đã xử lý", count: statusCount("resolved") },
    { key: "false_positive", label: "Dương tính giả", count: statusCount("false_positive") },
  ];

  const exportCsv = async () => {
    setExporting(true);
    try {
      await apiDownload(`/alerts/export${buildQuery({ q: query || undefined, severity: severity || undefined, status: status || undefined })}`, `medicareguard-alerts-${Date.now()}.csv`);
      success("Xuất thành công", "Hàng đợi cảnh báo đã được xuất dưới dạng CSV.");
    } catch (err) {
      toastError("Xuất thất bại", err instanceof Error ? err.message : "Không thể xuất cảnh báo");
    } finally {
      setExporting(false);
    }
  };

  const columns: Column[] = [
    {
      key: "severity",
      header: "Mức độ",
      width: "85px",
      render: (row) => <SeverityBadge severity={row.severity} />,
    },
    {
      key: "title",
      header: "Báo động",
      render: (row) => (
        <div className="min-w-0">
          <p className="max-w-[260px] truncate text-[12.5px] font-medium text-slate-200">{row.title}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-600">
            <span>{titleCase(row.source || "sensor")}</span>
            {row.threat_name && <><span className="text-slate-800">·</span><span className="max-w-[110px] truncate">{row.threat_name}</span></>}
          </p>
        </div>
      ),
    },
    {
      key: "source_ip",
      header: "Nguồn gốc",
      width: "120px",
      render: (row) => (
        <div>
          <p className="font-mono text-[10.5px] text-slate-400">{row.source_ip || "nội bộ"}</p>
          <p className="mt-0.5 text-[9.5px] text-slate-600">{row.country ? `${countryFlag(row.country_code)} ${countryName(row.country)}` : "—"}</p>
        </div>
      ),
    },
    {
      key: "mitre",
      header: "MITRE ATT&CK",
      width: "120px",
      render: (row) => (
        <div>
          <p className="max-w-[150px] truncate text-[10.5px] text-slate-400">{row.mitre_tactic?.replace(/^T\d+\s/, "") || "—"}</p>
          <p className="mt-0.5 max-w-[150px] truncate font-mono text-[9px] text-slate-600">{row.mitre_technique?.split(" ")[0] || "chưa ánh xạ"}</p>
        </div>
      ),
    },
    {
      key: "assignee",
      header: "Người phụ trách",
      width: "100px",
      render: (row) => <span className="text-[11px] text-slate-500">{row.assignee_name || <span className="text-slate-700">Chưa phân công</span>}</span>,
    },
    {
      key: "risk_score",
      header: "Rủi ro",
      width: "75px",
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="h-1 w-9 overflow-hidden rounded-full bg-white/[0.06]">
            <div className={cn("h-full rounded-full", Number(row.risk_score) >= 80 ? "bg-critical" : Number(row.risk_score) >= 60 ? "bg-high" : Number(row.risk_score) >= 40 ? "bg-medium" : "bg-low")} style={{ width: `${row.risk_score}%` }} />
          </div>
          <span className="font-mono text-[10px] text-slate-500">{row.risk_score}</span>
        </div>
      ),
    },
    { key: "status", header: "Trạng thái", width: "100px", render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "detected_at",
      header: "Phát hiện",
      width: "85px",
      render: (row) => <span title={formatDate(row.detected_at)} className="text-[10px] text-slate-600">{relativeTime(row.detected_at)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Hàng đợi cảnh báo"
        subtitle="Phân loại, chỉ định và giải quyết các phát hiện từ mọi cảm biến bảo mật"
        icon={ShieldAlert}
        badge={<Badge tone="critical" dot>{statusCount("open")} đang mở</Badge>}
        actions={
          <>
            <Button icon={RefreshCw} onClick={() => { refetch(); stats.refetch(); }} loading={refreshing}>Làm mới</Button>
            <Button icon={Download} onClick={exportCsv} loading={exporting}>Xuất</Button>
            <Button variant="primary" icon={Plus} onClick={() => setCreateOpen(true)}>Cảnh báo mới</Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.loading && !stats.data ? (
          Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-[112px] rounded-xl" />)
        ) : (
          <>
            <StatCard label="Tổng số phát hiện" value={formatNumber(byStatus.reduce((sum: number, item: any) => sum + item.total, 0))} hint="Mọi lúc" icon={Activity} tone="brand" />
            <StatCard label="Cảnh báo nghiêm trọng" value={formatNumber(severityCount("critical"))} hint={`${severityCount("high")} mức cao`} icon={ShieldAlert} tone="critical" />
            <StatCard label="Đang điều tra" value={formatNumber(statusCount("investigating"))} hint={`${statusCount("contained")} đã cô lập`} icon={Timer} tone="warning" />
            <StatCard label="Đã xử lý" value={formatNumber(statusCount("resolved"))} hint={`${statusCount("false_positive")} dương tính giả`} icon={CheckCircle2} tone="success" />
          </>
        )}
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-white/[0.05] p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Tabs tabs={tabs} value={status} onChange={setStatus} />
            <div className="flex items-center gap-2">
              <SearchInput value={search} onChange={setSearch} placeholder="Tìm kiếm tiêu đề, IP, quốc gia…" className="w-full sm:w-64" />
              <Select value={severity} onChange={(event) => setSeverity(event.target.value)} className="w-32">
                <option value="">Mọi mức độ nghiêm trọng</option>
                {SEVERITIES.map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}
              </Select>
              <Select value={sort} onChange={(event) => setSort(event.target.value)} className="w-36">
                <option value="detected_at">Mới nhất đầu tiên</option>
                <option value="risk_score">Rủi ro cao nhất</option>
                <option value="severity">Mức độ</option>
                <option value="status">Trạng thái</option>
              </Select>
            </div>
          </div>
        </div>

        {error && !data ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : (
          <DataTable
            rows={data?.data}
            columns={columns}
            loading={loading && !data}
            onRowClick={(row) => router.push(`/alerts/${row.id}`)}
            emptyTitle="Không có cảnh báo nào phù hợp với chế độ xem này"
            emptyMessage="Hãy thử mở rộng bộ lọc của bạn hoặc tạo cảnh báo thủ công."
            footer={data?.pagination ? <Pagination page={data.pagination.page} pages={data.pagination.pages} total={data.pagination.total} limit={data.pagination.limit} onPage={setPage} /> : null}
          />
        )}
      </Card>

      <CreateAlertModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); refetch(); stats.refetch(); }} />
    </div>
  );
}

function CreateAlertModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { success, error: toastError } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    severity: "medium",
    source: "Thủ công",
    source_ip: "",
    country: "",
    mitre_tactic: "",
    mitre_technique: "",
    risk_score: 55,
    confidence: 70,
  });

  useEffect(() => {
    if (open) setForm({ title: "", description: "", severity: "medium", source: "Thủ công", source_ip: "", country: "", mitre_tactic: "", mitre_technique: "", risk_score: 55, confidence: 70 });
  }, [open]);

  const set = (key: string, value: string | number) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await api("/alerts", {
        method: "POST",
        body: { ...form, risk_score: Number(form.risk_score), confidence: Number(form.confidence) },
      });
      success("Đã tạo cảnh báo", "Phát hiện đã được đưa vào hàng đợi phân loại.");
      onCreated();
    } catch (err) {
      toastError("Không thể tạo cảnh báo", err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tạo cảnh báo thủ công"
      description="Ghi lại phát hiện không được cảm biến tự động đưa ra."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button variant="primary" loading={saving} onClick={submit}>Tạo cảnh báo</Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <Field label="Tiêu đề cảnh báo" className="md:col-span-2">
          <Input value={form.title} onChange={(event) => set("title", event.target.value)} placeholder="Ví dụ: Cấp quyền OAuth đáng ngờ cho ứng dụng không xác định" required />
        </Field>
        <Field label="Mô tả" className="md:col-span-2">
          <Textarea value={form.description} onChange={(event) => set("description", event.target.value)} placeholder="Những gì đã được quan sát, trên tài sản nào và tại sao nó lại quan trọng…" />
        </Field>
        <Field label="Mức độ">
          <Select value={form.severity} onChange={(event) => set("severity", event.target.value)}>
            {SEVERITIES.map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}
          </Select>
        </Field>
        <Field label="Nguồn phát hiện">
          <Input value={form.source} onChange={(event) => set("source", event.target.value)} placeholder="EDR, SIEM, Đường mòn đám mây…" />
        </Field>
        <Field label="IP nguồn">
          <Input value={form.source_ip} onChange={(event) => set("source_ip", event.target.value)} placeholder="203.0.113.42" className="font-mono" />
        </Field>
        <Field label="Quốc gia">
          <Input value={form.country} onChange={(event) => set("country", event.target.value)} placeholder="Nước xuất xứ" />
        </Field>
        <Field label="Chiến thuật MITRE">
          <Input value={form.mitre_tactic} onChange={(event) => set("mitre_tactic", event.target.value)} placeholder="TA0001 Truy cập ban đầu" />
        </Field>
        <Field label="Kỹ thuật MITRE">
          <Input value={form.mitre_technique} onChange={(event) => set("mitre_technique", event.target.value)} placeholder="Lừa đảo T1566" />
        </Field>
        <Field label={`Điểm rủi ro — ${form.risk_score}`}>
          <input type="range" min={0} max={100} value={form.risk_score} onChange={(event) => set("risk_score", Number(event.target.value))} className="input h-9 cursor-pointer accent-brand-500" />
        </Field>
        <Field label={`Độ tin cậy — ${form.confidence}%`}>
          <input type="range" min={0} max={100} value={form.confidence} onChange={(event) => set("confidence", Number(event.target.value))} className="input h-9 cursor-pointer accent-brand-500" />
        </Field>
      </form>
    </Modal>
  );
}
