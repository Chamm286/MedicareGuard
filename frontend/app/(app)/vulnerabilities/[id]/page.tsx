"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Bot, Bug, CheckCircle2, ShieldCheck, Siren, Wrench } from "lucide-react";
import { api, useApi } from "@/lib/api";
import { cn, formatDate, riskBar, titleCase } from "@/lib/utils";
import { ComplianceGauge } from "@/components/charts";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, ErrorState, KeyValue, PageHeader, ProgressBar, SeverityBadge, Skeleton, StatusBadge, Select } from "@/components/ui";

const STATUSES = ["open", "in_progress", "resolved", "accepted"];

export default function VulnerabilityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { success, error: toastError } = useToast();
  const { data, loading, error, refetch } = useApi<any>(`/vulnerabilities/${id}`);
  const [updating, setUpdating] = useState(false);
  const vuln = data?.data;
  const asset = useApi<any>(vuln?.asset_id ? `/assets/${vuln.asset_id}` : null);

  const setStatus = async (status: string) => {
    setUpdating(true);
    try {
      await api(`/vulnerabilities/${id}`, { method: "PATCH", body: { status } });
      success("Status updated", `Vulnerability moved to ${titleCase(status)}.`);
      refetch();
    } catch (err) {
      toastError("Update failed", err instanceof Error ? err.message : "Unable to update status");
    } finally {
      setUpdating(false);
    }
  };

  if (loading && !vuln) {
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

  if (error && !vuln) return <Card><ErrorState message={error} onRetry={refetch} /></Card>;

  const cvss = Number(vuln.cvss_score || 0);
  const difficulty = cvss >= 9 ? "Trivial — likely weaponised" : cvss >= 7 ? "Moderate — public exploit possible" : cvss >= 4 ? "Hard — requires specific conditions" : "Low — limited exploitability";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] text-slate-600">
          <Link href="/vulnerabilities" className="flex items-center gap-1 transition hover:text-brand-300"><ArrowLeft className="h-3 w-3" /> Vulnerability register</Link>
          <span className="text-slate-800">/</span>
          <span className="font-mono text-slate-500">{vuln.cve_id || String(id).slice(0, 8)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/ai?prompt=${encodeURIComponent(`Explain ${vuln.cve_id || vuln.title} (CVSS ${vuln.cvss_score}) and give me a remediation plan for ${asset.data?.data?.name || "the affected asset"}.`)}`}>
            <Button icon={Bot}>Ask AI</Button>
          </Link>
          <Button variant="primary" icon={CheckCircle2} onClick={() => setStatus("resolved")} disabled={vuln.status === "resolved" || updating}>Mark resolved</Button>
        </div>
      </div>

      <Card className="mb-4 overflow-hidden">
        <div className={cn("h-1 w-full", cvss >= 9 ? "bg-gradient-to-r from-critical via-rose-500 to-transparent" : "bg-gradient-to-r from-high to-transparent")} />
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            {vuln.cve_id && <span className="rounded border border-brand-400/25 bg-brand-500/10 px-1.5 py-0.5 font-mono text-[10px] text-brand-300">{vuln.cve_id}</span>}
            <SeverityBadge severity={vuln.severity} />
            <StatusBadge status={vuln.status} />
            <Badge>CVSS {vuln.cvss_score}</Badge>
            <span className="ml-auto text-[10px] text-slate-600">Discovered {formatDate(vuln.created_at)}</span>
          </div>
          <h1 className="mt-3 font-display text-xl font-semibold tracking-tight text-white md:text-2xl">{vuln.title}</h1>
          <p className="mt-2 max-w-4xl text-[13px] leading-relaxed text-slate-400">{vuln.description || "No technical description was recorded for this vulnerability."}</p>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-sm font-semibold text-slate-200">Impact assessment</h2>
                <p className="mt-0.5 text-[11px] text-slate-600">CVSS-derived exploitability and business exposure</p>
              </div>
              <Bug className="h-4 w-4 text-high" />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                <p className="text-[9px] uppercase tracking-[0.14em] text-slate-600">CVSS score</p>
                <p className={cn("mt-1 font-display text-2xl font-semibold", cvss >= 9 ? "text-critical" : cvss >= 7 ? "text-high" : "text-medium")}>{cvss.toFixed(1)}</p>
                <p className="text-[9px] text-slate-700">out of 10</p>
              </div>
              <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 sm:col-span-2">
                <p className="text-[9px] uppercase tracking-[0.14em] text-slate-600">Exploit likelihood</p>
                <p className="mt-1 text-[12px] text-slate-300">{difficulty}</p>
                <ProgressBar value={cvss * 10} barClassName={cvss >= 9 ? "from-critical to-rose-400" : "from-high to-amber-400"} className="mt-2" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-sm font-semibold text-slate-200">Remediation plan</h2>
                <p className="mt-0.5 text-[11px] text-slate-600">Recommended response sequence</p>
              </div>
              <Wrench className="h-4 w-4 text-brand-400" />
            </div>
            <div className="mt-3 space-y-2.5">
              {[
                { title: "Validate exposure", detail: "Confirm the affected version and reachable attack surface." },
                { title: "Apply vendor patch", detail: "Deploy the fixed release through the change management process." },
                { title: "Compensating controls", detail: "If patching is delayed, enforce WAF, firewall or segmentation controls." },
                { title: "Verify remediation", detail: "Run an authenticated scan and confirm the finding is closed." },
              ].map((step, index) => (
                <div key={step.title} className="flex gap-3 rounded-xl border border-white/[0.04] bg-white/[0.015] p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 font-mono text-[9px] text-brand-300">{index + 1}</span>
                  <div>
                    <p className="text-[11px] font-medium text-slate-300">{step.title}</p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-slate-600">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="font-display text-sm font-semibold text-slate-200">Finding details</h2>
            <div className="mt-2">
              <KeyValue label="CVE ID" value={vuln.cve_id || "—"} mono />
              <KeyValue label="Severity" value={<SeverityBadge severity={vuln.severity} />} />
              <KeyValue label="CVSS" value={vuln.cvss_score} />
              <KeyValue label="Status" value={<StatusBadge status={vuln.status} />} />
              <KeyValue label="Discovered" value={formatDate(vuln.created_at)} />
              <KeyValue label="Updated" value={formatDate(vuln.updated_at)} />
              <KeyValue label="Record ID" value={<span className="font-mono text-[10px]">{vuln.id}</span>} />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="font-display text-sm font-semibold text-slate-200">CVSS gauge</h2>
            <ComplianceGauge score={cvss * 10} size={168} label="Severity score" />
            <p className="text-center text-[10px] text-slate-600">Normalised to 100</p>
          </Card>

          <Card className="p-4">
            <h2 className="font-display text-sm font-semibold text-slate-200">Affected asset</h2>
            {asset.data?.data ? (
              <Link href={`/assets/${asset.data.data.id}`} className="mt-3 block rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition hover:bg-white/[0.04]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[12px] font-medium text-slate-200">{asset.data.data.name}</p>
                    <p className="mt-0.5 font-mono text-[9.5px] text-slate-600">{asset.data.data.ip_address} · {titleCase(asset.data.data.type)}</p>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-slate-600" />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <StatusBadge status={asset.data.data.status} />
                  <span className="text-[9px] text-slate-600">{asset.data.data.criticality} criticality</span>
                </div>
              </Link>
            ) : (
              <p className="mt-2 text-[11px] text-slate-600">No asset is mapped to this finding.</p>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="font-display text-sm font-semibold text-slate-200">Remediation status</h2>
            <div className="mt-3">
              <Select value={vuln.status} onChange={(event) => setStatus(event.target.value)} disabled={updating}>
                {STATUSES.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}
              </Select>
            </div>
            <div className="mt-3 space-y-2">
              <Button variant="primary" className="w-full" icon={ShieldCheck} onClick={() => setStatus("resolved")} loading={updating} disabled={vuln.status === "resolved"}>Confirm remediation</Button>
              <Button className="w-full" icon={Siren} onClick={() => setStatus("accepted")} disabled={vuln.status === "accepted" || updating}>Accept risk</Button>
            </div>
            <p className="mt-2 text-[9px] leading-relaxed text-slate-700">Accepted risk requires compensating controls and management approval.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
