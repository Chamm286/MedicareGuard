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
      success("Export ready", `Your ${kind.toUpperCase()} report has been downloaded.`);
      refetch();
    } catch (err) {
      toastError("Export failed", err instanceof Error ? err.message : "Unable to build report");
    }
  };

  const openGenerate = (type?: string, format?: string) => {
    setPreset({ type, format });
    setGenerateOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Executive briefings, threat landscape reviews and compliance evidence on demand"
        icon={FileText}
        badge={<Badge tone="info" dot>{reports.length} generated</Badge>}
        actions={
          <>
            <Button icon={RefreshCw} onClick={refetch} loading={refreshing}>Refresh</Button>
            <Button icon={CalendarClock} onClick={() => setScheduleOpen(true)}>Schedule</Button>
            <Button variant="primary" icon={Plus} onClick={() => openGenerate()}>Generate report</Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {loading && !data ? (
          Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-[112px] rounded-xl" />)
        ) : (
          <>
            <StatCard label="Reports generated" value={reports.length} hint="Across all templates" icon={FileText} tone="brand" />
            <StatCard label="Report templates" value={tmpl.length} hint="Board to operational" icon={Sparkles} tone="cyan" />
            <StatCard label="Scheduled deliveries" value={scheduled.length} hint="Automated cadence" icon={CalendarClock} tone="success" />
            <StatCard label="Last export" value={reports[0] ? formatDate(reports[0].created_at, { day: "2-digit", month: "short" }) : "—"} hint={reports[0]?.name || "No reports yet"} icon={Download} tone="warning" />
          </>
        )}
      </div>

      <Card className="mb-4 overflow-hidden">
        <div className="flex flex-wrap items-end gap-3 p-4">
          <div className="flex-1">
            <p className="text-[9px] uppercase tracking-[0.16em] text-slate-600">On-demand export</p>
            <h2 className="mt-1 font-display text-sm font-semibold text-slate-200">Build a security report from live telemetry</h2>
            <p className="mt-0.5 text-[10.5px] text-slate-600">Select a reporting window, then export to the format your stakeholders need.</p>
          </div>
          <Select value={days} onChange={(event) => setDays(Number(event.target.value))} className="w-32">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last 365 days</option>
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
                  <Button size="sm" variant="ghost" onClick={() => openGenerate(template.id, template.formats?.[0] || "pdf")}>Generate <Download className="h-3 w-3" /></Button>
                </div>
              </Card>
            );
          })}
          {!templates.loading && !tmpl.length && (
            <Card className="sm:col-span-2"><div className="py-10 text-center text-xs text-slate-600">No templates available</div></Card>
          )}
        </div>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-200">Scheduled deliveries</h2>
              <p className="mt-0.5 text-[11px] text-slate-600">Automated report distribution</p>
            </div>
            <Button size="sm" icon={Plus} onClick={() => setScheduleOpen(true)}>Add</Button>
          </div>
          <div className="mt-3 space-y-2">
            {scheduled.map((schedule: any) => {
              const value = typeof schedule.value === "string" ? JSON.parse(schedule.value) : schedule.value || {};
              return (
                <div key={schedule.id} className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-medium text-slate-300">{titleCase(value.template || "executive")} · {titleCase(value.cadence || "weekly")}</p>
                      <p className="mt-0.5 truncate text-[9px] text-slate-600">{value.recipients?.join(", ") || "No recipients configured"}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge tone={value.enabled === false ? "neutral" : "low"}>{value.enabled === false ? "paused" : "active"}</Badge>
                      <button onClick={() => setDeletingSchedule(schedule)} className="rounded p-1 text-slate-700 transition hover:text-critical" aria-label="Delete schedule"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
            {!scheduled.length && (
              <div className="rounded-xl border border-dashed border-white/[0.07] p-6 text-center">
                <Mail className="mx-auto h-5 w-5 text-slate-700" />
                <p className="mt-2 text-[10px] text-slate-600">No scheduled reports</p>
                <Button size="sm" className="mt-2" onClick={() => setScheduleOpen(true)}>Create schedule</Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-white/[0.05] p-3.5">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-sm font-semibold text-slate-200">Report library</h2>
            <Badge>{data?.pagination?.total || 0}</Badge>
          </div>
          <span className="text-[9px] text-slate-700">Retained for audit evidence</span>
        </div>
        {error && !data ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-white/[0.04] text-[9px] uppercase tracking-[0.14em] text-slate-600">
                  <th className="px-4 py-2.5 font-medium">Report</th>
                  <th className="px-4 py-2.5 font-medium">Type</th>
                  <th className="px-4 py-2.5 font-medium">Format</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Generated by</th>
                  <th className="px-4 py-2.5 font-medium">Created</th>
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
                            <p className="truncate text-[9px] text-slate-600">{report.summary || "Security operations report"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5"><Badge>{titleCase(report.type)}</Badge></td>
                      <td className="px-4 py-2.5"><span className="font-mono text-[9.5px] uppercase text-slate-500">{report.format}</span></td>
                      <td className="px-4 py-2.5"><StatusBadge status={report.status} /></td>
                      <td className="px-4 py-2.5 text-[10px] text-slate-500">{report.created_by_name || "System"}</td>
                      <td className="px-4 py-2.5 text-[9.5px] text-slate-600">{formatDate(report.created_at)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" icon={Download} onClick={async () => {
                            try {
                              await apiDownload(`/reports/${report.id}/download`, `${report.name.replace(/[^a-z0-9]/gi, "-")}.${report.format}`);
                              success("Download started", report.name);
                            } catch (err) {
                              toastError("Download failed", err instanceof Error ? err.message : "Unknown error");
                            }
                          }}>Download</Button>
                          <button onClick={() => setDeleting(report)} className="rounded p-1.5 text-slate-700 transition hover:text-critical" aria-label="Delete report"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!loading && !reports.length && (
                  <tr><td colSpan={7} className="px-4 py-14 text-center">
                    <FileText className="mx-auto h-7 w-7 text-slate-700" />
                    <p className="mt-2 text-xs text-slate-500">No reports generated yet</p>
                    <Button size="sm" className="mt-3" onClick={() => openGenerate()}>Generate the first report</Button>
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
            success("Report deleted", deleting.name);
            setDeleting(null);
            refetch();
          } catch (err) {
            toastError("Delete failed", err instanceof Error ? err.message : "Unknown error");
          }
        }}
        title="Delete report?"
        message={`"${deleting?.name}" will be permanently removed from the report library.`}
        confirmLabel="Delete report"
        danger
      />

      <ConfirmDialog
        open={Boolean(deletingSchedule)}
        onClose={() => setDeletingSchedule(null)}
        onConfirm={async () => {
          if (!deletingSchedule) return;
          try {
            await api(`/reports/schedules/${deletingSchedule.id}`, { method: "DELETE" });
            success("Schedule removed", "The delivery will no longer run.");
            setDeletingSchedule(null);
            schedules.refetch();
          } catch (err) {
            toastError("Could not remove schedule", err instanceof Error ? err.message : "Unknown error");
          }
        }}
        title="Remove schedule?"
        message="Scheduled deliveries for this report will stop immediately."
        confirmLabel="Remove schedule"
        danger
      />
    </div>
  );
}

function GenerateModal({ open, onClose, preset, templates, onCreated }: { open: boolean; onClose: () => void; preset: { type?: string; format?: string }; templates: any[]; onCreated: () => void }) {
  const { success, error: toastError } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "Security Operations Report", type: "executive", format: "pdf", days: 30 });

  useEffect(() => {
    if (open) {
      const template = templates.find((item) => item.id === preset.type);
      setForm({ name: template?.name || "Security Operations Report", type: preset.type || "executive", format: preset.format || "pdf", days: 30 });
    }
  }, [open, preset, templates]);

  const set = (key: string, value: string | number) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    setSaving(true);
    try {
      await api("/reports/generate", { method: "POST", body: { ...form, days: Number(form.days) } });
      success("Report generated", `${form.name} is ready in the library.`);
      onCreated();
    } catch (err) {
      toastError("Generation failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Generate security report"
      description="Reports are generated from live PostgreSQL telemetry."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={Sparkles} loading={saving} onClick={submit}>Generate</Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="Report name">
          <Input value={form.name} onChange={(event) => set("name", event.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Template">
            <Select value={form.type} onChange={(event) => set("type", event.target.value)}>
              {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
            </Select>
          </Field>
          <Field label="Format">
            <Select value={form.format} onChange={(event) => set("format", event.target.value)}>
              <option value="pdf">PDF</option>
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </Select>
          </Field>
          <Field label="Period">
            <Select value={form.days} onChange={(event) => set("days", Number(event.target.value))}>
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={365}>365 days</option>
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
      success("Schedule created", "The report will be delivered automatically.");
      onCreated();
    } catch (err) {
      toastError("Could not create schedule", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Schedule report delivery"
      description="Deliver recurring security reporting to stakeholders."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={Send} loading={saving} onClick={submit}>Create schedule</Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="Schedule name">
          <Input value={form.name} onChange={(event) => set("name", event.target.value)} placeholder="e.g. Weekly executive brief" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Template">
            <Select value={form.template} onChange={(event) => set("template", event.target.value)}>
              {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
            </Select>
          </Field>
          <Field label="Cadence">
            <Select value={form.cadence} onChange={(event) => set("cadence", event.target.value)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </Select>
          </Field>
          <Field label="Format">
            <Select value={form.format} onChange={(event) => set("format", event.target.value)}>
              <option value="pdf">PDF</option>
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </Select>
          </Field>
          <Field label="Recipients" hint="Comma separated">
            <Input value={form.recipients} onChange={(event) => set("recipients", event.target.value)} placeholder="ciso@medicareguard.io" />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
