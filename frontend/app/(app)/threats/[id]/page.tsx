"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Ban,
  Bot,
  Check,
  Copy,
  Crosshair,
  Fingerprint,
  Globe2,
  Layers,
  Loader2,
  Radar,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Waypoints,
} from "lucide-react";
import { api, useApi } from "@/lib/api";
import { cn, countryFlag, formatDate, relativeTime, titleCase } from "@/lib/utils";
import { ComplianceGauge } from "@/components/charts";
import { DataTable, type Column } from "@/components/DataTable";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, ConfirmDialog, ErrorState, KeyValue, PageHeader, SeverityBadge, Skeleton, StatusBadge } from "@/components/ui";

export default function ThreatDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const { data, loading, error, refetch } = useApi<any>(`/threats/${id}`);
  const [enriching, setEnriching] = useState(false);
  const [enriched, setEnriched] = useState<any>(null);
  const [blocking, setBlocking] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [copied, setCopied] = useState(false);

  const threat = data?.data;
  const metadata = threat?.metadata || {};

  const enrich = async () => {
    setEnriching(true);
    try {
      const response = await api<any>(`/threats/${id}/enrich`, { method: "POST" });
      setEnriched(response.data);
      success("Enrichment complete", `${response.data.intel_matches?.length || 0} CTI matches resolved.`);
      refetch();
    } catch (err) {
      toastError("Enrichment failed", err instanceof Error ? err.message : "Unable to enrich threat");
    } finally {
      setEnriching(false);
    }
  };

  const block = async () => {
    setBlocking(true);
    try {
      const response = await api<any>(`/threats/${id}/block`, { method: "POST" });
      success("Indicator blocked", `${response.data.indicator} was denied at the edge firewall.`);
      setConfirmBlock(false);
      refetch();
    } catch (err) {
      toastError("Block failed", err instanceof Error ? err.message : "Unable to create firewall rule");
    } finally {
      setBlocking(false);
    }
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toastError("Clipboard unavailable");
    }
  };

  if (loading && !threat) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-44 rounded-xl" />
        <div className="grid gap-4 xl:grid-cols-3">
          <Skeleton className="h-72 rounded-xl xl:col-span-2" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error && !threat) return <Card><ErrorState message={error} onRetry={refetch} /></Card>;

  const relatedColumns: Column[] = [
    { key: "title", header: "Related alert", render: (row) => <span className="text-[11.5px] text-slate-300">{row.title}</span> },
    { key: "severity", header: "Severity", width: "100px", render: (row) => <SeverityBadge severity={row.severity} /> },
    { key: "status", header: "Status", width: "110px", render: (row) => <StatusBadge status={row.status} /> },
    { key: "detected_at", header: "Detected", width: "100px", render: (row) => <span className="text-[10px] text-slate-600">{relativeTime(row.detected_at)}</span> },
    { key: "open", header: "", width: "34px", render: () => <ArrowUpRight className="h-3 w-3 text-slate-700" /> },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] text-slate-600">
          <Link href="/threats" className="flex items-center gap-1 transition hover:text-brand-300"><ArrowLeft className="h-3 w-3" /> Threat landscape</Link>
          <span className="text-slate-800">/</span>
          <span className="font-mono text-slate-500">{String(id).slice(0, 8)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/ai?prompt=${encodeURIComponent(`Analyse threat "${threat.name}" (${threat.category}, risk ${threat.risk_score}) and recommend containment.`)}`}>
            <Button icon={Bot}>Ask AI</Button>
          </Link>
          <Button icon={RefreshCw} loading={enriching} onClick={enrich}>Enrich</Button>
          <Button variant="danger" icon={Ban} onClick={() => setConfirmBlock(true)} disabled={threat.status === "blocked"}>
            {threat.status === "blocked" ? "Blocked" : "Block indicator"}
          </Button>
        </div>
      </div>

      <Card className="mb-4 overflow-hidden">
        <div className={cn("h-1 w-full", threat.severity === "critical" ? "bg-gradient-to-r from-critical via-rose-500 to-transparent" : "bg-gradient-to-r from-high to-transparent")} />
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={threat.severity} />
            <StatusBadge status={threat.status} />
            <Badge>{threat.category || "Uncategorised"}</Badge>
            {threat.country && <Badge>{countryFlag(threat.country_code)} {threat.country}</Badge>}
            <span className="ml-auto text-[10px] text-slate-600">Last observed {formatDate(threat.last_seen)}</span>
          </div>
          <h1 className="mt-3 font-display text-xl font-semibold tracking-tight text-white md:text-2xl">{threat.name}</h1>
          <p className="mt-2 max-w-4xl text-[13px] leading-relaxed text-slate-400">{threat.description || "No description recorded for this threat."}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {metadata.actor && <span className="chip border-violet-400/20 bg-violet-500/10 text-violet-200">actor · {metadata.actor}</span>}
            {metadata.campaign && <span className="chip border-brand-400/20 bg-brand-500/10 text-brand-200">campaign · {metadata.campaign}</span>}
            {metadata.kill_chain && <span className="chip border-cyan-400/20 bg-cyan-500/10 text-cyan-200">stage · {metadata.kill_chain}</span>}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-sm font-semibold text-slate-200">Indicators of compromise</h2>
                <p className="mt-0.5 text-[11px] text-slate-600">Observable artefacts associated with this threat</p>
              </div>
              <Fingerprint className="h-4 w-4 text-brand-400" />
            </div>
            <div className="mt-3 space-y-2">
              <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[9px] uppercase tracking-[0.16em] text-slate-600">Source IP</p>
                  <span className="text-[8px] uppercase tracking-wider text-slate-700">network</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="font-mono text-[12px] text-slate-300">{threat.source_ip || "not observed"}</p>
                  {threat.source_ip && <Button size="sm" variant="ghost" onClick={() => copy(threat.source_ip)}>{copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}</Button>}
                </div>
              </div>
              {threat.ioc_type && (
                <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[9px] uppercase tracking-[0.16em] text-slate-600">Indicator · {threat.ioc_type}</p>
                    <span className="text-[8px] uppercase tracking-wider text-slate-700">{threat.confidence}% confidence</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="break-all font-mono text-[11px] text-slate-300">{threat.ioc_value || "—"}</p>
                    {threat.ioc_value && <Button size="sm" variant="ghost" onClick={() => copy(threat.ioc_value)}><Copy className="h-3 w-3" /></Button>}
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-sm font-semibold text-slate-200">MITRE ATT&CK coverage</h2>
                <p className="mt-0.5 text-[11px] text-slate-600">Behavioural mapping for detection engineering</p>
              </div>
              <Crosshair className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3.5">
                <p className="text-[9px] uppercase tracking-[0.16em] text-slate-600">Tactic</p>
                <p className="mt-1 text-[13px] font-medium text-slate-200">{threat.mitre_tactic?.replace(/^(TA\d+)\s*/, "") || "Unmapped"}</p>
                <p className="mt-1 font-mono text-[9px] text-brand-300/80">{threat.mitre_tactic?.split(" ")[0] || "—"}</p>
              </div>
              <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3.5">
                <p className="text-[9px] uppercase tracking-[0.16em] text-slate-600">Technique</p>
                <p className="mt-1 text-[13px] font-medium text-slate-200">{threat.mitre_technique?.replace(/^(T\d+\.?\d*)\s*/, "") || "Unmapped"}</p>
                <p className="mt-1 font-mono text-[9px] text-cyan-300/80">{threat.mitre_technique?.split(" ")[0] || "—"}</p>
              </div>
            </div>
          </Card>

          {enriched && (
            <Card className="border-cyan-400/20 bg-gradient-to-b from-cyan-500/[0.05] to-transparent p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-300" />
                <h2 className="font-display text-sm font-semibold text-slate-200">CTI enrichment</h2>
                <Badge tone={enriched.enrichment?.verdict === "malicious" ? "critical" : "warning"} className="ml-auto">{titleCase(enriched.enrichment?.verdict)}</Badge>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
                <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-2">
                  <p className="text-slate-600">Provider</p>
                  <p className="mt-0.5 text-slate-300">{enriched.enrichment?.provider || "MedicareGuard CTI"}</p>
                </div>
                <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-2">
                  <p className="text-slate-600">Confidence</p>
                  <p className="mt-0.5 text-slate-300">{enriched.enrichment?.confidence}%</p>
                </div>
                <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-2">
                  <p className="text-slate-600">Matches</p>
                  <p className="mt-0.5 text-slate-300">{enriched.intel_matches?.length || 0}</p>
                </div>
              </div>
              <div className="mt-2 space-y-1.5">
                {(enriched.intel_matches || []).map((match: any, index: number) => (
                  <div key={index} className="flex items-center gap-2 rounded-lg border border-white/[0.04] px-2.5 py-1.5 text-[10px]">
                    <Waypoints className="h-3 w-3 text-cyan-400" />
                    <span className="truncate font-mono text-slate-400">{match.indicator}</span>
                    <span className="ml-auto text-slate-600">{titleCase(match.type || match.ioc_type)}</span>
                  </div>
                ))}
                {!enriched.intel_matches?.length && <p className="text-[10px] text-slate-600">No external CTI matches were found for this indicator.</p>}
              </div>
            </Card>
          )}

          <Card>
            <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3">
              <div>
                <h2 className="font-display text-sm font-semibold text-slate-200">Related alerts</h2>
                <p className="mt-0.5 text-[11px] text-slate-600">Detections attributed to this threat</p>
              </div>
              <Badge>{threat.related_alerts?.length || 0} alerts</Badge>
            </div>
            <DataTable
              rows={threat.related_alerts}
              columns={relatedColumns}
              rowKey="id"
              emptyTitle="No correlated alerts"
              emptyMessage="This threat has not raised any detections yet."
              onRowClick={(row) => router.push(`/alerts/${row.id}`)}
            />
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-sm font-semibold text-slate-200">Threat score</h2>
                <p className="mt-0.5 text-[11px] text-slate-600">Risk-weighted indicator score</p>
              </div>
              <Radar className="h-4 w-4 text-brand-400" />
            </div>
            <ComplianceGauge score={threat.risk_score || 0} size={168} label="Risk score" />
            <div className="mt-1">
              <KeyValue label="Confidence" value={`${threat.confidence}%`} />
              <KeyValue label="First seen" value={formatDate(threat.first_seen)} />
              <KeyValue label="Last seen" value={formatDate(threat.last_seen)} />
              <KeyValue label="Status" value={<StatusBadge status={threat.status} />} />
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="font-display text-sm font-semibold text-slate-200">Attribution</h2>
            <div className="mt-2">
              <KeyValue label="Actor" value={metadata.actor || "Unattributed"} />
              <KeyValue label="Campaign" value={metadata.campaign || "—"} />
              <KeyValue label="Kill chain" value={titleCase(metadata.kill_chain)} />
              <KeyValue label="Origin" value={threat.country ? `${countryFlag(threat.country_code)} ${threat.country}` : "—"} />
              <KeyValue label="Source" value={threat.source || "—"} />
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="font-display text-sm font-semibold text-slate-200">Containment</h2>
            <p className="mt-1 text-[10.5px] leading-relaxed text-slate-600">
              Blocking creates a priority-10 deny rule at the edge firewall and records the indicator in the global blocklist.
            </p>
            <Button variant="danger" icon={Ban} className="mt-3 w-full" onClick={() => setConfirmBlock(true)} disabled={threat.status === "blocked"}>
              {threat.status === "blocked" ? "Indicator blocked" : "Block at firewall"}
            </Button>
            <Button className="mt-2 w-full" icon={RefreshCw} onClick={enrich} loading={enriching}>Refresh CTI enrichment</Button>
            <Link href="/firewall" className="mt-2 flex items-center justify-center gap-1 text-[10px] text-slate-500 transition hover:text-brand-300">
              View firewall policy <ArrowRight className="h-3 w-3" />
            </Link>
          </Card>

          <Card className="p-4">
            <h2 className="font-display text-sm font-semibold text-slate-200">Response playbook</h2>
            <div className="mt-2 space-y-2">
              {["Block the indicator at the edge", "Hunt for the IOC across all telemetry", "Isolate affected assets and rotate credentials", "Update detections and notify stakeholders"].map((step, index) => (
                <div key={step} className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-brand-500/10 font-mono text-[9px] text-brand-300">{index + 1}</span>
                  <p className="text-[10.5px] leading-relaxed text-slate-500">{step}</p>
                </div>
              ))}
            </div>
            <Link href="/playbooks" className="mt-3 flex items-center gap-1 text-[10px] text-brand-300/80 transition hover:text-brand-200">
              Open playbook library <Layers className="h-3 w-3" />
            </Link>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmBlock}
        onClose={() => setConfirmBlock(false)}
        onConfirm={block}
        loading={blocking}
        title="Block indicator at firewall"
        message={`This will create a priority-10 deny rule for ${threat.source_ip || threat.ioc_value} and add it to the global blocklist. Continue?`}
        confirmLabel="Block indicator"
      />
    </div>
  );
}
