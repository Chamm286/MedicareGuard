"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Bug, Plus, RefreshCw, ShieldAlert, ShieldCheck, Target } from "lucide-react";
import { api, buildQuery, useApi, useDebounced } from "@/lib/api";
import { cn, formatNumber, relativeTime, titleCase } from "@/lib/utils";
import { SeverityDonut, SeverityLegend } from "@/components/charts";
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
  SeverityBadge,
  Skeleton,
  StatCard,
  StatusBadge,
  Textarea,
} from "@/components/ui";

const SEVERITIES = ["critical", "high", "medium", "low"];

export default function VulnerabilitiesPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const query = useDebounced(search, 300);

  const all = useApi<any>("/vulnerabilities?limit=100", { refreshInterval: 60000 });
  const assets = useApi<any>("/assets?limit=100");
  const listPath = useMemo(() => `/vulnerabilities${buildQuery({ page, limit: 12, q: query || undefined, severity: severity || undefined, status: status || undefined })}`, [page, query, severity, status]);
  const { data, loading, error, refetch, refreshing } = useApi<any>(listPath, { refreshInterval: 45000 });

  useEffect(() => setPage(1), [query, severity, status]);

  const assetMap = useMemo(() => {
    const map: Record<string, any> = {};
    (assets.data?.data || []).forEach((asset: any) => { map[asset.id] = asset; });
    return map;
  }, [assets.data]);

  const records = all.data?.data || [];
  const bySeverity = SEVERITIES.map((level) => ({ severity: level, total: records.filter((item: any) => item.severity === level).length }));
  const openCount = records.filter((item: any) => item.status === "open").length;
  const criticalCount = records.filter((item: any) => item.severity === "critical").length;
  const avgCvss = records.length ? (records.reduce((sum: number, item: any) => sum + Number(item.cvss_score || 0), 0) / records.length).toFixed(1) : "0";
  const exposedAssets = useMemo(() => {
    const grouped: Record<string, { id: string; count: number; max: number; severity: string }> = {};
    records.forEach((item: any) => {
      if (!item.asset_id) return;
      const current = grouped[item.asset_id] || { id: item.asset_id, count: 0, max: 0, severity: "low" };
      current.count += 1;
      if (Number(item.cvss_score) > current.max) {
        current.max = Number(item.cvss_score);
        current.severity = item.severity;
      }
      grouped[item.asset_id] = current;
    });
    return Object.values(grouped).sort((a, b) => b.max - a.max).slice(0, 6);
  }, [records]);

  const columns: Column[] = [
    {
      key: "cve_id",
      header: "CVE",
      width: "130px",
      render: (row) => <span className="rounded border border-brand-400/20 bg-brand-500/10 px-1.5 py-0.5 font-mono text-[9.5px] text-brand-300">{row.cve_id}</span>,
    },
    {
      key: "title",
      header: "Vulnerability",
      render: (row) => (
        <div className="min-w-0">
          <p className="max-w-[340px] truncate text-[12px] font-medium text-slate-200">{row.title}</p>
          <p className="mt-0.5 max-w-[340px] truncate text-[9.5px] text-slate-600">{row.description || "No description"}</p>
        </div>
      ),
    },
    { key: "severity", header: "Severity", width: "94px", render: (row) => <SeverityBadge severity={row.severity} /> },
    {
      key: "cvss_score",
      header: "CVSS",
      width: "115px",
      render: (row) => (
        <div>
          <div className="flex items-center justify-between">
            <span className={cn("font-mono text-[11px]", Number(row.cvss_score) >= 9 ? "text-critical" : Number(row.cvss_score) >= 7 ? "text-high" : "text-medium")}>{row.cvss_score}</span>
            <span className="text-[8px] text-slate-700">/10</span>
          </div>
          <ProgressBar value={Number(row.cvss_score) * 10} barClassName={Number(row.cvss_score) >= 9 ? "from-critical to-rose-400" : "from-high to-amber-400"} className="mt-1 h-1" />
        </div>
      ),
    },
    {
      key: "asset_id",
      header: "Affected asset",
      width: "170px",
      render: (row) => assetMap[row.asset_id] ? <Link href={`/assets/${row.asset_id}`} className="text-[10.5px] text-slate-400 hover:text-brand-300">{assetMap[row.asset_id].name}</Link> : <span className="text-[10px] text-slate-700">Unmapped</span>,
    },
    { key: "status", header: "Status", width: "110px", render: (row) => <StatusBadge status={row.status} /> },
    { key: "created_at", header: "Discovered", width: "90px", render: (row) => <span className="text-[9.5px] text-slate-600">{relativeTime(row.created_at)}</span> },
    { key: "open", header: "", width: "34px", render: () => <ArrowUpRight className="h-3.5 w-3.5 text-slate-700" /> },
  ];

  return (
    <div>
      <PageHeader
        title="Vulnerability Management"
        subtitle="CVE exposure, CVSS prioritisation and remediation tracking across the estate"
        icon={Bug}
        badge={<Badge tone="critical" dot>{criticalCount} critical</Badge>}
        actions={
          <>
            <Button icon={RefreshCw} onClick={() => { refetch(); all.refetch(); }} loading={refreshing}>Refresh</Button>
            <Button variant="primary" icon={Plus} onClick={() => setCreateOpen(true)}>Track CVE</Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {all.loading && !all.data ? (
          Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-[112px] rounded-xl" />)
        ) : (
          <>
            <StatCard label="Tracked CVEs" value={formatNumber(records.length)} hint={`${exposedAssets.length} exposed assets`} icon={Bug} tone="brand" />
            <StatCard label="Critical severity" value={formatNumber(criticalCount)} hint="Immediate remediation" icon={ShieldAlert} tone="critical" />
            <StatCard label="Open findings" value={formatNumber(openCount)} hint="Unremediated" icon={Target} tone="warning" />
            <StatCard label="Average CVSS" value={avgCvss} hint="Portfolio exposure" icon={ShieldCheck} tone="success" />
          </>
        )}
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-3">
        <Card className="p-4">
          <h2 className="font-display text-sm font-semibold text-slate-200">Severity mix</h2>
          <SeverityDonut data={bySeverity} height={154} />
          <SeverityLegend data={bySeverity} />
        </Card>
        <Card className="p-4 xl:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-200">Most exposed assets</h2>
              <p className="mt-0.5 text-[11px] text-slate-600">Ranked by maximum CVSS score</p>
            </div>
            <Link href="/assets" className="flex items-center gap-1 text-[10px] text-slate-500 transition hover:text-brand-300">Inventory <ArrowUpRight className="h-3 w-3" /></Link>
          </div>
          <div className="mt-3 space-y-2.5">
            {exposedAssets.map((item) => (
              <Link key={item.id} href={`/assets/${item.id}`} className="group flex items-center gap-3">
                <span className="w-40 shrink-0 truncate text-[10.5px] text-slate-400 group-hover:text-slate-200">{assetMap[item.id]?.name || "Unknown asset"}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-gradient-to-r from-high to-critical" style={{ width: `${item.max * 10}%` }} />
                </div>
                <span className="w-8 text-right font-mono text-[10px] text-high">{item.max.toFixed(1)}</span>
                <span className="w-16 text-right text-[9px] text-slate-600">{item.count} CVEs</span>
              </Link>
            ))}
            {!exposedAssets.length && <p className="py-6 text-center text-xs text-slate-600">No asset-mapped vulnerabilities yet.</p>}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.05] p-3.5">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-sm font-semibold text-slate-200">CVE register</h2>
            <Badge>{data?.pagination?.total || 0} findings</Badge>
          </div>
          <div className="flex items-center gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search CVE, title…" className="w-full sm:w-60" />
            <Select value={severity} onChange={(event) => setSeverity(event.target.value)} className="w-30">
              <option value="">Severity</option>
              {SEVERITIES.map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}
            </Select>
            <Select value={status} onChange={(event) => setStatus(event.target.value)} className="w-32">
              <option value="">Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
              <option value="accepted">Accepted risk</option>
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
            onRowClick={(row) => router.push(`/vulnerabilities/${row.id}`)}
            emptyTitle="No vulnerabilities match"
            emptyMessage="Adjust filters or track a new CVE."
            footer={data?.pagination ? <Pagination page={data.pagination.page} pages={data.pagination.pages} total={data.pagination.total} limit={data.pagination.limit} onPage={setPage} /> : null}
          />
        )}
      </Card>

      <CreateVulnerabilityModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        assets={assets.data?.data || []}
        onCreated={() => { setCreateOpen(false); refetch(); all.refetch(); }}
      />
    </div>
  );
}

