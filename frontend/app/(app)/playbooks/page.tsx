"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowRight, BookOpen, CheckCircle2, Clock, ListTree, Play, Plus, RefreshCw, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { api, useApi } from "@/lib/api";
import { cn, formatDate, titleCase } from "@/lib/utils";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, ErrorState, Field, Input, Modal, PageHeader, ProgressBar, Select, Skeleton, StatCard, StatusBadge, Textarea } from "@/components/ui";

export default function PlaybooksPage() {
  const { success, error: toastError } = useToast();
  const { data, loading, error, refetch, refreshing } = useApi<any>("/playbooks?limit=100", { refreshInterval: 60000 });
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [runStep, setRunStep] = useState(0);

  const playbooks = data?.data || [];
  const active = playbooks.filter((item: any) => item.status === "active").length;
  const categories = useMemo(() => {
    const grouped: Record<string, number> = {};
    playbooks.forEach((item: any) => { grouped[item.category || "uncategorised"] = (grouped[item.category || "uncategorised"] || 0) + 1; });
    return Object.entries(grouped).sort((a, b) => b[1] - a[1]);
  }, [playbooks]);
  const totalSteps = playbooks.reduce((sum: number, item: any) => sum + (item.steps?.length || 0), 0);

  const openPlaybook = (playbook: any) => {
    setSelected(playbook);
    setRunStep(0);
    setRunning(false);
  };

  const simulate = () => {
    if (!selected) return;
    setRunning(true);
    setRunStep(0);
    const steps = selected.steps?.length || 0;
    let index = 0;
    const interval = setInterval(() => {
      index += 1;
      setRunStep(index);
      if (index >= steps) {
        clearInterval(interval);
        setRunning(false);
        success("Playbook completed", `${selected.name} finished ${steps} steps successfully.`);
      }
    }, 800);
  };

  return (
    <div>
      <PageHeader
        title="Response Playbooks"
        subtitle="Repeatable, auditable procedures for every incident class the SOC handles"
        icon={ListTree}
        badge={<Badge tone="low" dot>{active} active</Badge>}
        actions={
          <>
            <Button icon={RefreshCw} onClick={refetch} loading={refreshing}>Refresh</Button>
            <Button variant="primary" icon={Plus} onClick={() => setCreateOpen(true)}>New playbook</Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {loading && !data ? (
          Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-[112px] rounded-xl" />)
        ) : (
          <>
            <StatCard label="Playbooks" value={playbooks.length} hint={`${categories.length} categories`} icon={BookOpen} tone="brand" />
            <StatCard label="Active" value={active} hint="Ready for execution" icon={ShieldCheck} tone="success" />
            <StatCard label="Response steps" value={totalSteps} hint="Documented procedures" icon={Workflow} tone="cyan" />
            <StatCard label="Coverage" value={`${categories.length}`} hint="Incident classes" icon={Sparkles} tone="warning" />
          </>
        )}
      </div>

      {error && !data ? (
        <Card><ErrorState message={error} onRetry={refetch} /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {playbooks.map((playbook: any) => (
            <Card key={playbook.id} className="panel-hover group flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-400/20 bg-brand-500/10 text-brand-300">
                  <ListTree className="h-4 w-4" />
                </div>
                <StatusBadge status={playbook.status} />
              </div>
              <h2 className="mt-3 font-display text-[14px] font-semibold text-slate-100">{playbook.name}</h2>
              <p className="mt-1 line-clamp-2 min-h-[30px] text-[10.5px] leading-relaxed text-slate-600">{playbook.description || "No description provided."}</p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Badge>{titleCase(playbook.category)}</Badge>
                <Badge>{playbook.steps?.length || 0} steps</Badge>
              </div>
              <div className="mt-3 space-y-1.5 rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5">
                {(playbook.steps || []).slice(0, 3).map((step: any) => (
                  <div key={step.order} className="flex items-center gap-2 text-[9.5px] text-slate-500">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-white/[0.04] font-mono text-[8px] text-slate-600">{step.order}</span>
                    <span className="truncate">{step.title}</span>
                  </div>
                ))}
                {(playbook.steps?.length || 0) > 3 && <p className="pl-6 text-[9px] text-slate-700">+{playbook.steps.length - 3} more steps</p>}
              </div>
              <div className="mt-auto flex items-center justify-between pt-3">
                <span className="text-[9px] text-slate-700">Updated {formatDate(playbook.updated_at, { day: "2-digit", month: "short" })}</span>
                <Button size="sm" variant="ghost" onClick={() => openPlaybook(playbook)}>Open <ArrowRight className="h-3 w-3" /></Button>
              </div>
            </Card>
          ))}
          {!loading && !playbooks.length && (
            <Card className="md:col-span-2 xl:col-span-3">
              <div className="flex flex-col items-center py-14">
                <ListTree className="h-8 w-8 text-slate-700" />
                <p className="mt-3 text-sm text-slate-400">No playbooks yet</p>
                <Button className="mt-3" onClick={() => setCreateOpen(true)}>Create the first playbook</Button>
              </div>
            </Card>
          )}
        </div>
      )}

      <Modal
        open={Boolean(selected)}
        onClose={() => { setSelected(null); setRunning(false); }}
        title={selected?.name || "Playbook"}
        description={selected ? `${titleCase(selected.category)} · ${selected.steps?.length || 0} response steps` : undefined}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
            <Button variant="primary" icon={Play} loading={running} onClick={simulate} disabled={!selected || running}>Execute playbook</Button>
          </>
        }
      >
        {selected && (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={selected.status} />
              <Badge>{titleCase(selected.category)}</Badge>
              <Badge>{selected.steps?.length || 0} steps</Badge>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-slate-400">{selected.description}</p>
            <div className="mt-4 space-y-2.5">
              {(selected.steps || []).map((step: any, index: number) => {
                const done = runStep > index;
                const current = running && runStep === index;
                return (
                  <div key={step.order || index} className={cn("flex gap-3 rounded-xl border p-3 transition", done ? "border-low/25 bg-low/[0.05]" : current ? "border-brand-400/30 bg-brand-500/[0.07]" : "border-white/[0.05] bg-white/[0.015]")}>
                    <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono text-[9px]", done ? "bg-low/15 text-low" : current ? "bg-brand-500/20 text-brand-200" : "bg-white/[0.04] text-slate-600")}>
                      {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : step.order || index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-[11.5px] font-medium", done ? "text-emerald-200" : "text-slate-300")}>{step.title}</p>
                      {step.owner && <p className="mt-0.5 text-[9px] text-slate-600">Owner · {step.owner} {step.sla_minutes ? `· ${step.sla_minutes}m SLA` : ""}</p>}
                    </div>
                    {current && <span className="text-[9px] text-brand-300">running…</span>}
                    {done && <span className="text-[9px] text-low">done</span>}
                  </div>
                );
              })}
            </div>
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[9px] text-slate-600">
                <span>Execution progress</span>
                <span>{Math.min(runStep, selected.steps?.length || 0)} / {selected.steps?.length || 0}</span>
              </div>
              <ProgressBar value={(Math.min(runStep, selected.steps?.length || 0) / Math.max(selected.steps?.length || 1, 1)) * 100} barClassName="from-low to-cyan-400" />
            </div>
          </div>
        )}
      </Modal>

      <CreatePlaybookModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); refetch(); }} />
    </div>
  );
}

function CreatePlaybookModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { success, error: toastError } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", category: "malware", status: "active", description: "", steps: "" });

  useEffect(() => {
    if (open) setForm({ name: "", category: "malware", status: "active", description: "", steps: "" });
  }, [open]);

  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const steps = form.steps.split("\n").map((line) => line.trim()).filter(Boolean).map((title, index) => ({ order: index + 1, title }));
      await api("/playbooks", { method: "POST", body: { name: form.name, category: form.category, status: form.status, description: form.description, steps } });
      success("Playbook created", "The procedure is available to the response team.");
      onCreated();
    } catch (err) {
      toastError("Could not create playbook", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New response playbook"
      description="Document the steps analysts should follow for an incident class."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={submit}>Create playbook</Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <Field label="Playbook name" className="md:col-span-2">
          <Input value={form.name} onChange={(event) => set("name", event.target.value)} placeholder="e.g. Ransomware containment" required />
        </Field>
        <Field label="Category">
          <Select value={form.category} onChange={(event) => set("category", event.target.value)}>
            {["malware", "ransomware", "phishing", "data-breach", "vulnerability", "availability", "insider", "generic"].map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={(event) => set("status", event.target.value)}>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="disabled">Disabled</option>
          </Select>
        </Field>
        <Field label="Description" className="md:col-span-2">
          <Textarea value={form.description} onChange={(event) => set("description", event.target.value)} placeholder="When to use this playbook and what outcome it achieves…" />
        </Field>
        <Field label="Response steps" hint="One step per line" className="md:col-span-2">
          <Textarea value={form.steps} onChange={(event) => set("steps", event.target.value)} placeholder={"Validate the detection\nIsolate affected assets\nCollect forensic evidence\nEradicate persistence\nRestore from backup"} className="min-h-[130px]" />
        </Field>
      </form>
    </Modal>
  );
}
