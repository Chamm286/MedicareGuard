"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Copy, Fingerprint, Plus, Radio, RefreshCw, ShieldAlert, Users } from "lucide-react";
import { api, buildQuery, useApi, useDebounced } from "@/lib/api";
import { cn, countryFlag, formatDate, formatNumber, relativeTime, titleCase } from "@/lib/utils";
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
  Toggle,
} from "@/components/ui";

const TYPES = ["ip", "domain", "url", "hash", "email"];
const SEVERITIES = ["critical", "high", "medium", "low"];

export default function ThreatIntelPage() {
  const { success, error: toastError } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("");
  const [indicatorType, setIndicatorType] = useState("");
  const [source, setSource] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const query = useDebounced(search, 300);

  const all = useApi<any>("/threat-intel?limit=100", { refreshInterval: 60000 });
  const listPath = useMemo(
    () => `/threat-intel${buildQuery({ page, limit: 12, q: query || undefined, severity: severity || undefined, indicator_type: indicatorType || undefined, source: source || undefined })}`,
    [page, query, severity, indicatorType, source],
  );
  const { data, loading, error, refetch, refreshing } = useApi<any>(listPath, { refreshInterval: 45000 });

  useEffect(() => setPage(1), [query, severity, indicatorType, source]);

  const records = all.data?.data || [];
  const bySeverity = SEVERITIES.map((level) => ({ severity: level, total: records.filter((item: any) => item.severity === level).length }));
  const critical = bySeverity.find((item) => item.severity === "critical")?.total || 0;
  const avgConfidence = records.length ? Math.round(records.reduce((sum: number, item: any) => sum + Number(item.confidence || 0), 0) / records.length) : 0;
  const actors = useMemo(() => {
    const grouped: Record<string, number> = {};
    records.forEach((item: any) => { if (item.threat_actor) grouped[item.threat_actor] = (grouped[item.threat_actor] || 0) + 1; });
    return Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 7);
  }, [records]);
  const sources = useMemo(() => {
    const grouped: Record<string, number> = {};
    records.forEach((item: any) => { if (item.source) grouped[item.source] = (grouped[item.source] || 0) + 1; });
    return Object.entries(grouped).sort((a, b) => b[1] - a[1]);
  }, [records]);
  const countries = useMemo(() => {
    const grouped: Record<string, { country: string; country_code: string; attacks: number }> = {};
    records.forEach((item: any) => {
      if (!item.country) return;
      const key = item.country;
      grouped[key] = grouped[key] || { country: item.country, country_code: item.country === "Russia" ? "RU" : item.country === "Iran" ? "IR" : item.country === "China" ? "CN" : item.country === "India" ? "IN" : "US", attacks: 0 };
      grouped[key].attacks += 1;
    });
    return Object.values(grouped).sort((a, b) => b.attacks - a.attacks);
  }, [records]);

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      success("Copied to clipboard", value);
    } catch {
      toastError("Clipboard unavailable");
    }
  };

  const columns: Column[] = [
    {
      key: "indicator",
      header: "Indicator",
      render: (row) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-slate-500">{row.indicator_type}</span>
            <p className="max-w-[280px] truncate font-mono text-[10.5px] text-slate-300">{row.indicator}</p>
          </div>
          <p className="mt-1 text-[9px] text-slate-600">{row.source || "manual feed"}</p>
        </div>
      ),
    },
    { key: "threat_actor", header: "Actor", width: "140px", render: (row) => <span className="text-[10.5px] text-slate-400">{row.threat_actor || "Unattributed"}</span> },
    { key: "severity", header: "Severity", width: "94px", render: (row) => <SeverityBadge severity={row.severity} /> },
    {
      key: "confidence",
      header: "Confidence",
      width: "120px",
      render: (row) => (
        <div>
          <div className="flex items-center justify-between text-[9px] text-slate-600">
            <span>{row.confidence}%</span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div className={cn("h-full rounded-full", row.confidence >= 80 ? "bg-low" : row.confidence >= 60 ? "bg-medium" : "bg-high")} style={{ width: `${row.confidence}%` }} />
          </div>
        </div>
      ),
    },
    { key: "country", header: "Origin", width: "130px", render: (row) => <span className="text-[10px] text-slate-500">{row.country ? `${countryFlag(row.country === "Russia" ? "RU" : row.country === "Iran" ? "IR" : row.country === "China" ? "CN" : "US")} ${row.country}` : "—"}</span> },
    { key: "last_seen", header: "Last seen", width: "90px", render: (row) => <span className="text-[9.5px] text-slate-600">{relativeTime(row.last_seen)}</span> },
    { key: "copy", header: "", width: "40px", render: (row) => <button onClick={(event) => { event.stopPropagation(); copy(row.indicator); }} className="rounded p-1 text-slate-600 transition hover:text-brand-300" aria-label="Copy indicator"><Copy className="h-3.5 w-3.5" /></button> },
  ];

  return (
    <div>
      <PageHeader
        title="Threat Intelligence"
        subtitle="Curated indicators, actor attribution and feed confidence from external CTI providers"
        icon={Fingerprint}
        badge={<Badge tone="info" dot>{records.length} indicators</Badge>}
        actions={
          <>
            <Button icon={RefreshCw} onClick={() => { refetch(); all.refetch(); }} loading={refreshing}>Refresh</Button>
            <Button variant="primary" icon={Plus} onClick={() => setCreateOpen(true)}>Add indicator</Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {all.loading && !all.data ? (
          Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-[112px] rounded-xl" />)
        ) : (
          <>
            <StatCard label="Indicator corpus" value={formatNumber(records.length)} hint={`${sources.length} intelligence sources`} icon={Fingerprint} tone="brand" />
            <StatCard label="Critical indicators" value={formatNumber(critical)} hint="Highest confidence detections" icon={ShieldAlert} tone="critical" />
            <StatCard label="Tracked actors" value={formatNumber(actors.length)} hint="Named threat groups" icon={Users} tone="warning" />
            <StatCard label="Mean confidence" value={`${avgConfidence}%`} hint="Across all indicators" icon={Radio} tone="cyan" />
          </>
        )}
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <ThreatMap data={countries} className="border-0" />
        </Card>
        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="font-display text-sm font-semibold text-slate-200">Actor attribution</h2>
            <p className="mt-0.5 text-[11px] text-slate-600">Indicators per named actor</p>
            <div className="mt-3 space-y-2">
              {actors.map(([actor, count]) => (
                <div key={actor} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-high" />
                  <span className="flex-1 truncate text-[10px] text-slate-400">{actor}</span>
                  <span className="text-[10px] text-slate-600">{count}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <h2 className="font-display text-sm font-semibold text-slate-200">Feed sources</h2>
            <div className="mt-3 space-y-2">
              {sources.map(([name, count]) => (
                <div key={name}>
                  <div className="mb-1 flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">{name}</span>
                    <span className="text-slate-400">{count}</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-400" style={{ width: `${(count / Math.max(sources[0]?.[1] || 1, 1)) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.05] p-3.5">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-sm font-semibold text-slate-200">Indicator feed</h2>
            <Badge>{data?.pagination?.total || 0} IOC</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search indicator, actor…" className="w-full sm:w-60" />
            <Select value={indicatorType} onChange={(event) => setIndicatorType(event.target.value)} className="w-28">
              <option value="">Type</option>
              {TYPES.map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}
            </Select>
            <Select value={severity} onChange={(event) => setSeverity(event.target.value)} className="w-32">
              <option value="">Severity</option>
              {SEVERITIES.map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}
            </Select>
            <Select value={source} onChange={(event) => setSource(event.target.value)} className="w-36">
              <option value="">All sources</option>
              {sources.map(([name]) => <option key={name} value={name}>{name}</option>)}
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
            onRowClick={(row) => setSelected(row)}
            emptyTitle="No indicators match"
            emptyMessage="Adjust filters or add a new IOC to the feed."
            footer={data?.pagination ? <Pagination page={data.pagination.page} pages={data.pagination.pages} total={data.pagination.total} limit={data.pagination.limit} onPage={setPage} /> : null}
          />
        )}
      </Card>

      <CreateIntelModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); refetch(); all.refetch(); }} />

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Indicator detail"
        description={selected ? `${selected.indicator_type?.toUpperCase()} · ${selected.source}` : undefined}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
            <Button variant="primary" icon={Copy} onClick={() => selected && copy(selected.indicator)}>Copy IOC</Button>
          </>
        }
      >
        {selected && (
          <div>
            <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
              <p className="break-all font-mono text-[11px] text-slate-300">{selected.indicator}</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-white/[0.05] p-2.5">
                <p className="text-[9px] text-slate-600">Actor</p>
                <p className="mt-0.5 text-[11px] text-slate-300">{selected.threat_actor || "Unattributed"}</p>
              </div>
              <div className="rounded-lg border border-white/[0.05] p-2.5">
                <p className="text-[9px] text-slate-600">Confidence</p>
                <p className="mt-0.5 text-[11px] text-slate-300">{selected.confidence}%</p>
              </div>
              <div className="rounded-lg border border-white/[0.05] p-2.5">
                <p className="text-[9px] text-slate-600">Severity</p>
                <div className="mt-0.5"><SeverityBadge severity={selected.severity} /></div>
              </div>
              <div className="rounded-lg border border-white/[0.05] p-2.5">
                <p className="text-[9px] text-slate-600">Country</p>
                <p className="mt-0.5 text-[11px] text-slate-300">{selected.country || "Unknown"}</p>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-[10px]"><span className="text-slate-600">Source</span><span className="text-slate-400">{selected.source}</span></div>
              <div className="flex justify-between text-[10px]"><span className="text-slate-600">Last seen</span><span className="text-slate-400">{formatDate(selected.last_seen)}</span></div>
              <div className="flex justify-between text-[10px]"><span className="text-slate-600">First ingested</span><span className="text-slate-400">{formatDate(selected.created_at)}</span></div>
            </div>
            <p className="mt-3 text-[9px] uppercase tracking-[0.16em] text-slate-600">Metadata</p>
            <pre className="mt-1.5 max-h-40 overflow-auto rounded-xl border border-white/[0.06] bg-black/30 p-3 font-mono text-[10px] text-slate-500">{JSON.stringify(selected.metadata || {}, null, 2)}</pre>
          </div>
        )}
      </Modal>
    </div>
  );
}

function CreateIntelModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { success, error: toastError } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ indicator: "", indicator_type: "ip", threat_actor: "", confidence: 70, severity: "high", source: "Manual", country: "" });

  useEffect(() => {
    if (open) setForm({ indicator: "", indicator_type: "ip", threat_actor: "", confidence: 70, severity: "high", source: "Manual", country: "" });
  }, [open]);

  const set = (key: string, value: string | number) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.indicator.trim()) return;
    setSaving(true);
    try {
      await api("/threat-intel", { method: "POST", body: { ...form, confidence: Number(form.confidence), last_seen: new Date().toISOString() } });
      success("Indicator added", "The IOC is now available to detection engineering.");
      onCreated();
    } catch (err) {
      toastError("Could not add indicator", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add threat indicator"
      description="Publish a new IOC to the intelligence corpus."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={submit}>Add indicator</Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <Field label="Indicator" className="md:col-span-2">
          <Input value={form.indicator} onChange={(event) => set("indicator", event.target.value)} placeholder="203.0.113.42 / evil.example / SHA-256" className="font-mono" required />
        </Field>
        <Field label="Indicator type">
          <Select value={form.indicator_type} onChange={(event) => set("indicator_type", event.target.value)}>{TYPES.map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}</Select>
        </Field>
        <Field label="Severity">
          <Select value={form.severity} onChange={(event) => set("severity", event.target.value)}>{SEVERITIES.map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}</Select>
        </Field>
        <Field label="Threat actor">
          <Input value={form.threat_actor} onChange={(event) => set("threat_actor", event.target.value)} placeholder="e.g. APT29" />
        </Field>
        <Field label="Source feed">
          <Input value={form.source} onChange={(event) => set("source", event.target.value)} placeholder="MISP, Recorded Future…" />
        </Field>
        <Field label="Country">
          <Input value={form.country} onChange={(event) => set("country", event.target.value)} placeholder="Country of origin" />
        </Field>
        <Field label={`Confidence — ${form.confidence}%`}>
          <input type="range" min={0} max={100} value={form.confidence} onChange={(event) => set("confidence", Number(event.target.value))} className="input h-9 cursor-pointer accent-brand-500" />
        </Field>
      </form>
    </Modal>
  );
}
