"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Crosshair, Download, Fingerprint, Globe2, Plus, Radar, RefreshCw, ShieldAlert } from "lucide-react";
import { api, apiDownload, buildQuery, useApi, useDebounced } from "@/lib/api";
import { cn, countryFlag, formatNumber, relativeTime, titleCase } from "@/lib/utils";
import { CategoryBars, SeverityDonut, SeverityLegend } from "@/components/charts";
import { ThreatMap } from "@/components/ThreatMap";
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
const CATEGORIES = ["Ransomware", "Phishing", "DDoS", "Malware", "C2", "Brute Force", "Data Exfiltration", "Web Attack", "Zero-day", "Supply Chain", "Cryptojacking", "Insider Threat"];

export default function ThreatsPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("last_seen");
  const [createOpen, setCreateOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const query = useDebounced(search, 300);

  const stats = useApi<any>("/threats/stats", { refreshInterval: 60000 });
  const listPath = useMemo(
    () => `/threats${buildQuery({ page, limit: 12, q: query || undefined, severity: severity || undefined, category: category || undefined, status: status || undefined, sort, order: "desc" })}`,
    [page, query, severity, category, status, sort],
  );
  const { data, loading, error, refetch, refreshing } = useApi<any>(listPath, { refreshInterval: 45000 });

  useEffect(() => setPage(1), [query, severity, category, status, sort]);

  const statsData = stats.data?.data;
  const bySeverity = statsData?.bySeverity || [];
  const byCategory = statsData?.byCategory || [];
  const byCountry = (statsData?.byCountry || []).map((item: any) => ({ ...item, attacks: item.total }));
  const total = bySeverity.reduce((sum: number, item: any) => sum + item.total, 0);
  const critical = bySeverity.find((item: any) => item.severity === "critical")?.total || 0;
  const active = (data?.data || []).filter((item: any) => item.status === "active").length;

  const exportCsv = async () => {
    setExporting(true);
    try {
      await apiDownload(`/threats/export${buildQuery({ q: query || undefined, severity: severity || undefined, category: category || undefined })}`, `medicareguard-threats-${Date.now()}.csv`);
      success("Export ready", "Threat intelligence exported as CSV.");
    } catch (err) {
      toastError("Export failed", err instanceof Error ? err.message : "Unable to export threats");
    } finally {
      setExporting(false);
    }
  };

  const columns: Column[] = [
    { key: "severity", header: "Severity", width: "94px", render: (row) => <SeverityBadge severity={row.severity} /> },
    {
      key: "name",
      header: "Threat / campaign",
      render: (row) => (
        <div>
          <p className="max-w-[300px] truncate text-[12.5px] font-medium text-slate-200">{row.name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-600">
            <span>{row.category || "Uncategorised"}</span>
            <span className="text-slate-800">·</span>
            <span>{row.metadata?.actor || "Unattributed"}</span>
          </p>
        </div>
      ),
    },
    {
      key: "origin",
      header: "Origin",
      width: "150px",
      render: (row) => (
        <div>
          <p className="text-[11px] text-slate-400">{row.country ? `${countryFlag(row.country_code)} ${row.country}` : "—"}</p>
          <p className="mt-0.5 font-mono text-[9.5px] text-slate-600">{row.source_ip || "no ip"}</p>
        </div>
      ),
    },
    {
      key: "ioc",
      header: "Indicator",
      width: "170px",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <span className="rounded border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-slate-500">{row.ioc_type || "ioc"}</span>
          <span className="max-w-[120px] truncate font-mono text-[9px] text-slate-600">{row.ioc_value || "—"}</span>
        </div>
      ),
    },
    {
      key: "risk_score",
      header: "Risk / Confidence",
      width: "130px",
      render: (row) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-1 w-16 overflow-hidden rounded-full bg-white/[0.06]">
              <div className={cn("h-full rounded-full", row.risk_score >= 80 ? "bg-critical" : row.risk_score >= 60 ? "bg-high" : row.risk_score >= 40 ? "bg-medium" : "bg-low")} style={{ width: `${row.risk_score}%` }} />
            </div>
            <span className="font-mono text-[9px] text-slate-500">{row.risk_score}</span>
          </div>
          <p className="text-[8.5px] text-slate-700">{row.confidence}% confidence</p>
        </div>
      ),
    },
    { key: "status", header: "Status", width: "100px", render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "last_seen",
      header: "Last seen",
      width: "90px",
      render: (row) => <span className="text-[10px] text-slate-600">{relativeTime(row.last_seen)}</span>,
    },
    { key: "open", header: "", width: "36px", render: () => <ArrowUpRight className="h-3.5 w-3.5 text-slate-700" /> },
  ];

  return (
    <div>
      <PageHeader
        title="Threat Landscape"
        subtitle="Attack origins, adversary campaigns and indicator coverage across the estate"
        icon={Radar}
        badge={<Badge tone="warning" dot>{SEVERITIES.length} severity classes</Badge>}
        actions={
          <>
            <Button icon={RefreshCw} onClick={() => { refetch(); stats.refetch(); }} loading={refreshing}>Refresh</Button>
            <Button icon={Download} onClick={exportCsv} loading={exporting}>Export</Button>
            <Button variant="primary" icon={Plus} onClick={() => setCreateOpen(true)}>Add threat</Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.loading && !stats.data ? (
          Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-[112px] rounded-xl" />)
        ) : (
          <>
            <StatCard label="Tracked threats" value={formatNumber(total)} hint={`${byCountry.length} origin countries`} icon={Globe2} tone="brand" />
            <StatCard label="Critical threats" value={formatNumber(critical)} hint="Highest risk indicators" icon={ShieldAlert} tone="critical" />
            <StatCard label="Active campaigns" value={formatNumber(active)} hint="In current result set" icon={Crosshair} tone="warning" />
            <StatCard label="Intel sources" value={formatNumber(byCategory.length)} hint="Attack categories observed" icon={Fingerprint} tone="cyan" />
          </>
        )}
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <ThreatMap data={byCountry} className="border-0" />
        </Card>
        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="font-display text-sm font-semibold text-slate-200">Severity distribution</h2>
            <SeverityDonut data={bySeverity} height={154} />
            <SeverityLegend data={bySeverity} />
          </Card>
          <Card className="p-4">
            <h2 className="font-display text-sm font-semibold text-slate-200">Attack categories</h2>
            <p className="mt-0.5 text-[11px] text-slate-600">Most frequent adversary techniques</p>
            <CategoryBars data={byCategory} height={190} />
          </Card>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.05] p-3.5">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-sm font-semibold text-slate-200">Intelligence feed</h2>
            <Badge>{data?.pagination?.total || 0} indicators</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search name, IP, IOC…" className="w-full sm:w-60" />
            <Select value={severity} onChange={(event) => setSeverity(event.target.value)} className="w-32">
              <option value="">Severity</option>
              {SEVERITIES.map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}
            </Select>
            <Select value={category} onChange={(event) => setCategory(event.target.value)} className="w-36">
              <option value="">All categories</option>
              {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
            </Select>
            <Select value={status} onChange={(event) => setStatus(event.target.value)} className="w-28">
              <option value="">Status</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
              <option value="monitoring">Monitoring</option>
            </Select>
            <Select value={sort} onChange={(event) => setSort(event.target.value)} className="w-32">
              <option value="last_seen">Last seen</option>
              <option value="risk_score">Highest risk</option>
              <option value="severity">Severity</option>
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
            onRowClick={(row) => router.push(`/threats/${row.id}`)}
            emptyTitle="No threat intelligence matches"
            emptyMessage="Adjust filters or add a new indicator to the feed."
            footer={data?.pagination ? <Pagination page={data.pagination.page} pages={data.pagination.pages} total={data.pagination.total} limit={data.pagination.limit} onPage={setPage} /> : null}
          />
        )}
      </Card>

      <CreateThreatModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); refetch(); stats.refetch(); }} />
    </div>
  );
}

function CreateThreatModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { success, error: toastError } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", category: "Malware", severity: "high", status: "active", source: "Manual", source_ip: "",
    country: "", country_code: "", ioc_type: "ip", ioc_value: "", confidence: 70, risk_score: 65, description: "",
  });

  useEffect(() => {
    if (open) setForm({ name: "", category: "Malware", severity: "high", status: "active", source: "Manual", source_ip: "", country: "", country_code: "", ioc_type: "ip", ioc_value: "", confidence: 70, risk_score: 65, description: "" });
  }, [open]);

  const set = (key: string, value: string | number) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api("/threats", { method: "POST", body: { ...form, risk_score: Number(form.risk_score), confidence: Number(form.confidence) } });
      success("Threat added", "The indicator is now part of the intelligence feed.");
      onCreated();
    } catch (err) {
      toastError("Could not add threat", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add threat indicator"
      description="Register a new adversary indicator or tracked campaign."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={submit}>Add to feed</Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <Field label="Threat name" className="md:col-span-2">
          <Input value={form.name} onChange={(event) => set("name", event.target.value)} placeholder="e.g. FIN7 — Credential harvesting infrastructure" required />
        </Field>
        <Field label="Category">
          <Select value={form.category} onChange={(event) => set("category", event.target.value)}>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</Select>
        </Field>
        <Field label="Severity">
          <Select value={form.severity} onChange={(event) => set("severity", event.target.value)}>{SEVERITIES.map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}</Select>
        </Field>
        <Field label="Source IP">
          <Input value={form.source_ip} onChange={(event) => set("source_ip", event.target.value)} placeholder="198.51.100.42" className="font-mono" />
        </Field>
        <Field label="Country">
          <Input value={form.country} onChange={(event) => set("country", event.target.value)} placeholder="Country" />
        </Field>
        <Field label="IOC type">
          <Select value={form.ioc_type} onChange={(event) => set("ioc_type", event.target.value)}>
            <option value="ip">IP address</option>
            <option value="domain">Domain</option>
            <option value="url">URL</option>
            <option value="hash">File hash</option>
            <option value="email">Email</option>
          </Select>
        </Field>
        <Field label="IOC value">
          <Input value={form.ioc_value} onChange={(event) => set("ioc_value", event.target.value)} placeholder="Indicator value" className="font-mono" />
        </Field>
        <Field label={`Risk score — ${form.risk_score}`}>
          <input type="range" min={0} max={100} value={form.risk_score} onChange={(event) => set("risk_score", Number(event.target.value))} className="input h-9 cursor-pointer accent-brand-500" />
        </Field>
        <Field label={`Confidence — ${form.confidence}%`}>
          <input type="range" min={0} max={100} value={form.confidence} onChange={(event) => set("confidence", Number(event.target.value))} className="input h-9 cursor-pointer accent-brand-500" />
        </Field>
        <Field label="Description" className="md:col-span-2">
          <Textarea value={form.description} onChange={(event) => set("description", event.target.value)} placeholder="Context, attribution and observed behaviour…" />
        </Field>
      </form>
    </Modal>
  );
}
