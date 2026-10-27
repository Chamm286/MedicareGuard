"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowDownToLine, ArrowUpFromLine, CheckCircle2, Download, Flame, FlaskConical, Plus, RefreshCw, ShieldCheck, Zap } from "lucide-react";
import { api, apiDownload, buildQuery, useApi, useDebounced } from "@/lib/api";
import { cn, formatNumber, relativeTime, titleCase } from "@/lib/utils";
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
  Skeleton,
  StatCard,
  Toggle,
} from "@/components/ui";

const DIRECTIONS = ["inbound", "outbound", "internal"];
const ACTIONS = ["allow", "deny"];
const PROTOCOLS = ["tcp", "udp", "icmp", "any"];

export default function FirewallPage() {
  const { success, error: toastError } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [direction, setDirection] = useState("");
  const [action, setAction] = useState("");
  const [protocol, setProtocol] = useState("");
  const [enabled, setEnabled] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [simulateOpen, setSimulateOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const query = useDebounced(search, 300);

  const stats = useApi<any>("/firewall-rules/stats", { refreshInterval: 60000 });
  const listPath = useMemo(
    () => `/firewall-rules${buildQuery({ page, limit: 12, q: query || undefined, direction: direction || undefined, action: action || undefined, protocol: protocol || undefined, enabled: enabled || undefined })}`,
    [page, query, direction, action, protocol, enabled],
  );
  const { data, loading, error, refetch, refreshing } = useApi<any>(listPath, { refreshInterval: 45000 });

  useEffect(() => setPage(1), [query, direction, action, protocol, enabled]);

  const statsData = stats.data?.data;
  const summary = statsData?.summary;
  const byAction = statsData?.byAction || [];
  const byDirection = statsData?.byDirection || [];
  const topHits = statsData?.topHits || [];
  const denyCount = byAction.find((item: any) => item.action === "deny")?.total || 0;

  const toggleRule = async (rule: any) => {
    setBusyId(rule.id);
    try {
      await api(`/firewall-rules/${rule.id}/toggle`, { method: "PATCH" });
      success(rule.enabled ? "Rule disabled" : "Rule enabled", rule.name);
      refetch();
      stats.refetch();
    } catch (err) {
      toastError("Could not toggle rule", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusyId(null);
    }
  };

  const applyRule = async (rule: any) => {
    setBusyId(rule.id);
    try {
      const response = await api<any>(`/firewall-rules/${rule.id}/apply`, { method: "POST" });
      success("Policy applied", `Pushed to ${response.data.targets?.length || 0} enforcement points.`);
      refetch();
    } catch (err) {
      toastError("Apply failed", err instanceof Error ? err.message : "Unable to apply rule");
    } finally {
      setBusyId(null);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      await apiDownload(`/firewall-rules/export${buildQuery({ q: query || undefined, direction: direction || undefined, action: action || undefined })}`, `medicareguard-firewall-${Date.now()}.csv`);
      success("Export ready", "Firewall policy exported as CSV.");
    } catch (err) {
      toastError("Export failed", err instanceof Error ? err.message : "Unable to export rules");
    } finally {
      setExporting(false);
    }
  };

  const columns: Column[] = [
    {
      key: "priority",
      header: "Priority",
      width: "70px",
      render: (row) => <span className="font-mono text-[11px] text-slate-500">{row.priority}</span>,
    },
    {
      key: "name",
      header: "Rule",
      render: (row) => (
        <div className="min-w-0">
          <p className="max-w-[260px] truncate text-[12px] font-medium text-slate-200">{row.name}</p>
          <p className="max-w-[260px] truncate text-[9.5px] text-slate-600">{row.description || "No description"}</p>
        </div>
      ),
    },
    {
      key: "direction",
      header: "Direction",
      width: "100px",
      render: (row) => (
        <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
          {row.direction === "inbound" ? <ArrowDownToLine className="h-3 w-3 text-brand-400" /> : row.direction === "outbound" ? <ArrowUpFromLine className="h-3 w-3 text-cyan-400" /> : <ShieldCheck className="h-3 w-3 text-violet-400" />}
          {titleCase(row.direction)}
        </span>
      ),
    },
    {
      key: "action",
      header: "Action",
      width: "80px",
      render: (row) => <span className={cn("chip", row.action === "deny" ? "border-critical/30 bg-critical/10 text-critical" : "border-low/30 bg-low/10 text-low")}>{row.action}</span>,
    },
    {
      key: "flow",
      header: "Flow / ports",
      width: "190px",
      render: (row) => (
        <div className="font-mono text-[9px] leading-relaxed text-slate-600">
          <p className="truncate">{row.source_ip || "any"} → {row.destination_ip || "any"}</p>
          <p className="uppercase">{row.protocol} · {row.source_port || "any"} → {row.destination_port || "any"}</p>
        </div>
      ),
    },
    {
      key: "hit_count",
      header: "Hits",
      width: "90px",
      render: (row) => (
        <div>
          <p className="font-mono text-[10.5px] text-slate-400">{formatNumber(row.hit_count)}</p>
          <p className="text-[8.5px] text-slate-700">{row.last_hit_at ? relativeTime(row.last_hit_at) : "never"}</p>
        </div>
      ),
    },
    {
      key: "enabled",
      header: "Enabled",
      width: "80px",
      render: (row) => <Toggle checked={Boolean(row.enabled)} onChange={() => toggleRule(row)} label={`Toggle ${row.name}`} />,
    },
    {
      key: "apply",
      header: "",
      width: "70px",
      render: (row) => (
        <Button size="sm" variant="ghost" icon={Zap} loading={busyId === row.id} onClick={(event) => { event.stopPropagation(); applyRule(row); }}>Apply</Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Firewall Policy"
        subtitle="Network enforcement, geo-blocking and automated containment rules"
        icon={Flame}
        badge={<Badge tone="low" dot>{summary?.enabled ?? 0} enforcing</Badge>}
        actions={
          <>
            <Button icon={RefreshCw} onClick={() => { refetch(); stats.refetch(); }} loading={refreshing}>Refresh</Button>
            <Button icon={FlaskConical} onClick={() => setSimulateOpen(true)}>Simulate</Button>
            <Button icon={Download} onClick={exportCsv} loading={exporting}>Export</Button>
            <Button variant="primary" icon={Plus} onClick={() => setCreateOpen(true)}>Add rule</Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.loading && !stats.data ? (
          Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-[112px] rounded-xl" />)
        ) : (
          <>
            <StatCard label="Policy rules" value={formatNumber(summary?.total)} hint={`${summary?.enabled} enabled`} icon={Flame} tone="brand" />
            <StatCard label="Deny rules" value={formatNumber(denyCount)} hint="Active blocking" icon={ShieldCheck} tone="critical" />
            <StatCard label="Matched sessions" value={formatNumber(summary?.hits)} hint="Across all rules" icon={Zap} tone="warning" />
            <StatCard label="Enforcement points" value="3" hint="Edge US, EU and cloud WAF" icon={CheckCircle2} tone="success" />
          </>
        )}
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-3">
        <Card className="p-4 xl:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-200">Most active rules</h2>
              <p className="mt-0.5 text-[11px] text-slate-600">Session matches since last policy deploy</p>
            </div>
            <Badge>{formatNumber(summary?.hits)} hits</Badge>
          </div>
          <div className="mt-3 space-y-2.5">
            {topHits.slice(0, 6).map((rule: any) => {
              const max = Math.max(...topHits.map((item: any) => Number(item.hit_count)), 1);
              return (
                <div key={rule.id} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 truncate text-[10.5px] text-slate-400">{rule.name}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className={cn("h-full rounded-full bg-gradient-to-r", rule.action === "deny" ? "from-critical to-rose-400" : "from-brand-500 to-cyan-400")} style={{ width: `${(Number(rule.hit_count) / max) * 100}%` }} />
                  </div>
                  <span className="w-16 text-right font-mono text-[9.5px] text-slate-500">{formatNumber(rule.hit_count)}</span>
                  <span className={cn("w-10 text-right text-[8.5px] uppercase", rule.action === "deny" ? "text-critical" : "text-low")}>{rule.action}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="font-display text-sm font-semibold text-slate-200">Policy coverage</h2>
          <p className="mt-0.5 text-[11px] text-slate-600">Rules by direction</p>
          <div className="mt-3 space-y-3">
            {byDirection.map((item: any) => (
              <div key={item.direction}>
                <div className="mb-1 flex items-center justify-between text-[10px]">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    {item.direction === "inbound" ? <ArrowDownToLine className="h-3 w-3" /> : item.direction === "outbound" ? <ArrowUpFromLine className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                    {titleCase(item.direction)}
                  </span>
                  <span className="text-slate-400">{item.total} rules</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-400" style={{ width: `${(item.total / Math.max(summary?.total || 1, 1)) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
            <p className="text-[9px] uppercase tracking-[0.14em] text-slate-600">Default posture</p>
            <p className="mt-1 text-[11px] text-slate-300">Default deny inbound · allow egress via proxy</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.05] p-3.5">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-sm font-semibold text-slate-200">Policy rules</h2>
            <Badge>{data?.pagination?.total || 0} rules</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search rule, IP…" className="w-full sm:w-56" />
            <Select value={direction} onChange={(event) => setDirection(event.target.value)} className="w-32">
              <option value="">Direction</option>
              {DIRECTIONS.map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}
            </Select>
            <Select value={action} onChange={(event) => setAction(event.target.value)} className="w-28">
              <option value="">Action</option>
              {ACTIONS.map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}
            </Select>
            <Select value={protocol} onChange={(event) => setProtocol(event.target.value)} className="w-28">
              <option value="">Protocol</option>
              {PROTOCOLS.map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}
            </Select>
            <Select value={enabled} onChange={(event) => setEnabled(event.target.value)} className="w-28">
              <option value="">State</option>
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
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
            emptyTitle="No firewall rules match"
            emptyMessage="Adjust filters or create a new policy rule."
            footer={data?.pagination ? <Pagination page={data.pagination.page} pages={data.pagination.pages} total={data.pagination.total} limit={data.pagination.limit} onPage={setPage} /> : null}
          />
        )}
      </Card>

      <CreateRuleModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); refetch(); stats.refetch(); }} />
      <SimulateModal open={simulateOpen} onClose={() => setSimulateOpen(false)} rules={data?.data || []} />
    </div>
  );
}

function CreateRuleModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { success, error: toastError } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", direction: "inbound", action: "deny", protocol: "tcp",
    source_ip: "any", destination_ip: "any", source_port: "any", destination_port: "", priority: 50, enabled: true,
  });

  useEffect(() => {
    if (open) setForm({ name: "", description: "", direction: "inbound", action: "deny", protocol: "tcp", source_ip: "any", destination_ip: "any", source_port: "any", destination_port: "", priority: 50, enabled: true });
  }, [open]);

  const set = (key: string, value: string | number | boolean) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api("/firewall-rules", { method: "POST", body: { ...form, priority: Number(form.priority) } });
      success("Rule created", "The firewall policy is ready to be applied.");
      onCreated();
    } catch (err) {
      toastError("Could not create rule", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create firewall rule"
      description="Define an inbound, outbound or internal enforcement policy."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={submit}>Create rule</Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <Field label="Rule name" className="md:col-span-2">
          <Input value={form.name} onChange={(event) => set("name", event.target.value)} placeholder="e.g. Block known C2 infrastructure" required />
        </Field>
        <Field label="Description" className="md:col-span-2">
          <Input value={form.description} onChange={(event) => set("description", event.target.value)} placeholder="Why this rule exists and who owns it" />
        </Field>
        <Field label="Direction">
          <Select value={form.direction} onChange={(event) => set("direction", event.target.value)}>{DIRECTIONS.map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}</Select>
        </Field>
        <Field label="Action">
          <Select value={form.action} onChange={(event) => set("action", event.target.value)}>{ACTIONS.map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}</Select>
        </Field>
        <Field label="Protocol">
          <Select value={form.protocol} onChange={(event) => set("protocol", event.target.value)}>{PROTOCOLS.map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}</Select>
        </Field>
        <Field label="Priority" hint="Lower values are evaluated first">
          <Input type="number" value={form.priority} onChange={(event) => set("priority", Number(event.target.value))} min={1} max={1000} />
        </Field>
        <Field label="Source IP / CIDR">
          <Input value={form.source_ip} onChange={(event) => set("source_ip", event.target.value)} className="font-mono" placeholder="any" />
        </Field>
        <Field label="Destination IP / CIDR">
          <Input value={form.destination_ip} onChange={(event) => set("destination_ip", event.target.value)} className="font-mono" placeholder="any" />
        </Field>
        <Field label="Source port">
          <Input value={form.source_port} onChange={(event) => set("source_port", event.target.value)} className="font-mono" placeholder="any" />
        </Field>
        <Field label="Destination port">
          <Input value={form.destination_port} onChange={(event) => set("destination_port", event.target.value)} className="font-mono" placeholder="443" />
        </Field>
        <div className="flex items-center gap-2 md:col-span-2">
          <Toggle checked={form.enabled} onChange={(value) => set("enabled", value)} label="Enable rule" />
          <span className="text-[11px] text-slate-500">Enable immediately after creation</span>
        </div>
      </form>
    </Modal>
  );
}

function SimulateModal({ open, onClose, rules }: { open: boolean; onClose: () => void; rules: any[] }) {
  const { error: toastError } = useToast();
  const [ruleId, setRuleId] = useState("");
  const [form, setForm] = useState({ source_ip: "203.0.113.42", destination_ip: "10.10.2.11", protocol: "tcp", destination_port: "443" });
  const [result, setResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (open) { setRuleId(rules[0]?.id || ""); setResult(null); }
  }, [open, rules]);

  useEffect(() => {
    if (rules[0]?.id && !ruleId) setRuleId(rules[0].id);
  }, [rules, ruleId]);

  const run = async () => {
    if (!ruleId) return;
    setTesting(true);
    try {
      const response = await api<any>(`/firewall-rules/${ruleId}/test`, { method: "POST", body: form });
      setResult(response.data);
    } catch (err) {
      toastError("Simulation failed", err instanceof Error ? err.message : "Unable to test rule");
    } finally {
      setTesting(false);
    }
  };

  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Policy simulator"
      description="Evaluate a synthetic traffic flow against a firewall rule."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button variant="primary" icon={FlaskConical} loading={testing} onClick={run}>Run simulation</Button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Rule" className="md:col-span-2">
          <Select value={ruleId} onChange={(event) => setRuleId(event.target.value)}>
            {rules.map((rule) => <option key={rule.id} value={rule.id}>{rule.priority} · {rule.name} ({rule.action})</option>)}
          </Select>
        </Field>
        <Field label="Source IP">
          <Input value={form.source_ip} onChange={(event) => set("source_ip", event.target.value)} className="font-mono" />
        </Field>
        <Field label="Destination IP">
          <Input value={form.destination_ip} onChange={(event) => set("destination_ip", event.target.value)} className="font-mono" />
        </Field>
        <Field label="Protocol">
          <Select value={form.protocol} onChange={(event) => set("protocol", event.target.value)}>{PROTOCOLS.map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}</Select>
        </Field>
        <Field label="Destination port">
          <Input value={form.destination_port} onChange={(event) => set("destination_port", event.target.value)} className="font-mono" />
        </Field>
      </div>
      {result && (
        <div className={cn("mt-4 rounded-xl border p-4", result.matched ? "border-critical/25 bg-critical/[0.06]" : "border-low/25 bg-low/[0.06]")}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-200">{result.matched ? "Rule matched" : "No match"}</p>
            <Badge tone={result.verdict === "deny" ? "critical" : "low"}>{String(result.verdict).toUpperCase()}</Badge>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px]">
            {Object.entries(result.checks || {}).map(([key, value]) => (
              <div key={key} className="flex items-center gap-1.5 text-slate-500">
                <span className={cn("h-1 w-1 rounded-full", value ? "bg-low" : "bg-critical")} />
                {titleCase(key)}: <span className={value ? "text-low" : "text-critical"}>{value ? "pass" : "fail"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
