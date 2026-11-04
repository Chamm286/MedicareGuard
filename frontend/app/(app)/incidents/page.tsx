"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Clock, Download, Plus, RefreshCw, Siren, Timer, TriangleAlert, Users } from "lucide-react";
import { api, apiDownload, buildQuery, useApi, useDebounced } from "@/lib/api";
import { cn, formatNumber, relativeTime, timeUntil, titleCase } from "@/lib/utils";
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
  SearchInput,
  Select,
  SeverityBadge,
  Skeleton,
  StatCard,
  StatusBadge,
  Textarea,
} from "@/components/ui";

const SEVERITIES = ["critical", "high", "medium", "low"];
const STATUSES = ["open", "investigating", "contained", "eradicated", "recovered", "resolved", "closed"];
const PRIORITIES = ["P1", "P2", "P3", "P4"];

export default function IncidentsPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [overdue, setOverdue] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const query = useDebounced(search, 300);

  const stats = useApi<any>("/incidents/stats", { refreshInterval: 60000 });
  const listPath = useMemo(
    () => `/incidents${buildQuery({ page, limit: 12, q: query || undefined, severity: severity || undefined, status: status || undefined, priority: priority || undefined, overdue: overdue ? "true" : undefined, sort: "detected_at", order: "desc" })}`,
    [page, query, severity, status, priority, overdue],
  );
  const { data, loading, error, refetch, refreshing } = useApi<any>(listPath, { refreshInterval: 45000 });

  useEffect(() => setPage(1), [query, severity, status, priority, overdue]);

  const statsData = stats.data?.data;
  const byStatus = statsData?.byStatus || [];
  const bySeverity = statsData?.bySeverity || [];
  const byPriority = statsData?.byPriority || [];
  const statusCount = (name: string) => byStatus.find((item: any) => item.status === name)?.total || 0;
  const severityCount = (name: string) => bySeverity.find((item: any) => item.severity === name)?.total || 0;
  const priorityCount = (name: string) => byPriority.find((item: any) => item.priority === name)?.total || 0;
  const openTotal = statusCount("open") + statusCount("investigating") + statusCount("contained");

  const exportCsv = async () => {
    setExporting(true);
    try {
      await apiDownload(`/incidents/export${buildQuery({ q: query || undefined, severity: severity || undefined, status: status || undefined, priority: priority || undefined })}`, `medicareguard-incidents-${Date.now()}.csv`);
      success("Xuất thành công", "Sổ đăng ký sự cố đã được xuất dưới dạng CSV.");
    } catch (err) {
      toastError("Xuất thất bại", err instanceof Error ? err.message : "Không thể xuất sự cố");
    } finally {
      setExporting(false);
    }
  };

  const columns: Column[] = [
    {
      key: "incident_key",
      header: "Sự cố",
      width: "170px",
      render: (row) => (
        <div>
          <p className="font-mono text-[9.5px] text-slate-500">{row.incident_key}</p>
          <p className="mt-0.5 text-[9px] uppercase tracking-wider text-slate-700">{titleCase(row.category || "uncategorised")}</p>
        </div>
      ),
    },
    {
      key: "title",
      header: "Bản tóm tắt",
      render: (row) => (
        <div className="min-w-0">
          <p className="max-w-[320px] truncate text-[12.5px] font-medium text-slate-200">{row.title}</p>
          <p className="mt-0.5 max-w-[320px] truncate text-[10px] text-slate-600">{row.impact || row.description || "Chưa ghi nhận tác động"}</p>
        </div>
      ),
    },
    { key: "severity", header: "Mức độ", width: "96px", render: (row) => <SeverityBadge severity={row.severity} /> },
    {
      key: "priority",
      header: "Ưu tiên",
      width: "84px",
      render: (row) => <span className={cn("font-mono text-[10.5px]", row.priority === "P1" ? "text-critical" : row.priority === "P2" ? "text-high" : "text-slate-500")}>{row.priority}</span>,
    },
    { key: "status", header: "Trạng thái", width: "116px", render: (row) => <StatusBadge status={row.status} /> },
    { key: "assignee", header: "Chỉ huy", width: "140px", render: (row) => <span className="text-[10.5px] text-slate-500">{row.assignee_name || <span className="text-slate-700">Chưa phân công</span>}</span> },
    {
      key: "sla_due_at",
      header: "SLA",
      width: "128px",
      render: (row) => {
        const due = timeUntil(row.sla_due_at);
        const breached = due?.startsWith("Quá hạn");
        return (
          <div>
            <p className={cn("flex items-center gap-1 text-[10px]", breached ? "text-critical" : "text-slate-400")}>
              <Clock className="h-2.5 w-2.5" /> {due || "—"}
            </p>
            <p className="mt-0.5 text-[8.5px] text-slate-700">{row.resolved_at ? "đã xử lý" : "mục tiêu"}</p>
          </div>
        );
      },
    },
    { key: "detected_at", header: "Phát hiện", width: "90px", render: (row) => <span className="text-[9.5px] text-slate-600">{relativeTime(row.detected_at)}</span> },
    { key: "open", header: "", width: "34px", render: () => <ArrowUpRight className="h-3.5 w-3.5 text-slate-700" /> },
  ];

  return (
    <div>
      <PageHeader
        title="Ứng phó sự cố"
        subtitle="Ngăn chặn, xóa bỏ và phục hồi sau các sự cố bảo mật với trách nhiệm giải trình SLA"
        icon={Siren}
        badge={<Badge tone="critical" dot>{openTotal} đang hoạt động</Badge>}
        actions={
          <>
            <Button icon={RefreshCw} onClick={() => { refetch(); stats.refetch(); }} loading={refreshing}>Làm mới</Button>
            <Button icon={Download} onClick={exportCsv} loading={exporting}>Xuất</Button>
            <Button variant="primary" icon={Plus} onClick={() => setCreateOpen(true)}>Sự cố mới</Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.loading && !stats.data ? (
          Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-[112px] rounded-xl" />)
        ) : (
          <>
            <StatCard label="Sự cố đang hoạt động" value={formatNumber(openTotal)} hint={`${statusCount("investigating")} đang điều tra`} icon={Siren} tone="critical" />
            <StatCard label="Ưu tiên P1" value={formatNumber(priorityCount("P1"))} hint={`${severityCount("critical")} mức nghiêm trọng`} icon={TriangleAlert} tone="warning" />
            <StatCard label="Đã cô lập" value={formatNumber(statusCount("contained") + statusCount("eradicated"))} hint={`${statusCount("recovered")} đã phục hồi`} icon={Users} tone="brand" />
            <StatCard label="Thời gian trung bình để giải quyết" value={`${statsData?.mttr?.avg_hours || 0} giờ`} hint={`${statsData?.mttr?.resolved || 0} trường hợp đã xử lý`} icon={Timer} tone="success" />
          </>
        )}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        {PRIORITIES.map((level) => {
          const total = priorityCount(level);
          const pct = (total / Math.max(priorityCount("P1") + priorityCount("P2") + priorityCount("P3") + priorityCount("P4"), 1)) * 100;
          return (
            <button key={level} onClick={() => setPriority(priority === level ? "" : level)} className={cn("panel panel-hover p-3 text-left", priority === level && "border-brand-400/30 bg-brand-500/[0.06]")}>
              <div className="flex items-center justify-between">
                <span className={cn("font-mono text-xs font-semibold", level === "P1" ? "text-critical" : level === "P2" ? "text-high" : "text-slate-400")}>{level}</span>
                <span className="text-[9px] text-slate-600">{total} trường hợp</span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div className={cn("h-full rounded-full", level === "P1" ? "bg-critical" : level === "P2" ? "bg-high" : level === "P3" ? "bg-medium" : "bg-low")} style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1.5 text-[9px] text-slate-700">{level === "P1" ? "SLA 4 giờ" : level === "P2" ? "SLA 12 giờ" : level === "P3" ? "SLA 48 giờ" : "SLA 72 giờ"}</p>
            </button>
          );
        })}
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.05] p-3.5">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-sm font-semibold text-slate-200">Đăng ký sự cố</h2>
            <Badge>{data?.pagination?.total || 0} trường hợp</Badge>
            <button onClick={() => setOverdue(!overdue)} className={cn("flex items-center gap-1 rounded-md border px-2 py-1 text-[9px] transition", overdue ? "border-critical/30 bg-critical/10 text-critical" : "border-white/[0.06] text-slate-500 hover:text-slate-300")}>
              <Clock className="h-2.5 w-2.5" /> SLA bị vi phạm
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Tìm kiếm mã, tiêu đề…" className="w-full sm:w-52" />
            <Select value={severity} onChange={(event) => setSeverity(event.target.value)} className="w-32">
              <option value="">Mức độ</option>
              {SEVERITIES.map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}
            </Select>
            <Select value={status} onChange={(event) => setStatus(event.target.value)} className="w-32">
              <option value="">Trạng thái</option>
              {STATUSES.map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}
            </Select>
            <Select value={priority} onChange={(event) => setPriority(event.target.value)} className="w-28">
              <option value="">Ưu tiên</option>
              {PRIORITIES.map((item) => <option key={item} value={item}>{item}</option>)}
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
            onRowClick={(row) => router.push(`/incidents/${row.id}`)}
            emptyTitle="Không có sự cố nào phù hợp với chế độ xem này"
            emptyMessage="Điều chỉnh bộ lọc hoặc mở một sự cố mới."
            footer={data?.pagination ? <Pagination page={data.pagination.page} pages={data.pagination.pages} total={data.pagination.total} limit={data.pagination.limit} onPage={setPage} /> : null}
          />
        )}
      </Card>

      <CreateIncidentModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); refetch(); stats.refetch(); }} />
    </div>
  );
}

function CreateIncidentModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { success, error: toastError } = useToast();
  const users = useApi<any>("/users?limit=100");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", severity: "high", priority: "P2", category: "malware", impact: "", assignee_id: "" });

  useEffect(() => {
    if (open) setForm({ title: "", description: "", severity: "high", priority: "P2", category: "malware", impact: "", assignee_id: "" });
  }, [open]);

  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await api("/incidents", { method: "POST", body: { ...form, assignee_id: form.assignee_id || undefined } });
      success("Đã tạo sự cố", "Trường hợp ứng phó đã được thêm vào sổ đăng ký sự cố.");
      onCreated();
    } catch (err) {
      toastError("Không thể tạo sự cố", err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tạo sự cố"
      description="Tạo trường hợp phản hồi với tính năng theo dõi SLA và trách nhiệm giải trình."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button variant="primary" loading={saving} onClick={submit}>Tạo sự cố</Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <Field label="Tiêu đề sự cố" className="md:col-span-2">
          <Input value={form.title} onChange={(event) => set("title", event.target.value)} placeholder="Ví dụ: Lọc dữ liệu bệnh nhân nghi ngờ thông qua API" required />
        </Field>
        <Field label="Mô tả" className="md:col-span-2">
          <Textarea value={form.description} onChange={(event) => set("description", event.target.value)} placeholder="Chuyện gì đã xảy ra, điều gì bị ảnh hưởng, tình trạng ngăn chặn hiện tại…" />
        </Field>
        <Field label="Mức độ">
          <Select value={form.severity} onChange={(event) => set("severity", event.target.value)}>{SEVERITIES.map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}</Select>
        </Field>
        <Field label="Ưu tiên">
          <Select value={form.priority} onChange={(event) => set("priority", event.target.value)}>{PRIORITIES.map((item) => <option key={item}>{item}</option>)}</Select>
        </Field>
        <Field label="Danh mục">
          <Select value={form.category} onChange={(event) => set("category", event.target.value)}>
            {["malware", "ransomware", "phishing", "data-breach", "vulnerability", "insider", "dos", "other"].map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}
          </Select>
        </Field>
        <Field label="Người phụ trách">
          <Select value={form.assignee_id} onChange={(event) => set("assignee_id", event.target.value)}>
            <option value="">Giao cho tôi</option>
            {(users.data?.data || []).map((user: any) => <option key={user.id} value={user.id}>{user.fullName}</option>)}
          </Select>
        </Field>
        <Field label="Tác động kinh doanh" className="md:col-span-2">
          <Textarea value={form.impact} onChange={(event) => set("impact", event.target.value)} placeholder="Sự an toàn của bệnh nhân, tính bảo mật, tính sẵn có, mức độ tiếp xúc với quy định…" />
        </Field>
      </form>
    </Modal>
  );
}