function CreateVulnerabilityModal({ open, onClose, assets, onCreated }: { open: boolean; onClose: () => void; assets: any[]; onCreated: () => void }) {
  const { success, error: toastError } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", cve_id: "", severity: "high", status: "open", cvss_score: 7.5, asset_id: "", description: "" });

  useEffect(() => {
    if (open) setForm({ title: "", cve_id: "", severity: "high", status: "open", cvss_score: 7.5, asset_id: "", description: "" });
  }, [open]);

  const set = (key: string, value: string | number) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await api("/vulnerabilities", { method: "POST", body: { ...form, cvss_score: Number(form.cvss_score), asset_id: form.asset_id || undefined } });
      success("CVE tracked", "The vulnerability is now part of the remediation backlog.");
      onCreated();
    } catch (err) {
      toastError("Could not add CVE", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Track vulnerability"
      description="Add a CVE or detected weakness to the remediation backlog."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={submit}>Track CVE</Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <Field label="Vulnerability title" className="md:col-span-2">
          <Input value={form.title} onChange={(event) => set("title", event.target.value)} placeholder="e.g. OpenSSL remote code execution" required />
        </Field>
        <Field label="CVE ID">
          <Input value={form.cve_id} onChange={(event) => set("cve_id", event.target.value)} placeholder="CVE-2026-XXXX" className="font-mono" />
        </Field>
        <Field label="CVSS score" hint="0.0 – 10.0">
          <Input type="number" step="0.1" min={0} max={10} value={form.cvss_score} onChange={(event) => set("cvss_score", Number(event.target.value))} />
        </Field>
        <Field label="Severity">
          <Select value={form.severity} onChange={(event) => set("severity", event.target.value)}>{SEVERITIES.map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}</Select>
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={(event) => set("status", event.target.value)}>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="accepted">Accepted risk</option>
          </Select>
        </Field>
        <Field label="Affected asset" className="md:col-span-2">
          <Select value={form.asset_id} onChange={(event) => set("asset_id", event.target.value)}>
            <option value="">Unmapped</option>
            {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name} · {asset.ip_address}</option>)}
          </Select>
        </Field>
        <Field label="Description" className="md:col-span-2">
          <Textarea value={form.description} onChange={(event) => set("description", event.target.value)} placeholder="Technical impact, exploitability and required remediation…" />
        </Field>
      </form>
    </Modal>
  );
}
