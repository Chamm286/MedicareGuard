"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  ChevronUp,
  Clock,
  Flame,
  MessageSquare,
  Send,
  ShieldAlert,
  Siren,
  UserRound,
  Users,
} from "lucide-react";
import { api, useApi } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { cn, formatDate, relativeTime, timeUntil, titleCase } from "@/lib/utils";
import { DataTable, type Column } from "@/components/DataTable";
import { useToast } from "@/components/toast";
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  ErrorState,
  Field,
  KeyValue,
  Modal,
  ProgressBar,
  SeverityBadge,
  Skeleton,
  StatusBadge,
  Textarea,
  Select,
} from "@/components/ui";

const STATUSES = ["open", "investigating", "contained", "eradicated", "recovered", "resolved", "closed"];

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const { data, loading, error, refetch } = useApi<any>(`/incidents/${id}`);
  const timeline = useApi<any>(`/incidents/${id}/timeline`);
  const users = useApi<any>("/users?limit=100");
  const [note, setNote] = useState("");
  const [posting, setPosting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [rootCause, setRootCause] = useState("");
  const [resolution, setResolution] = useState("");
  const [escalationReason, setEscalationReason] = useState("");

  const incident = data?.data;
  const currentUser = getUser();
  const canWrite = useMemo(() => !["viewer"].includes(String(currentUser?.role || "").toLowerCase()), [currentUser?.role]);

  useEffect(() => {
    if (incident) {
      setRootCause(incident.root_cause || "");
      setResolution("");
    }
  }, [incident?.root_cause]);

  const sla = useMemo(() => {
    if (!incident?.sla_due_at || !incident?.detected_at) return { pct: 0, due: null as string | null, breached: false };
    const start = new Date(incident.detected_at).getTime();
    const end = new Date(incident.sla_due_at).getTime();
    const pct = Math.min(100, Math.max(0, ((Date.now() - start) / Math.max(end - start, 1)) * 100));
    return { pct, due: timeUntil(incident.sla_due_at), breached: pct >= 100 && !incident.resolved_at };
  }, [incident?.sla_due_at, incident?.detected_at, incident?.resolved_at]);

  const updateStatus = async (status: string) => {
    setUpdating(true);
    try {
      await api(`/incidents/${id}/status`, { method: "PATCH", body: { status } });
      success("Đã cập nhật trạng thái", `Sự cố đã chuyển sang ${titleCase(status)}.`);
      refetch();
      timeline.refetch();
    } catch (err) {
      toastError("Cập nhật thất bại", err instanceof Error ? err.message : "Không thể đổi trạng thái");
    } finally {
      setUpdating(false);
    }
  };

  const assign = async (assigneeId: string) => {
    setUpdating(true);
    try {
      await api(`/incidents/${id}/assign`, { method: "POST", body: { assigneeId: assigneeId || null } });
      success("Đã cập nhật trưởng nhóm sự cố");
      refetch();
    } catch (err) {
      toastError("Phân công thất bại", err instanceof Error ? err.message : "Không thể phân công sự cố");
    } finally {
      setUpdating(false);
    }
  };

  const addNote = async (event: FormEvent) => {
    event.preventDefault();
    if (!note.trim()) return;
    setPosting(true);
    try {
      await api(`/incidents/${id}/timeline`, { method: "POST", body: { message: note, kind: "note" } });
      setNote("");
      timeline.refetch();
      success("Đã cập nhật dòng thời gian");
    } catch (err) {
      toastError("Không thể thêm ghi chú", err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setPosting(false);
    }
  };

  const escalate = async () => {
    setEscalating(true);
    try {
      await api(`/incidents/${id}/escalate`, { method: "POST", body: { reason: escalationReason || "Sự cố được SOC leo thang" } });
      success("Đã leo thang sự cố", "Mức ưu tiên và mức độ nghiêm trọng đã tăng. SLA đặt lại thành 4 giờ.");
      setEscalateOpen(false);
      refetch();
      timeline.refetch();
    } catch (err) {
      toastError("Leo thang thất bại", err instanceof Error ? err.message : "Không thể leo thang sự cố");
    } finally {
      setEscalating(false);
    }
  };

  const resolve = async () => {
    setResolving(true);
    try {
      await api(`/incidents/${id}/resolve`, { method: "POST", body: { rootCause, resolution: resolution || "Sự cố được SOC xử lý" } });
      success("Đã xử lý sự cố", "Kết quả đã được ghi lại và đồng hồ SLA đã dừng.");
      setResolveOpen(false);
      refetch();
      timeline.refetch();
    } catch (err) {
      toastError("Xử lý thất bại", err instanceof Error ? err.message : "Không thể xử lý sự cố");
    } finally {
      setResolving(false);
    }
  };

  if (loading && !incident) {
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

  if (error && !incident) return <Card><ErrorState message={error} onRetry={refetch} /></Card>;

  const entries = timeline.data?.data || [];
  const linkedAlerts = incident.alerts || [];
  const alertColumns: Column[] = [
    { key: "title", header: "Cảnh báo tương quan", render: (row) => <span className="text-[11.5px] text-slate-300">{row.title}</span> },
    { key: "severity", header: "Mức độ", width: "100px", render: (row) => <SeverityBadge severity={row.severity} /> },
    { key: "status", header: "Trạng thái", width: "110px", render: (row) => <StatusBadge status={row.status} /> },
    { key: "detected_at", header: "Phát hiện", width: "100px", render: (row) => <span className="text-[10px] text-slate-600">{relativeTime(row.detected_at)}</span> },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] text-slate-600">
          <Link href="/incidents" className="flex items-center gap-1 transition hover:text-brand-300"><ArrowLeft className="h-3 w-3" /> Danh sách sự cố</Link>
          <span className="text-slate-800">/</span>
          <span className="font-mono text-slate-500">{incident.incident_key}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/ai?prompt=${encodeURIComponent(`Tóm tắt sự cố ${incident.incident_key}: "${incident.title}" (${incident.severity}, ${incident.status}). Các bước ứng phó tiếp theo là gì?`)}`}>
            <Button icon={Bot}>Hỏi AI</Button>
          </Link>
          <Button icon={ChevronUp} onClick={() => setEscalateOpen(true)} disabled={!canWrite}>Leo thang</Button>
          <Button variant="primary" icon={CheckCircle2} onClick={() => setResolveOpen(true)} disabled={!canWrite}>Xử lý</Button>
        </div>
      </div>

      <Card className="mb-4 overflow-hidden">
        <div className={cn("h-1 w-full", incident.severity === "critical" ? "bg-gradient-to-r from-critical via-rose-500 to-transparent" : incident.severity === "high" ? "bg-gradient-to-r from-high to-transparent" : "bg-gradient-to-r from-brand-500 to-transparent")} />
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] text-slate-500">{incident.incident_key}</span>
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />
            <Badge tone={incident.priority === "P1" ? "critical" : incident.priority === "P2" ? "high" : "info"}>{incident.priority}</Badge>
            <Badge>{titleCase(incident.category)}</Badge>
            <span className="ml-auto flex items-center gap-1.5 text-[10px] text-slate-600"><Clock className="h-3 w-3" /> Phát hiện {formatDate(incident.detected_at)}</span>
          </div>
          <h1 className="mt-3 font-display text-xl font-semibold tracking-tight text-white md:text-2xl">{incident.title}</h1>
          <p className="mt-2 max-w-4xl text-[13px] leading-relaxed text-slate-400">{incident.description || "Chưa ghi nhận mô tả sự cố."}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
              <p className="text-[9px] uppercase tracking-[0.14em] text-slate-600">SLA</p>
              <p className={cn("mt-1 text-[12px] font-medium", sla.breached ? "text-critical" : "text-slate-200")}>{incident.resolved_at ? "Đạt" : sla.due || "—"}</p>
            </div>
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
              <p className="text-[9px] uppercase tracking-[0.14em] text-slate-600">Tác động</p>
              <p className="mt-1 truncate text-[12px] font-medium text-slate-200">{incident.impact || "Chưa đánh giá"}</p>
            </div>
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
              <p className="text-[9px] uppercase tracking-[0.14em] text-slate-600">Trưởng nhóm sự cố</p>
              <p className="mt-1 truncate text-[12px] font-medium text-slate-200">{incident.assignee_name || "Chưa phân công"}</p>
            </div>
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
              <p className="text-[9px] uppercase tracking-[0.14em] text-slate-600">Cảnh báo được liên kết</p>
              <p className="mt-1 text-[12px] font-medium text-slate-200">{linkedAlerts.length} liên quan</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3">
              <div>
                <h2 className="font-display text-sm font-semibold text-slate-200">Dòng thời gian phản hồi</h2>
                <p className="mt-0.5 text-[11px] text-slate-600">Ghi chú phát hiện, phân loại, ngăn chặn và phân tích</p>
              </div>
              <Badge>{entries.length} sự kiện</Badge>
            </div>
            <div className="space-y-4 p-4">
              {entries.length === 0 && <p className="py-6 text-center text-xs text-slate-600">Chưa có sự kiện dòng thời gian nào.</p>}
              {entries.map((entry: any, index: number) => (
                <div key={`${entry.created_at}-${index}`} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={cn("flex h-7 w-7 items-center justify-center rounded-full border", entry.kind === "containment" || entry.kind === "resolution" ? "border-low/25 bg-low/10 text-low" : entry.kind === "escalation" ? "border-critical/25 bg-critical/10 text-critical" : "border-brand-400/20 bg-brand-500/10 text-brand-300")}>
                      {entry.kind === "detection" ? <Siren className="h-3 w-3" /> : entry.kind === "containment" ? <ShieldAlert className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                    </span>
                    {index < entries.length - 1 && <div className="mt-1 w-px flex-1 bg-white/[0.06]" />}
                  </div>
                  <div className="min-w-0 flex-1 pb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-medium text-slate-300">{entry.actor || "Hệ thống"}</p>
                      <Badge tone={entry.kind === "escalation" ? "critical" : entry.kind === "resolution" ? "low" : "info"} className="text-[8px]">{titleCase(entry.kind || entry.type || "event")}</Badge>
                      <span className="text-[9px] text-slate-700">{relativeTime(entry.created_at)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-slate-500">{entry.message}</p>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={addNote} className="border-t border-white/[0.05] p-3">
              <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Các hành động ngăn chặn tài liệu, bằng chứng hoặc biên bản bàn giao…" className="min-h-[74px] text-xs" disabled={!canWrite} />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[9px] text-slate-700">Các mục nhập dòng thời gian được giữ lại để kiểm tra.</span>
                <Button size="sm" variant="primary" icon={Send} loading={posting} disabled={!note.trim() || !canWrite}>Thêm mục</Button>
              </div>
            </form>
          </Card>

          <Card>
            <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3">
              <div>
                <h2 className="font-display text-sm font-semibold text-slate-200">Cảnh báo tương quan</h2>
                <p className="mt-0.5 text-[11px] text-slate-600">Các phát hiện liên quan đến sự cố này</p>
              </div>
              <Badge>{linkedAlerts.length}</Badge>
            </div>
            <DataTable
              rows={linkedAlerts}
              columns={alertColumns}
              rowKey="id"
              emptyTitle="Không có cảnh báo được liên kết"
              emptyMessage="Sự cố này không có phát hiện tương quan trực tiếp."
              onRowClick={(row) => router.push(`/alerts/${row.id}`)}
            />
          </Card>

          {(incident.root_cause || incident.impact) && (
            <Card className="p-4">
              <h2 className="font-display text-sm font-semibold text-slate-200">Nguyên nhân và tác động gốc rễ</h2>
              <div className="mt-2">
                <KeyValue label="Nguyên nhân gốc rễ" value={incident.root_cause || "Chưa xác định"} />
                <KeyValue label="Tác động kinh doanh" value={incident.impact || "Chưa đánh giá"} />
                <KeyValue label="Đã giải quyết tại" value={incident.resolved_at ? formatDate(incident.resolved_at) : "Đang mở"} />
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-sm font-semibold text-slate-200">Đồng hồ SLA</h2>
                <p className="mt-0.5 text-[11px] text-slate-600">Mục tiêu phản hồi {incident.priority}</p>
              </div>
              <Clock className={cn("h-4 w-4", sla.breached ? "text-critical" : "text-brand-400")} />
            </div>
            <div className="mt-4 flex items-end justify-between">
              <p className={cn("font-display text-2xl font-semibold", sla.breached ? "text-critical" : "text-white")}>{incident.resolved_at ? "Đạt" : sla.due || "—"}</p>
              <span className="text-[10px] text-slate-600">{Math.round(sla.pct)}% trôi qua</span>
            </div>
            <ProgressBar value={sla.pct} barClassName={sla.breached ? "from-critical to-rose-400" : sla.pct > 75 ? "from-high to-amber-400" : "from-brand-500 to-cyan-400"} className="mt-2 h-2" />
            <div className="mt-2 flex items-center justify-between text-[9px] text-slate-700">
              <span>Phát hiện {formatDate(incident.detected_at, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              <span>Hạn {formatDate(incident.sla_due_at, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="font-display text-sm font-semibold text-slate-200">Hành động phản hồi</h2>
            <div className="mt-3 space-y-3">
              <Field label="Trạng thái">
                <Select value={incident.status} onChange={(event) => updateStatus(event.target.value)} disabled={!canWrite || updating}>
                  {STATUSES.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}
                </Select>
              </Field>
              <Field label="Trưởng nhóm sự cố">
                <Select value={incident.assignee_id || ""} onChange={(event) => assign(event.target.value)} disabled={!canWrite || updating}>
                  <option value="">Chưa phân công</option>
                  {(users.data?.data || []).map((user: any) => <option key={user.id} value={user.id}>{user.fullName}</option>)}
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" onClick={() => updateStatus("contained")} disabled={!canWrite || updating}>Cô lập</Button>
                <Button size="sm" onClick={() => updateStatus("eradicated")} disabled={!canWrite || updating}>Diệt trừ</Button>
              </div>
              <Button size="sm" variant="danger" className="w-full" icon={Flame} onClick={() => setEscalateOpen(true)} disabled={!canWrite}>Tăng mức độ ưu tiên</Button>
              <Button size="sm" variant="primary" className="w-full" icon={CheckCircle2} onClick={() => setResolveOpen(true)} disabled={!canWrite}>Giải quyết sự cố</Button>
              {!canWrite && <p className="text-center text-[9px] text-slate-700">Vai trò chỉ đọc. Yêu cầu một nhà phân tích hành động.</p>}
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="font-display text-sm font-semibold text-slate-200">Chi tiết sự cố</h2>
            <div className="mt-2">
              <KeyValue label="Mã sự cố" value={<span className="font-mono text-[10px]">{incident.incident_key}</span>} />
              <KeyValue label="Danh mục" value={titleCase(incident.category)} />
              <KeyValue label="Người báo cáo" value={incident.reporter_name || "Hệ thống"} />
              <KeyValue label="Người phụ trách" value={incident.assignee_name || "Chưa phân công"} />
              <KeyValue label="Tạo" value={formatDate(incident.created_at)} />
              <KeyValue label="Cập nhật" value={formatDate(incident.updated_at)} />
            </div>
            {incident.metadata?.assetId && (
              <Link href={`/assets/${incident.metadata.assetId}`} className="mt-3">
                <Button size="sm" className="w-full">Xem tài sản bị ảnh hưởng <ArrowUpRight className="h-3 w-3" /></Button>
              </Link>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="font-display text-sm font-semibold text-slate-200">Đội phản hồi</h2>
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2.5 rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5">
                <Avatar name={incident.assignee_name} email={incident.assignee_email} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-[11px] text-slate-300">{incident.assignee_name || "Chưa phân công"}</p>
                  <p className="text-[8.5px] uppercase tracking-wider text-slate-600">Trưởng nhóm sự cố</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5">
                <Avatar name={incident.reporter_name} email={incident.reporter_email} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-[11px] text-slate-300">{incident.reporter_name || "Hệ thống"}</p>
                  <p className="text-[8.5px] uppercase tracking-wider text-slate-600">Người báo cáo</p>
                </div>
              </div>
            </div>
            <Link href="/playbooks" className="mt-3 flex items-center justify-center gap-1 text-[10px] text-brand-300/80 transition hover:text-brand-200">
              Mở cẩm nang phản hồi <ArrowUpRight className="h-3 w-3" />
            </Link>
          </Card>
        </div>
      </div>

      <Modal
        open={escalateOpen}
        onClose={() => setEscalateOpen(false)}
        title="Leo thang sự cố"
        description="Điều này sẽ tăng mức độ ưu tiên lên một cấp, tăng mức độ nghiêm trọng và đặt lại SLA thành 4 giờ."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEscalateOpen(false)}>Hủy</Button>
            <Button variant="danger" loading={escalating} onClick={escalate}>Leo thang ngay</Button>
          </>
        }
      >
        <Field label="Lý do leo thang">
          <Textarea value={escalationReason} onChange={(event) => setEscalationReason(event.target.value)} placeholder="Tại sao điều này cần sự chú ý của lãnh đạo điều hành/IR?" />
        </Field>
      </Modal>

      <Modal
        open={resolveOpen}
        onClose={() => setResolveOpen(false)}
        title="Giải quyết sự cố"
        description="Ghi lại nguyên nhân gốc rễ và giải pháp cuối cùng cho quá trình kiểm tra."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setResolveOpen(false)}>Hủy</Button>
            <Button variant="primary" loading={resolving} onClick={resolve}>Giải quyết sự cố</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nguyên nhân gốc rễ">
            <Textarea value={rootCause} onChange={(event) => setRootCause(event.target.value)} placeholder="Điều gì đã gây ra sự cố? Cấu hình sai, CVE chưa được vá, xâm phạm thông tin xác thực…" />
          </Field>
          <Field label="Tóm tắt xử lý">
            <Textarea value={resolution} onChange={(event) => setResolution(event.target.value)} placeholder="Các bước ngăn chặn, diệt trừ và phục hồi đã được thực hiện…" />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
