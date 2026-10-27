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
import { cn, countryFlag, formatDate, formatNumber, relativeTime, titleCase } from "@/lib/utils";
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
    { key: "", label: "All alerts", count: byStatus.reduce((sum: number, item: any) => sum + item.total, 0) },
    { key: "open", label: "Open", count: statusCount("open") },
    { key: "investigating", label: "Investigating", count: statusCount("investigating") },
    { key: "contained", label: "Contained", count: statusCount("contained") },
    { key: "resolved", label: "Resolved", count: statusCount("resolved") },
    { key: "false_positive", label: "False positive", count: statusCount("false_positive") },
  ];

  const exportCsv = async () => {
    setExporting(true);
    try {
      await apiDownload(`/alerts/export${buildQuery({ q: query || undefined, severity: severity || undefined, status: status || undefined })}`, `medicareguard-alerts-${Date.now()}.csv`);
      success("Export ready", "The alert queue was exported as CSV.");
    } catch (err) {
      toastError("Export failed", err instanceof Error ? err.message : "Unable to export alerts");
    } finally {
      setExporting(false);
    }
  };

  const columns: Column[] = [
    {
      key: "severity",
      header: "Severity",
      width: "85px",
      render: (row) => <SeverityBadge severity={row.severity} />,
    },
    {
      key: "title",
      header: "Alert",
      render: (row) => (
        <div className="min-w-0">
          <p className="max-w-[260px] truncate text-[12.5px] font-medium text-slate-200">{row.title}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-600">
            <span>{row.source || "sensor"}</span>
            {row.threat_name && <><span className="text-slate-800">·</span><span className="max-w-[110px] truncate">{row.threat_name}</span></>}
          </p>
        </div>
      ),
    },
    {
      key: "source_ip",
      header: "Origin",
      width: "120px",
      render: (row) => (
        <div>
          <p className="font-mono text-[10.5px] text-slate-400">{row.source_ip || "internal"}</p>
          <p className="mt-0.5 text-[9.5px] text-slate-600">{row.country ? `${countryFlag(row.country_code)} ${row.country}` : "—"}</p>
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
          <p className="mt-0.5 max-w-[150px] truncate font-mono text-[9px] text-slate-600">{row.mitre_technique?.split(" ")[0] || "unmapped"}</p>
        </div>
      ),
    },
    {
      key: "assignee",
      header: "Assignee",
      width: "100px",
      render: (row) => <span className="text-[11px] text-slate-500">{row.assignee_name || <span className="text-slate-700">Unassigned</span>}</span>,
    },
    {
      key: "risk_score",
      header: "Risk",
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
    { key: "status", header: "Status", width: "100px", render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "detected_at",
      header: "Detected",
      width: "85px",
      render: (row) => <span title={formatDate(row.detected_at)} className="text-[10px] text-slate-600">{relativeTime(row.detected_at)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Alert Queue"
        subtitle="Triage, assign and resolve detections from every security sensor"
        icon={ShieldAlert}
        badge={<Badge tone="critical" dot>{statusCount("open")} open</Badge>}
        actions={
          <>
            <Button icon={RefreshCw} onClick={() => { refetch(); stats.refetch(); }} loading={refreshing}>Refresh</Button>
            <Button icon={Download} onClick={exportCsv} loading={exporting}>Export</Button>
            <Button variant="primary" icon={Plus} onClick={() => setCreateOpen(true)}>New alert</Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.loading && !stats.data ? (
          Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-[112px] rounded-xl" />)
        ) : (
          <>
            <StatCard label="Total detections" value={formatNumber(byStatus.reduce((sum: number, item: any) => sum + item.total, 0))} hint="All time" icon={Activity} tone="brand" />
            <StatCard label="Critical severity" value={formatNumber(severityCount("critical"))} hint={`${severityCount("high")} high severity`} icon={ShieldAlert} tone="critical" />
            <StatCard label="Investigating" value={formatNumber(statusCount("investigating"))} hint={`${statusCount("contained")} contained`} icon={Timer} tone="warning" />
            <StatCard label="Resolved" value={formatNumber(statusCount("resolved"))} hint={`${statusCount("false_positive")} false positives`} icon={CheckCircle2} tone="success" />
          </>
        )}
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-white/[0.05] p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Tabs tabs={tabs} value={status} onChange={setStatus} />
            <div className="flex items-center gap-2">
              <SearchInput value={search} onChange={setSearch} placeholder="Search title, IP, country…" className="w-full sm:w-64" />
              <Select value={severity} onChange={(event) => setSeverity(event.target.value)} className="w-32">
                <option value="">All severity</option>
                {SEVERITIES.map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}
              </Select>
              <Select value={sort} onChange={(event) => setSort(event.target.value)} className="w-36">
                <option value="detected_at">Newest first</option>
                <option value="risk_score">Highest risk</option>
                <option value="severity">Severity</option>
                <option value="status">Status</option>
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
            emptyTitle="No alerts match this view"
            emptyMessage="Try widening your filters or create a manual alert."
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
    source: "Manual",
    source_ip: "",
    country: "",
    mitre_tactic: "",
    mitre_technique: "",
    risk_score: 55,
    confidence: 70,
  });

  useEffect(() => {
    if (open) setForm({ title: "", description: "", severity: "medium", source: "Manual", source_ip: "", country: "", mitre_tactic: "", mitre_technique: "", risk_score: 55, confidence: 70 });
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
      success("Alert created", "The detection is now in the triage queue.");
      onCreated();
    } catch (err) {
      toastError("Could not create alert", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create manual alert"
      description="Record a detection that was not raised automatically by a sensor."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={submit}>Create alert</Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <Field label="Alert title" className="md:col-span-2">
          <Input value={form.title} onChange={(event) => set("title", event.target.value)} placeholder="e.g. Suspicious OAuth consent grant to unknown app" required />
        </Field>
        <Field label="Description" className="md:col-span-2">
          <Textarea value={form.description} onChange={(event) => set("description", event.target.value)} placeholder="What was observed, on which asset and why it matters…" />
        </Field>
        <Field label="Severity">
          <Select value={form.severity} onChange={(event) => set("severity", event.target.value)}>
            {SEVERITIES.map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}
          </Select>
        </Field>
        <Field label="Detection source">
          <Input value={form.source} onChange={(event) => set("source", event.target.value)} placeholder="EDR, SIEM, Cloud Trail…" />
        </Field>
        <Field label="Source IP">
          <Input value={form.source_ip} onChange={(event) => set("source_ip", event.target.value)} placeholder="203.0.113.42" className="font-mono" />
        </Field>
        <Field label="Country">
          <Input value={form.country} onChange={(event) => set("country", event.target.value)} placeholder="Country of origin" />
        </Field>
        <Field label="MITRE tactic">
          <Input value={form.mitre_tactic} onChange={(event) => set("mitre_tactic", event.target.value)} placeholder="TA0001 Initial Access" />
        </Field>
        <Field label="MITRE technique">
          <Input value={form.mitre_technique} onChange={(event) => set("mitre_technique", event.target.value)} placeholder="T1566 Phishing" />
        </Field>
        <Field label={`Risk score — ${form.risk_score}`}>
          <input type="range" min={0} max={100} value={form.risk_score} onChange={(event) => set("risk_score", Number(event.target.value))} className="input h-9 cursor-pointer accent-brand-500" />
        </Field>
        <Field label={`Confidence — ${form.confidence}%`}>
          <input type="range" min={0} max={100} value={form.confidence} onChange={(event) => set("confidence", Number(event.target.value))} className="input h-9 cursor-pointer accent-brand-500" />
        </Field>
      </form>
    </Modal>
  );
}
