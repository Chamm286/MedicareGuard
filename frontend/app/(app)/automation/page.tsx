"use client";

import { useMemo, useState } from "react";
import { Activity, ArrowRight, Bell, CheckCircle2, Clock, Cpu, ExternalLink, GitBranch, Loader2, Play, Power, RefreshCw, RotateCcw, Server, Settings2, ShieldCheck, Timer, Workflow, Zap } from "lucide-react";
import { api, useApi } from "@/lib/api";
import { cn, formatDate, formatNumber, relativeTime, titleCase } from "@/lib/utils";
import { DataTable, type Column } from "@/components/DataTable";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, Modal, PageHeader, Skeleton, StatCard, Toggle } from "@/components/ui";

const STATUS_TONE: Record<string, string> = { success: "low", dispatched: "low", queued: "warning", failed: "critical", running: "info" };

export default function AutomationPage() {
  const { success, error: toastError, toast } = useToast();
  const { data, loading, error, refetch, refreshing } = useApi<any>("/automation/workflows", { refreshInterval: 45000 });
  const executions = useApi<any>("/automation/executions?limit=50", { refreshInterval: 30000 });
  const [running, setRunning] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<any>(null);

  const list = data?.data || [];
  const summary = data?.summary;
  const runtime = summary?.runtime;
  const runs = executions.data?.data || [];
  const selected = list.find((item: any) => item.id === selectedId);
  const selectedRuns = useMemo(() => runs.filter((run: any) => run.workflowId === selectedId), [runs, selectedId]);

  const active = list.filter((workflow: any) => workflow.enabled).length;
  const totalRuns = runs.length;
  const completed = runs.filter((run: any) => ["success", "dispatched"].includes(run.status)).length;
  const attempted = runs.filter((run: any) => ["success", "dispatched", "failed"].includes(run.status)).length;
  const successRate = attempted ? Math.round((completed / attempted) * 100) : 100;
  const avgDuration = runs.length ? Math.round(runs.reduce((sum: number, run: any) => sum + Number(run.durationMs || 0), 0) / runs.length) : 0;

  const runWorkflow = async (workflow: any) => {
    setRunning(workflow.id);
    try {
      const response = await api<any>(`/automation/workflows/${workflow.id}/run`, { method: "POST" });
      const result = response.data;
      setLastRun({ ...result, workflowName: workflow.name });
      if (result.dispatched) success("Đã gửi quy trình", `${workflow.name} đang thực thi trong n8n.`);
      else toast("Quy trình đã vào hàng đợi", { message: "Không thể truy cập n8n. Lần chạy đã được ghi lại và sẽ được gửi khi động cơ trực tuyến.", tone: "warning" });
      refetch();
      executions.refetch();
    } catch (err) {
      toastError("Không thể khởi chạy quy trình", err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setRunning(null);
    }
  };

  const toggleWorkflow = async (workflow: any) => {
    setToggling(workflow.id);
    try {
      await api(`/automation/workflows/${workflow.id}`, { method: "PATCH", body: { enabled: !workflow.enabled } });
      success(workflow.enabled ? "Đã tạm dừng quy trình" : "Đã bật quy trình", workflow.name);
      refetch();
    } catch (err) {
      toastError("Không thể cập nhật quy trình", err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setToggling(null);
    }
  };

  const columns: Column[] = [
    {
      key: "id",
      header: "Mã thực thi",
      render: (row) => (
        <div>
          <p className="font-mono text-[10px] text-slate-300">{String(row.id).slice(0, 8)}</p>
          <p className="mt-0.5 max-w-[260px] truncate text-[9px] text-slate-600">{row.message}</p>
        </div>
      ),
    },
    { key: "workflowName", header: "Quy trình", width: "210px", render: (row) => <span className="text-[10.5px] text-slate-400">{row.workflowName}</span> },
    { key: "status", header: "Trạng thái", width: "100px", render: (row) => <Badge tone={STATUS_TONE[row.status] || "neutral"} dot>{titleCase(row.status)}</Badge> },
    { key: "mode", header: "Kích hoạt", width: "150px", render: (row) => <div><p className="text-[9.5px] text-slate-500">{titleCase(row.mode)}</p><p className="text-[8.5px] text-slate-700">{row.triggeredBy}</p></div> },
    { key: "nodeCount", header: "Nút", width: "70px", render: (row) => <span className="font-mono text-[9.5px] text-slate-500">{row.nodeCount || "—"}</span> },
    { key: "durationMs", header: "Thời lượng", width: "90px", render: (row) => <span className="font-mono text-[9.5px] text-slate-500">{row.durationMs ? `${row.durationMs}ms` : "—"}</span> },
    { key: "created_at", header: "Đã bắt đầu", width: "95px", render: (row) => <span className="text-[9px] text-slate-600">{relativeTime(row.created_at)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Tự động hóa SOAR"
        subtitle="Quy trình n8n xử lý mối đe dọa, đặt lại thông tin xác thực và thu thập bằng chứng tuân thủ"
        icon={Workflow}
        badge={<Badge tone="info" dot>{active}/{list.length || 5} đang hoạt động</Badge>}
        actions={
          <>
            <Button icon={RefreshCw} onClick={() => { refetch(); executions.refetch(); }} loading={refreshing}>Làm mới</Button>
            <a href={summary?.n8n || "http://localhost:5678"} target="_blank" rel="noreferrer">
              <Button icon={ExternalLink}>Mở n8n</Button>
            </a>
          </>
        }
      />

      <Card className="mb-4 overflow-hidden">
        <div className="relative p-4">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-brand-500/[0.08] via-transparent to-cyan-500/[0.05]" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-400/25 bg-brand-500/15 text-brand-300"><GitBranch className="h-5 w-5" /></div>
              <div>
                <h2 className="font-display text-sm font-semibold text-slate-100">Nền tảng điều phối n8n</h2>
                <p className="mt-0.5 text-[10.5px] text-slate-600">Cẩm nang dựa trên webhook, kết nối với API SOC và kho dữ liệu PostgreSQL.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg border border-white/[0.06] bg-black/20 px-2 py-1 font-mono text-[9px] text-slate-500">{summary?.n8n || "http://localhost:5678"}</span>
              <Badge tone={runtime ? (runtime.online ? "low" : "critical") : "warning"} dot>{runtime ? (runtime.online ? `n8n trực tuyến · ${runtime.latencyMs}ms` : "n8n ngoại tuyến") : "đang kiểm tra n8n"}</Badge>
            </div>
          </div>
          <div className="relative mt-4 grid gap-2 sm:grid-cols-5">
            {[
              { label: "API SOC", icon: Server, detail: "REST + webhooks" },
              { label: "Động cơ n8n", icon: Workflow, detail: `${summary?.nodes || 84} nút` },
              { label: "EDR / SIEM", icon: ShieldCheck, detail: "CrowdStrike · Elastic" },
              { label: "Danh tính", icon: Settings2, detail: "Okta · Microsoft 365" },
              { label: "Cảnh báo tức thời", icon: Bell, detail: "Telegram · Gmail" },
            ].map((node, index) => (
              <div key={node.label} className="flex items-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5">
                <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-lg", index === 1 ? "bg-brand-500/15 text-brand-300" : "bg-white/[0.04] text-slate-500")}><node.icon className="h-3 w-3" /></span>
                <div className="min-w-0">
                  <p className="truncate text-[9.5px] text-slate-300">{node.label}</p>
                  <p className="truncate text-[8px] text-slate-700">{node.detail}</p>
                </div>
                {index < 4 && <ArrowRight className="ml-auto hidden h-3 w-3 shrink-0 text-slate-800 sm:block" />}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {loading && !data ? (
          Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-[112px] rounded-xl" />)
        ) : (
          <>
            <StatCard label="Quy trình đang hoạt động" value={active} hint={`${list.length} quy trình vận hành`} icon={Workflow} tone="brand" />
            <StatCard label="Số nút điều phối" value={summary?.nodes || 84} hint="Trên toàn bộ quy trình công việc" icon={Cpu} tone="cyan" />
            <StatCard label="Lần thực thi" value={formatNumber(totalRuns)} hint={`${successRate}% thành công`} icon={Activity} tone={successRate >= 95 ? "success" : "warning"} />
            <StatCard label="Thời lượng trung bình" value={avgDuration ? `${avgDuration}ms` : "—"} hint="Chạy thủ công và kích hoạt" icon={Timer} tone="warning" />
          </>
        )}
      </div>

      {error && !data ? (
        <Card><div className="p-8 text-center text-xs text-critical">{error}</div></Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {list.map((workflow: any) => (
            <Card key={workflow.id} className="panel-hover flex flex-col p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border", workflow.enabled ? "border-brand-400/20 bg-brand-500/10 text-brand-300" : "border-white/[0.06] bg-white/[0.03] text-slate-600")}>
                    <Workflow className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h2 className="font-display text-[13px] font-semibold text-slate-100">{workflow.name}</h2>
                      <Badge tone={workflow.enabled ? "low" : "neutral"} dot>{titleCase(workflow.status)}</Badge>
                    </div>
                    <p className="mt-0.5 text-[9px] text-slate-600">{titleCase(workflow.category)} · v{workflow.version} · {workflow.nodeCount} nút</p>
                  </div>
                </div>
                <Toggle checked={workflow.enabled} onChange={() => toggleWorkflow(workflow)} label={`Bật/tắt ${workflow.name}`} />
              </div>

              <p className="mt-2.5 line-clamp-2 text-[10.5px] leading-relaxed text-slate-600">{workflow.description}</p>

              <div className="mt-3 flex flex-wrap items-center gap-1">
                {workflow.stages.map((stage: any, index: number) => (
                  <div key={stage.name} className="flex items-center gap-1">
                    <span className="rounded-md border border-white/[0.05] bg-white/[0.02] px-1.5 py-0.5 text-[8px] text-slate-500">{stage.name}</span>
                    {index < workflow.stages.length - 1 && <ArrowRight className="h-2.5 w-2.5 text-slate-800" />}
                  </div>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-white/[0.04] bg-black/20 p-2">
                  <p className="text-[8px] uppercase tracking-wider text-slate-700">Chạy</p>
                  <p className="mt-0.5 font-mono text-[11px] text-slate-300">{workflow.runs}</p>
                </div>
                <div className="rounded-lg border border-white/[0.04] bg-black/20 p-2">
                  <p className="text-[8px] uppercase tracking-wider text-slate-700">Thành công</p>
                  <p className={cn("mt-0.5 font-mono text-[11px]", workflow.success_rate >= 95 ? "text-low" : "text-high")}>{workflow.success_rate}%</p>
                </div>
                <div className="rounded-lg border border-white/[0.04] bg-black/20 p-2">
                  <p className="text-[8px] uppercase tracking-wider text-slate-700">Lần chạy cuối cùng</p>
                  <p className="mt-0.5 text-[9.5px] text-slate-400">{workflow.last_run ? relativeTime(workflow.last_run) : "chưa bao giờ"}</p>
                </div>
              </div>

              <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedId(workflow.id)} className="text-[9.5px] text-slate-600 transition hover:text-brand-300">Xem đường ống →</button>
                  <a href={workflow.n8n_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[9.5px] text-slate-600 transition hover:text-brand-300">Mở ở n8n <ExternalLink className="h-2.5 w-2.5" /></a>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="hidden text-[8.5px] text-slate-700 sm:inline">{workflow.schedule}</span>
                  <Button size="sm" variant="primary" icon={Play} loading={running === workflow.id} disabled={!workflow.enabled || running === workflow.id} onClick={() => runWorkflow(workflow)}>Chạy ngay bây giờ</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.05] p-3.5">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-sm font-semibold text-slate-200">Lịch sử thực hiện</h2>
            <Badge>{runs.length}</Badge>
          </div>
          <span className="flex items-center gap-1 text-[9px] text-slate-700"><Clock className="h-2.5 w-2.5" /> Làm mới sau mỗi 30 giây</span>
        </div>
        <DataTable rows={runs} columns={columns} loading={executions.loading && !executions.data} emptyTitle="Chưa có lần thực thi nào" emptyMessage="Kích hoạt quy trình để xem lịch sử thực thi tại đây." />
      </Card>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        title={selected?.name || "Quy trình"}
        description={selected ? `${titleCase(selected.category)} · v${selected.version} · ${selected.nodeCount} nút` : undefined}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSelectedId(null)}>Đóng</Button>
            {selected && <a href={selected.n8n_url} target="_blank" rel="noreferrer"><Button variant="ghost" icon={ExternalLink}>Mở ở n8n</Button></a>}
            {selected && <Button variant="primary" icon={Play} loading={running === selected.id} disabled={!selected.enabled} onClick={() => runWorkflow(selected)}>Chạy quy trình công việc</Button>}
          </>
        }
      >
        {selected && (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={selected.enabled ? "low" : "neutral"} dot>{titleCase(selected.status)}</Badge>
              <Badge>{selected.trigger}</Badge>
              <Badge>Mục tiêu {selected.targetSla}</Badge>
            </div>
            <p className="mt-2.5 text-[12px] leading-relaxed text-slate-400">{selected.description}</p>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-white/[0.05] p-2.5"><p className="text-[8.5px] uppercase tracking-wider text-slate-700">Chủ sở hữu</p><p className="mt-0.5 text-[10.5px] text-slate-300">{selected.owner}</p></div>
              <div className="rounded-lg border border-white/[0.05] p-2.5"><p className="text-[8.5px] uppercase tracking-wider text-slate-700">Webhook</p><p className="mt-0.5 truncate font-mono text-[9.5px] text-slate-400">{selected.webhook}</p></div>
              <div className="rounded-lg border border-white/[0.05] p-2.5"><p className="text-[8.5px] uppercase tracking-wider text-slate-700">Lịch chạy</p><p className="mt-0.5 text-[10.5px] text-slate-300">{selected.schedule}</p></div>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-[9px] font-medium uppercase tracking-[0.16em] text-slate-600">Giai đoạn đường ống</p>
              <div className="space-y-2">
                {selected.stages.map((stage: any, index: number) => (
                  <div key={stage.name} className="flex gap-3 rounded-xl border border-white/[0.05] bg-white/[0.015] p-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 font-mono text-[9px] text-brand-300">{index + 1}</span>
                    <div>
                      <p className="text-[11px] font-medium text-slate-300">{stage.name}</p>
                      <p className="mt-0.5 text-[9.5px] leading-relaxed text-slate-600">{stage.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-[9px] font-medium uppercase tracking-[0.16em] text-slate-600">Hệ thống được kết nối</p>
              <div className="flex flex-wrap gap-1.5">{selected.integrations.map((integration: string) => <Badge key={integration}>{integration}</Badge>)}</div>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-[9px] font-medium uppercase tracking-[0.16em] text-slate-600">Lần thực thi gần đây</p>
              {selectedRuns.length ? (
                <div className="space-y-1.5">
                  {selectedRuns.slice(0, 5).map((run: any) => (
                    <div key={run.id} className="flex items-center justify-between rounded-lg border border-white/[0.04] px-2.5 py-1.5">
                      <div className="flex items-center gap-2">
                        {run.status === "failed" ? <RotateCcw className="h-3 w-3 text-critical" /> : <CheckCircle2 className="h-3 w-3 text-low" />}
                        <span className="font-mono text-[9px] text-slate-500">{String(run.id).slice(0, 8)}</span>
                        <span className="text-[9px] text-slate-600">{run.triggeredBy}</span>
                      </div>
                      <span className="text-[8.5px] text-slate-700">{relativeTime(run.created_at)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-white/[0.05] px-3 py-4 text-center text-[9px] text-slate-700">Không có lần thực thi nào được ghi lại cho quy trình công việc này.</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {lastRun && (
        <div className="pointer-events-none fixed bottom-5 left-5 z-[90] max-w-xs rounded-xl border border-brand-400/20 bg-surface-850/95 p-3 shadow-2xl">
          <div className="flex items-center gap-2">
            <Loader2 className={cn("h-3 w-3", lastRun.status === "queued" ? "text-high" : "text-low")} />
            <p className="text-[10px] font-medium text-slate-200">Thực thi {String(lastRun.executionId).slice(0, 8)}</p>
            <Badge tone={STATUS_TONE[lastRun.status] || "neutral"}>{lastRun.status}</Badge>
          </div>
          <p className="mt-1 text-[9px] text-slate-600">{formatDate(lastRun.startedAt)} · {lastRun.nodeCount} nút</p>
        </div>
      )}
    </div>
  );
}
