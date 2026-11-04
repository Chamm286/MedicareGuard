"use client";

import { useEffect, useState } from "react";
import { BarChart3, CalendarClock, Download, FileJson, FileSpreadsheet, FileText, Mail, Plus, RefreshCw, Send, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { api, apiDownload, useApi } from "@/lib/api";
import { cn, formatDate, titleCase } from "@/lib/utils";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, ConfirmDialog, ErrorState, Field, Input, Modal, PageHeader, Select, Skeleton, StatCard, StatusBadge } from "@/components/ui";

const TYPE_ICONS: Record<string, any> = {
  executive: ShieldCheck,
  threat: BarChart3,
  incident: FileText,
  compliance: FileSpreadsheet,
  vulnerability: ShieldCheck,
  firewall: FileText,
};

const FORMAT_ICONS: Record<string, any> = { pdf: FileText, csv: FileSpreadsheet, json: FileJson };

export default function ReportsPage() {
  const { success, error: toastError } = useToast();
  const templates = useApi<any>("/reports/templates");
  const schedules = useApi<any>("/reports/schedules");
  const { data, loading, error, refetch, refreshing } = useApi<any>("/reports?limit=20", { refreshInterval: 60000 });
  const [generateOpen, setGenerateOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [preset, setPreset] = useState<{ type?: string; format?: string }>({});
  const [days, setDays] = useState(30);
  const [deleting, setDeleting] = useState<any>(null);
  const [deletingSchedule, setDeletingSchedule] = useState<any>(null);

  const reports = data?.data || [];
  const tmpl = templates.data?.data || [];
  const scheduled = schedules.data?.data || [];

  const download = async (kind: "pdf" | "csv" | "json") => {
    try {
      await apiDownload(`/reports/export/${kind}?days=${days}`, `medicareguard-security-report-${days}d.${kind}`);
      success("Xuất thành công", `Báo cáo ${kind.toUpperCase()} của bạn đã được tải xuống.`);
      refetch();
    } catch (err) {
      toastError("Xuất thất bại", err instanceof Error ? err.message : "Không thể tạo báo cáo");
    }
  };

  const openGenerate = (type?: string, format?: string) => {
    setPreset({ type, format });
    setGenerateOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Báo cáo & Phân tích"
        subtitle="Các cuộc họp giao ban điều hành, đánh giá bối cảnh mối đe dọa và bằng chứng tuân thủ theo yêu cầu"
        icon={FileText}
        badge={<Badge tone="info" dot>{reports.length} đã tạo</Badge>}
        actions={
          <>
            <Button icon={RefreshCw} onClick={refetch} loading={refreshing}>Làm mới</Button>
            <Button icon={CalendarClock} onClick={() => setScheduleOpen(true)}>Lên lịch</Button>
            <Button variant="primary" icon={Plus} onClick={() => openGenerate()}>Tạo báo cáo</Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {loading && !data ? (
          Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-[112px] rounded-xl" />)
        ) : (
          <>
            <StatCard label="Báo cáo được tạo" value={reports.length} hint="Trên tất cả các mẫu" icon={FileText} tone="brand" />
            <StatCard label="Mẫu báo cáo" value={tmpl.length} hint="Mẫu sẵn có cho hội đồng" icon={Sparkles} tone="cyan" />
            <StatCard label="Gửi theo lịch" value={scheduled.length} hint="Nhịp tự động" icon={CalendarClock} tone="success" />
            <StatCard label="Lần xuất cuối cùng" value={reports[0] ? formatDate(reports[0].created_at, { day: "2-digit", month: "short" }) : "—"} hint={reports[0]?.name || "Chưa có báo cáo"} icon={Download} tone="warning" />
          </>
        )}
      </div>

      <Card className="mb-4 overflow-hidden">
        <div className="flex flex-wrap items-end gap-3 p-4">
          <div className="flex-1">
            <p className="text-[9px] uppercase tracking-[0.16em] text-slate-600">Xuất theo yêu cầu</p>
            <h2 className="mt-1 font-display text-sm font-semibold text-slate-200">Xây dựng báo cáo bảo mật từ dữ liệu đo từ xa trực tiếp</h2>
            <p className="mt-0.5 text-[10.5px] text-slate-600">Chọn cửa sổ báo cáo, sau đó xuất sang định dạng mà các bên liên quan của bạn cần.</p>
          </div>
          <Select value={days} onChange={(event) => setDays(Number(event.target.value))} className="w-32">
            <option value={7}>7 ngày qua</option>
            <option value={30}>30 ngày qua</option>
            <option value={90}>90 ngày qua</option>
            <option value={365}>365 ngày qua</option>
          </Select>
          <div className="flex gap-2">
            <Button icon={FileText} onClick={() => download("pdf")}>PDF</Button>
            <Button icon={FileSpreadsheet} onClick={() => download("csv")}>CSV</Button>
            <Button icon={FileJson} onClick={() => download("json")}>JSON</Button>
          </div>
        </div>
      </Card>

      <div className="mb-4 grid gap-4 xl:grid-cols-3">
        <div className="grid gap-3 sm:grid-cols-2 xl:col-span-2">
          {tmpl.map((template: any) => {
            const Icon = TYPE_ICONS[template.type || template.id] || FileText;
            return (
              <Card key={template.id} className="panel-hover flex flex-col p-4">
                <div className="flex items-start justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-400/20 bg-brand-500/10 text-brand-300">
                    <Icon className="h-4 w-4" />
                  </div>
                  <Badge tone="info">{titleCase(template.cadence)}</Badge>
                </div>
                <h3 className="mt-3 font-display text-[13px] font-semibold text-slate-100">{template.name}</h3>
                <p className="mt-1 line-clamp-2 text-[10.5px] leading-relaxed text-slate-600">{template.description}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {(template.formats || []).map((format: string) => <Badge key={format}>{format.toUpperCase()}</Badge>)}
                </div>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <span className="text-[9px] text-slate-700">{template.id}</span>
                  <Button size="sm" variant="ghost" onClick={() => openGenerate(template.id, template.formats?.[0] || "pdf")}>Tạo <Download className="h-3 w-3" /></Button>
                </div>
              </Card>
            );
          })}
          {!templates.loading && !tmpl.length && (
            <Card className="sm:col-span-2"><div className="py-10 text-center text-xs text-slate-600">Chưa có mẫu nào</div></Card>
          )}
        </div>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-200">Gửi theo lịch</h2>
              <p className="mt-0.5 text-[11px] text-slate-600">Phân phối báo cáo tự động</p>
            </div>
            <Button size="sm" icon={Plus} onClick={() => setScheduleOpen(true)}>Thêm</Button>
          </div>
          <div className="mt-3 space-y-2">
            {scheduled.map((schedule: any) => {
              const value = typeof schedule.value === "string" ? JSON.parse(schedule.value) : schedule.value || {};
              return (
                <div key={schedule.id} className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-medium text-slate-300">{titleCase(value.template || "executive")} · {titleCase(value.cadence || "weekly")}</p>
                      <p className="mt-0.5 truncate text-[9px] text-slate-600">{value.recipients?.join(", ") || "Chưa cấu hình người nhận"}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge tone={value.enabled === false ? "neutral" : "low"}>{value.enabled === false ? "Tạm dừng" : "Hoạt động"}</Badge>
                      <button onClick={() => setDeletingSchedule(schedule)} className="rounded p-1 text-slate-700 transition hover:text-critical" aria-label="Xóa lịch trình"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
            {!scheduled.length && (
              <div className="rounded-xl border border-dashed border-white/[0.07] p-6 text-center">
                <Mail className="mx-auto h-5 w-5 text-slate-700" />
                <p className="mt-2 text-[10px] text-slate-600">Không có báo cáo theo lịch trình</p>
                <Button size="sm" className="mt-2" onClick={() => setScheduleOpen(true)}>Tạo lịch trình</Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-white/[0.05] p-3.5">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-sm font-semibold text-slate-200">Thư viện báo cáo</h2>
            <Badge>{data?.pagination?.total || 0}</Badge>
          </div>
          <span className="text-[9px] text-slate-700">Được giữ lại để làm bằng chứng kiểm toán</span>
        </div>
        {error && !data ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-white/[0.04] text-[9px] uppercase tracking-[0.14em] text-slate-600">
                  <th className="px-4 py-2.5 font-medium">Báo cáo</th>
                  <th className="px-4 py-2.5 font-medium">Loại</th>
                  <th className="px-4 py-2.5 font-medium">Định dạng</th>
                  <th className="px-4 py-2.5 font-medium">Trạng thái</th>
                  <th className="px-4 py-2.5 font-medium">Được tạo bởi</th>
                  <th className="px-4 py-2.5 font-medium">Tạo</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {loading && !data && Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}><td colSpan={7} className="px-4 py-3"><Skeleton className="h-6 w-full" /></td></tr>
                ))}
                {reports.map((report: any) => {
                  const Icon = FORMAT_ICONS[report.format] || FileText;
                  return (
                    <tr key={report.id} className="border-b border-white/[0.03] transition hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 shrink-0 text-brand-300" />
                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-medium text-slate-200">{report.name}</p>
                            <p className="truncate text-[9px] text-slate-600">{report.summary || "Báo cáo vận hành an ninh"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5"><Badge>{titleCase(report.type)}</Badge></td>
                      <td className="px-4 py-2.5"><span className="font-mono text-[9.5px] uppercase text-slate-500">{report.format}</span></td>
                      <td className="px-4 py-2.5"><StatusBadge status={report.status} /></td>
                      <td className="px-4 py-2.5 text-[10px] text-slate-500">{report.created_by_name || "Hệ thống"}</td>
                      <td className="px-4 py-2.5 text-[9.5px] text-slate-600">{formatDate(report.created_at)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" icon={Download} onClick={async () => {
                            try {
                              await apiDownload(`/reports/${report.id}/download`, `${report.name.replace(/[^a-z0-9]/gi, "-")}.${report.format}`);
                              success("Bắt đầu tải xuống", report.name);
                            } catch (err) {
                              toastError("Tải xuống thất bại", err instanceof Error ? err.message : "Lỗi không xác định");
                            }
                          }}>Tải xuống</Button>
                          <button onClick={() => setDeleting(report)} className="rounded p-1.5 text-slate-700 transition hover:text-critical" aria-label="Xóa báo cáo"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!loading && !reports.length && (
                  <tr><td colSpan={7} className="px-4 py-14 text-center">
                    <FileText className="mx-auto h-7 w-7 text-slate-700" />
                    <p className="mt-2 text-xs text-slate-500">Chưa có báo cáo nào được tạo</p>
                    <Button size="sm" className="mt-3" onClick={() => openGenerate()}>Tạo báo cáo đầu tiên</Button>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <GenerateModal open={generateOpen} onClose={() => setGenerateOpen(false)} preset={preset} templates={tmpl} onCreated={() => { setGenerateOpen(false); refetch(); }} />
      <ScheduleModal open={scheduleOpen} onClose={() => setScheduleOpen(false)} templates={tmpl} onCreated={() => { setScheduleOpen(false); schedules.refetch(); }} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await api(`/reports/${deleting.id}`, { method: "DELETE" });
            success("Đã xóa báo cáo", deleting.name);
            setDeleting(null);
            refetch();
          } catch (err) {
            toastError("Xóa thất bại", err instanceof Error ? err.message : "Lỗi không xác định");
          }
        }}
        title="Xóa báo cáo?"
        message={`"${deleting?.name}" sẽ bị xóa vĩnh viễn khỏi thư viện báo cáo.`}
        confirmLabel="Xóa báo cáo"
        danger
      />

      <ConfirmDialog
        open={Boolean(deletingSchedule)}
        onClose={() => setDeletingSchedule(null)}
        onConfirm={async () => {
          if (!deletingSchedule) return;
          try {
            await api(`/reports/schedules/${deletingSchedule.id}`, { method: "DELETE" });
            success("Đã xóa lịch trình", "Báo cáo sẽ không còn được gửi tự động.");
            setDeletingSchedule(null);
            schedules.refetch();
          } catch (err) {
            toastError("Không thể xóa lịch trình", err instanceof Error ? err.message : "Lỗi không xác định");
          }
        }}
        title="Xóa lịch trình?"
        message="Việc phân phối theo lịch trình cho báo cáo này sẽ dừng ngay lập tức."
        confirmLabel="Xóa lịch biểu"
        danger
      />
    </div>
  );
}

function GenerateModal({ open, onClose, preset, templates, onCreated }: { open: boolean; onClose: () => void; preset: { type?: string; format?: string }; templates: any[]; onCreated: () => void }) {
  const { success, error: toastError } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "Báo cáo vận hành an ninh", type: "executive", format: "pdf", days: 30 });

  useEffect(() => {
    if (open) {
      const template = templates.find((item) => item.id === preset.type);
      setForm({ name: template?.name || "Báo cáo vận hành an ninh", type: preset.type || "executive", format: preset.format || "pdf", days: 30 });
    }
  }, [open, preset, templates]);

  const set = (key: string, value: string | number) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    setSaving(true);
    try {
      await api("/reports/generate", { method: "POST", body: { ...form, days: Number(form.days) } });
      success("Đã tạo báo cáo", `${form.name} đã sẵn sàng trong thư viện.`);
      onCreated();
    } catch (err) {
      toastError("Tạo báo cáo thất bại", err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tạo báo cáo bảo mật"
      description="Báo cáo được tạo từ phép đo từ xa PostgreSQL trực tiếp."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button variant="primary" icon={Sparkles} loading={saving} onClick={submit}>Tạo báo cáo</Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="Tên báo cáo">
          <Input value={form.name} onChange={(event) => set("name", event.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Bản mẫu">
            <Select value={form.type} onChange={(event) => set("type", event.target.value)}>
              {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
            </Select>
          </Field>
          <Field label="Định dạng">
            <Select value={form.format} onChange={(event) => set("format", event.target.value)}>
              <option value="pdf">PDF</option>
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </Select>
          </Field>
          <Field label="Khoảng thời gian">
            <Select value={form.days} onChange={(event) => set("days", Number(event.target.value))}>
              <option value={7}>7 ngày</option>
              <option value={30}>30 ngày</option>
              <option value={90}>90 ngày</option>
              <option value={365}>365 ngày</option>
            </Select>
          </Field>
        </div>
      </div>
    </Modal>
  );
}

function ScheduleModal({ open, onClose, templates, onCreated }: { open: boolean; onClose: () => void; templates: any[]; onCreated: () => void }) {
  const { success, error: toastError } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", template: "executive", cadence: "weekly", recipients: "", format: "pdf" });

  useEffect(() => {
    if (open) setForm({ name: "", template: "executive", cadence: "weekly", recipients: "", format: "pdf" });
  }, [open]);

  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api("/reports/schedule", { method: "POST", body: { ...form, recipients: form.recipients.split(",").map((item) => item.trim()).filter(Boolean) } });
      success("Đã tạo lịch trình", "Báo cáo sẽ được gửi tự động.");
      onCreated();
    } catch (err) {
      toastError("Không thể tạo lịch trình", err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Lên lịch gửi báo cáo"
      description="Cung cấp báo cáo bảo mật định kỳ cho các bên liên quan."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button variant="primary" icon={Send} loading={saving} onClick={submit}>Tạo lịch trình</Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="Tên lịch trình">
          <Input value={form.name} onChange={(event) => set("name", event.target.value)} placeholder="Ví dụ: Tóm tắt điều hành hàng tuần" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Bản mẫu">
            <Select value={form.template} onChange={(event) => set("template", event.target.value)}>
              {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
            </Select>
          </Field>
          <Field label="Nhịp">
            <Select value={form.cadence} onChange={(event) => set("cadence", event.target.value)}>
              <option value="daily">Hằng ngày</option>
              <option value="weekly">Hàng tuần</option>
              <option value="monthly">Hàng tháng</option>
            </Select>
          </Field>
          <Field label="Định dạng">
            <Select value={form.format} onChange={(event) => set("format", event.target.value)}>
              <option value="pdf">PDF</option>
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </Select>
          </Field>
          <Field label="Người nhận" hint="Phân cách bằng dấu phẩy">
            <Input value={form.recipients} onChange={(event) => set("recipients", event.target.value)} placeholder="ciso@medicareguard.io" />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
