"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Clock,
  Crosshair,
  Fingerprint,
  Globe2,
  Loader2,
  MessageSquare,
  Send,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { api, useApi } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { cn, countryFlag, formatDate, formatNumber, relativeTime, severityDot, titleCase } from "@/lib/utils";
import { ComplianceGauge } from "@/components/charts";
import { Markdown } from "@/components/Markdown";
import { useToast } from "@/components/toast";
import {
  Avatar,
  Badge,
  Button,
  Card,
  ErrorState,
  Field,
  KeyValue,
  Modal,
  Select,
  SeverityBadge,
  Skeleton,
  StatusBadge,
  Textarea,
} from "@/components/ui";

const STATUSES = ["open", "investigating", "contained", "resolved", "false_positive"];

export default function AlertDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { success, error: toastError } = useToast();
  const { data, loading, error, refetch } = useApi<any>(`/alerts/${id}`);
  const timeline = useApi<any>(`/alerts/${id}/timeline`);
  const users = useApi<any>("/users?limit=100");
  const [updating, setUpdating] = useState(false);
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolution, setResolution] = useState("resolved");
  const [rootCause, setRootCause] = useState("");

  const alert = data?.data;
  const currentUser = getUser();
  const canWrite = useMemo(() => !["viewer"].includes(String(currentUser?.role || "").toLowerCase()), [currentUser?.role]);

  useEffect(() => {
    if (alert) {
      setResolution(alert.status === "false_positive" ? "false_positive" : "resolved");
    }
  }, [alert?.status]);

  const updateStatus = async (status: string) => {
    setUpdating(true);
    try {
      await api(`/alerts/${id}/status`, { method: "PATCH", body: { status } });
      success("Status updated", `Alert moved to ${titleCase(status)}.`);
      refetch();
      timeline.refetch();
    } catch (err) {
      toastError("Update failed", err instanceof Error ? err.message : "Unable to change status");
    } finally {
      setUpdating(false);
    }
  };

  const updateAssignee = async (assigneeId: string) => {
    setUpdating(true);
    try {
      await api(`/alerts/${id}/assign`, { method: "POST", body: { assigneeId: assigneeId || null } });
      success("Assignment updated");
      refetch();
    } catch (err) {
      toastError("Assignment failed", err instanceof Error ? err.message : "Unable to assign alert");
    } finally {
      setUpdating(false);
    }
  };

  const resolve = async () => {
    setResolving(true);
    try {
      await api(`/alerts/${id}/resolve`, { method: "POST", body: { resolution, rootCause } });
      success("Alert resolved", resolution === "false_positive" ? "Marked as false positive." : "Resolution recorded in the audit trail.");
      setResolveOpen(false);
      refetch();
      timeline.refetch();
    } catch (err) {
      toastError("Could not resolve alert", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setResolving(false);
    }
  };

  const addComment = async (event: FormEvent) => {
    event.preventDefault();
    if (!comment.trim()) return;
    setPosting(true);
    try {
      await api(`/alerts/${id}/comments`, { method: "POST", body: { body: comment } });
      setComment("");
      timeline.refetch();
      success("Comment added");
    } catch (err) {
      toastError("Comment failed", err instanceof Error ? err.message : "Unable to post comment");
    } finally {
      setPosting(false);
    }
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const response = await api<any>("/ai/analyze", { method: "POST", body: { alertId: id } });
      setAnalysis(response.data.analysis);
      success("AI triage complete", "Analysis grounded on live alert and threat context.");
    } catch (err) {
      toastError("AI analysis failed", err instanceof Error ? err.message : "Unable to analyse alert");
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading && !alert) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 rounded-xl" />
        <div className="grid gap-4 xl:grid-cols-3">
          <Skeleton className="h-80 rounded-xl xl:col-span-2" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error && !alert) {
    return <Card><ErrorState message={error} onRetry={refetch} /></Card>;
  }

  const metadata = alert.metadata || {};
  const entries = timeline.data?.data || [];
  const aiPrompt = encodeURIComponent(`Triage alert "${alert.title}" (${alert.severity}, ${alert.status}). Source ${alert.source_ip || "unknown"}. What should I do next?`);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] text-slate-600">
          <Link href="/alerts" className="flex items-center gap-1 transition hover:text-brand-300">
            <ArrowLeft className="h-3 w-3" /> Alert queue
          </Link>
          <span className="text-slate-800">/</span>
          <span className="font-mono text-slate-500">{String(id).slice(0, 8)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/ai?prompt=${aiPrompt}`}>
            <Button icon={Bot}>Open AI analyst</Button>
          </Link>
          <Button variant="primary" icon={CheckCircle2} onClick={() => setResolveOpen(true)} disabled={!canWrite}>Resolve</Button>
        </div>
      </div>

      <Card className="mb-4 overflow-hidden">
        <div className={cn("h-1 w-full", alert.severity === "critical" ? "bg-gradient-to-r from-critical via-rose-500 to-transparent" : alert.severity === "high" ? "bg-gradient-to-r from-high to-transparent" : "bg-gradient-to-r from-brand-500 to-transparent")} />
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={alert.severity} />
            <StatusBadge status={alert.status} />
            <Badge>{alert.source || "sensor"}</Badge>
            {alert.country && <Badge>{countryFlag(alert.country_code)} {alert.country}</Badge>}
            <span className="ml-auto flex items-center gap-1.5 text-[10px] text-slate-600">
              <Clock className="h-3 w-3" /> Detected {formatDate(alert.detected_at)}
            </span>
          </div>
          <h1 className="mt-3 font-display text-xl font-semibold tracking-tight text-white md:text-2xl">{alert.title}</h1>
          <p className="mt-2 max-w-4xl text-[13px] leading-relaxed text-slate-400">{alert.description || "No description was captured for this detection."}</p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {(alert.tags || []).map((tag: string) => <span key={tag} className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 font-mono text-[9px] text-slate-500">#{tag}</span>)}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-display text-sm font-semibold text-slate-200">MITRE ATT&CK mapping</h2>
                <p className="mt-0.5 text-[11px] text-slate-600">Adversary behaviour associated with this detection</p>
              </div>
              <Crosshair className="h-4 w-4 text-brand-400" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/[0.05] bg-gradient-to-br from-brand-500/[0.06] to-transparent p-3.5">
                <p className="text-[9px] uppercase tracking-[0.16em] text-slate-600">Tactic</p>
                <p className="mt-1 text-[13px] font-medium text-slate-200">{alert.mitre_tactic?.replace(/^(TA\d+)\s*/, "") || "Unmapped"}</p>
                <p className="mt-1 font-mono text-[9px] text-brand-300/80">{alert.mitre_tactic?.split(" ")[0] || "—"}</p>
              </div>
              <div className="rounded-xl border border-white/[0.05] bg-gradient-to-br from-cyan-500/[0.05] to-transparent p-3.5">
                <p className="text-[9px] uppercase tracking-[0.16em] text-slate-600">Technique</p>
                <p className="mt-1 text-[13px] font-medium text-slate-200">{alert.mitre_technique?.replace(/^(T\d+\.?\d*)\s*/, "") || "Unmapped"}</p>
                <p className="mt-1 font-mono text-[9px] text-cyan-300/80">{alert.mitre_technique?.split(" ")[0] || "—"}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3">
              <div>
                <h2 className="font-display text-sm font-semibold text-slate-200">Investigation timeline</h2>
                <p className="mt-0.5 text-[11px] text-slate-600">Comments and audit events for this alert</p>
              </div>
              <Badge>{entries.length} events</Badge>
            </div>

            <div className="space-y-4 p-4">
              {entries.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/[0.06] px-4 py-8 text-center">
                  <MessageSquare className="mx-auto h-5 w-5 text-slate-700" />
                  <p className="mt-2 text-xs text-slate-500">No investigation notes yet</p>
                  <p className="mt-0.5 text-[10px] text-slate-700">Add the first note to start the case timeline.</p>
                </div>
              )}
              {entries.map((entry: any, index: number) => (
                <div key={`${entry.created_at}-${index}`} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <Avatar name={entry.actor || "System"} size="xs" />
                    {index < entries.length - 1 && <div className="mt-1 w-px flex-1 bg-white/[0.06]" />}
                  </div>
                  <div className="min-w-0 flex-1 pb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-medium text-slate-300">{entry.actor || "System"}</p>
                      <Badge tone={entry.type === "comment" ? "info" : "low"} className="text-[8px]">{entry.type}</Badge>
                      <span className="text-[9px] text-slate-700">{relativeTime(entry.created_at)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-slate-500">{entry.message}</p>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={addComment} className="border-t border-white/[0.05] p-3">
              <Textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add investigation notes, evidence or next steps…" className="min-h-[74px] text-xs" disabled={!canWrite} />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[9px] text-slate-700">Notes are attached to the immutable audit trail.</span>
                <Button size="sm" variant="primary" icon={Send} loading={posting} disabled={!comment.trim() || !canWrite}>Add note</Button>
              </div>
            </form>
          </Card>

          <Card className="p-4">
            <h2 className="font-display text-sm font-semibold text-slate-200">Correlation context</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-300"><Globe2 className="h-4 w-4" /></span>
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-wider text-slate-600">Source IP</p>
                  <p className="truncate font-mono text-[11px] text-slate-300">{alert.source_ip || "internal"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-300"><Server className="h-4 w-4" /></span>
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-wider text-slate-600">Affected asset</p>
                  <p className="truncate text-[11px] text-slate-300">{alert.asset_name || metadata.assetName || "Unknown asset"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300"><Fingerprint className="h-4 w-4" /></span>
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-wider text-slate-600">Threat actor</p>
                  <p className="truncate text-[11px] text-slate-300">{metadata.threatActor || alert.threat_name || "Unattributed"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-300"><ShieldAlert className="h-4 w-4" /></span>
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-wider text-slate-600">Detection rule</p>
                  <p className="truncate font-mono text-[11px] text-slate-300">{metadata.detectionRule || "—"}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-sm font-semibold text-slate-200">Risk assessment</h2>
                <p className="mt-0.5 text-[11px] text-slate-600">Composite detection risk</p>
              </div>
              <Badge tone={alert.severity}>{titleCase(alert.severity)}</Badge>
            </div>
            <ComplianceGauge score={alert.risk_score || 0} size={168} label="Risk score" />
            <div className="mt-1 space-y-2.5">
              <div>
                <div className="mb-1 flex items-center justify-between text-[10px]">
                  <span className="text-slate-600">Detection confidence</span>
                  <span className="text-slate-400">{alert.confidence}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-400" style={{ width: `${alert.confidence}%` }} />
                </div>
              </div>
              <KeyValue label="Resolved at" value={alert.resolved_at ? formatDate(alert.resolved_at) : "Not resolved"} />
              <KeyValue label="Created" value={formatDate(alert.created_at)} />
            </div>
            <Button variant="primary" className="mt-3 w-full" icon={analyzing ? undefined : Sparkles} loading={analyzing} onClick={runAnalysis}>
              Run AI triage
            </Button>
          </Card>

          {analysis && (
            <Card className="border-brand-400/20 bg-gradient-to-b from-brand-500/[0.05] to-transparent p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300"><Sparkles className="h-3.5 w-3.5" /></span>
                <h2 className="font-display text-sm font-semibold text-slate-200">AI triage</h2>
                <Badge tone="info" className="ml-auto">{analysis.risk_score} risk</Badge>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{analysis.summary}</p>
              <div className="mt-2 flex items-center gap-3 text-[9px] text-slate-600">
                <span>Confidence {analysis.confidence}%</span>
                <span>·</span>
                <span>Containment ≈ {analysis.containment_eta_minutes}m</span>
              </div>
              <p className="mt-3 text-[9px] uppercase tracking-[0.14em] text-slate-600">Likely impact</p>
              <p className="mt-0.5 text-[11px] text-amber-200/80">{analysis.likely_impact}</p>
              <p className="mt-3 text-[9px] uppercase tracking-[0.14em] text-slate-600">Recommended actions</p>
              <ul className="mt-1.5 space-y-1.5">
                {(analysis.recommended_actions || []).map((action: string, index: number) => (
                  <li key={index} className="flex gap-2 text-[11px] leading-relaxed text-slate-400">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
                    {action}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="p-4">
            <h2 className="font-display text-sm font-semibold text-slate-200">Response actions</h2>
            <div className="mt-3 space-y-3">
              <Field label="Status">
                <Select value={alert.status} onChange={(event) => updateStatus(event.target.value)} disabled={!canWrite || updating}>
                  {STATUSES.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}
                </Select>
              </Field>
              <Field label="Assignee">
                <Select value={alert.assignee_id || ""} onChange={(event) => updateAssignee(event.target.value)} disabled={!canWrite || updating}>
                  <option value="">Unassigned</option>
                  {(users.data?.data || []).map((user: any) => <option key={user.id} value={user.id}>{user.fullName}</option>)}
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button size="sm" onClick={() => updateStatus("investigating")} disabled={!canWrite || updating}>Investigate</Button>
                <Button size="sm" onClick={() => updateStatus("contained")} disabled={!canWrite || updating}>Contain</Button>
              </div>
              <Button size="sm" variant="danger" className="w-full" icon={ShieldCheck} onClick={() => setResolveOpen(true)} disabled={!canWrite}>Resolve alert</Button>
              {!canWrite && <p className="text-center text-[9px] text-slate-700">Read-only role. Ask an analyst to take action.</p>}
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="font-display text-sm font-semibold text-slate-200">Linkage</h2>
            <div className="mt-2">
              <KeyValue label="Alert ID" value={<span className="font-mono text-[10px]">{String(alert.id).slice(0, 18)}…</span>} />
              <KeyValue label="Threat" value={alert.threat_name ? <Link href={`/threats/${alert.threat_id}`} className="text-brand-300 hover:underline">{alert.threat_name}</Link> : "—"} />
              <KeyValue label="Asset" value={alert.asset_name ? <Link href={`/assets/${alert.asset_id}`} className="text-brand-300 hover:underline">{alert.asset_name}</Link> : "—"} />
              <KeyValue label="Asset IP" value={alert.asset_ip || "—"} mono />
              <KeyValue label="Assignee" value={alert.assignee_name || "Unassigned"} />
            </div>
            <div className="mt-3 flex gap-2">
              {alert.asset_id && <Link href={`/assets/${alert.asset_id}`} className="flex-1"><Button size="sm" className="w-full">View asset <ArrowUpRight className="h-3 w-3" /></Button></Link>}
              {alert.threat_id && <Link href={`/threats/${alert.threat_id}`} className="flex-1"><Button size="sm" className="w-full">Threat intel <ArrowUpRight className="h-3 w-3" /></Button></Link>}
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={resolveOpen}
        onClose={() => setResolveOpen(false)}
        title="Resolve alert"
        description="Record the outcome and root cause for compliance evidence."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setResolveOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={resolving} onClick={resolve}>Confirm resolution</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "resolved", label: "Resolved", hint: "True positive, remediated" },
              { value: "false_positive", label: "False positive", hint: "No malicious activity" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setResolution(option.value)}
                className={cn("rounded-xl border p-3 text-left transition", resolution === option.value ? "border-brand-400/40 bg-brand-500/10" : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]")}
              >
                <p className="text-xs font-medium text-slate-200">{option.label}</p>
                <p className="mt-0.5 text-[10px] text-slate-600">{option.hint}</p>
              </button>
            ))}
          </div>
          <Field label="Root cause / resolution notes">
            <Textarea value={rootCause} onChange={(event) => setRootCause(event.target.value)} placeholder="Describe what happened, containment steps and evidence collected…" />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
