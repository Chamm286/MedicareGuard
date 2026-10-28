"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, AlertTriangle, Bot, Check, Clock, Copy, Cpu, MessageSquare, Plus, RefreshCw, Send, ShieldCheck, Sparkles, Trash2, TrendingUp, Zap } from "lucide-react";
import { api, useApi } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { cn, formatNumber, relativeTime, titleCase } from "@/lib/utils";
import { Markdown } from "@/components/Markdown";
import { useToast } from "@/components/toast";
import { Avatar, Badge, Button, Card, PageHeader, Select, SeverityBadge, Skeleton } from "@/components/ui";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  created_at?: string;
  meta?: { intent?: string; latencyMs?: number; model?: string; references?: unknown };
};

const SEVERITY_ICONS: Record<string, any> = { critical: AlertTriangle, high: TrendingUp, medium: Activity, low: ShieldCheck };

export default function AIAnalystPage() {
  const { success, error: toastError } = useToast();
  const user = getUser();
  const suggestions = useApi<any>("/ai/suggestions");
  const models = useApi<any>("/ai/models");
  const insights = useApi<any>("/ai/insights");
  const overview = useApi<any>("/stats/overview");
  const conversations = useApi<any>("/ai/conversations");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [model, setModel] = useState("medicareguard-analyst");
  const [copied, setCopied] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoSent = useRef(false);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setMessages((current) => [...current, { role: "user", content: trimmed, created_at: new Date().toISOString() }]);
    setInput("");
    setSending(true);
    try {
      const response = await api<any>("/ai/chat", { method: "POST", body: { message: trimmed, conversationId } });
      const result = response.data;
      setConversationId(result.conversationId);
      setMessages((current) => [...current, {
        role: "assistant",
        content: result.reply,
        created_at: result.message?.created_at || new Date().toISOString(),
        meta: { intent: result.intent, latencyMs: result.latencyMs, model: result.model, references: result.references },
      }]);
      conversations.refetch();
    } catch (err) {
      toastError("Yêu cầu AI thất bại", err instanceof Error ? err.message : "Chuyên viên AI hiện không khả dụng");
      setMessages((current) => [...current, { role: "assistant", content: "Tôi không thể hoàn thành yêu cầu đó. Vui lòng kiểm tra kết nối tới API và thử lại." }]);
    } finally {
      setSending(false);
    }
  }, [conversationId, sending, conversations, toastError]);

  useEffect(() => {
    const prompt = new URLSearchParams(window.location.search).get("prompt");
    if (prompt && !autoSent.current) {
      autoSent.current = true;
      send(prompt);
    }
  }, [send]);

  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const startNew = () => {
    setMessages([]);
    setConversationId(null);
    setInput("");
  };

  const openConversation = async (id: string) => {
    if (id === conversationId) return;
    setLoadingConversation(true);
    try {
      const response = await api<any>(`/ai/conversations/${id}`);
      const conversation = response.data;
      setConversationId(conversation.id);
      setMessages((conversation.messages || []).map((message: any) => ({
        role: message.role,
        content: message.content,
        created_at: message.created_at,
        meta: message.metadata,
      })));
    } catch (err) {
      toastError("Không thể tải cuộc điều tra", err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setLoadingConversation(false);
    }
  };

  const removeConversation = async (id: string) => {
    try {
      await api(`/ai/conversations/${id}`, { method: "DELETE" });
      if (id === conversationId) startNew();
      conversations.refetch();
      success("Đã xóa cuộc điều tra");
    } catch (err) {
      toastError("Xóa thất bại", err instanceof Error ? err.message : "Lỗi không xác định");
    }
  };

  const copy = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(index);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      toastError("Không thể truy cập bộ nhớ tạm");
    }
  };

  const o = overview.data?.data;

  return (
    <div>
      <PageHeader
        title="Chuyên viên AI"
        subtitle="Trợ lý SOC dựa trên cảnh báo, mối đe dọa, tài sản và dữ liệu tuân thủ trực tiếp"
        icon={Bot}
        badge={<Badge tone="low" dot>trực tuyến</Badge>}
        actions={
          <>
            <Button icon={Plus} onClick={startNew}>Cuộc điều tra mới</Button>
            <Button variant="primary" icon={Sparkles} onClick={() => send("Tóm tắt tình hình an ninh hiện tại và đề xuất ba hành động ưu tiên.")} loading={sending}>Tóm tắt hàng ngày</Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_280px]">
        <Card className="hidden flex-col overflow-hidden lg:flex" style={{ height: "calc(100vh - 12.5rem)", minHeight: 520 }}>
          <div className="flex items-center justify-between border-b border-white/[0.05] px-3 py-2.5">
            <span className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-600">Điều tra</span>
            <button onClick={startNew} className="rounded p-1 text-slate-500 transition hover:bg-white/[0.06] hover:text-brand-300" aria-label="Cuộc điều tra mới"><Plus className="h-3.5 w-3.5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {conversations.loading && !conversations.data && <Skeleton className="h-12 rounded-lg" />}
            {(conversations.data?.data || []).map((conversation: any) => (
              <div
                key={conversation.id}
                role="button"
                tabIndex={0}
                onClick={() => openConversation(conversation.id)}
                onKeyDown={(event) => { if (event.key === "Enter") openConversation(conversation.id); }}
                className={cn("group mb-1 cursor-pointer rounded-lg border px-2.5 py-2 transition", conversation.id === conversationId ? "border-brand-400/25 bg-brand-500/[0.08]" : "border-transparent hover:bg-white/[0.03]")}
              >
                <div className="flex items-start gap-2">
                  <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-slate-600" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10.5px] text-slate-300">{conversation.title || "Cuộc điều tra chưa đặt tên"}</p>
                    <p className="mt-0.5 text-[8.5px] text-slate-700">{conversation.message_count} tin nhắn · {relativeTime(conversation.updated_at)}</p>
                  </div>
                  <button onClick={(event) => { event.stopPropagation(); removeConversation(conversation.id); }} className="rounded p-0.5 text-slate-800 opacity-0 transition hover:text-critical group-hover:opacity-100" aria-label="Xóa cuộc điều tra"><Trash2 className="h-3 w-3" /></button>
                </div>
              </div>
            ))}
            {!conversations.loading && !(conversations.data?.data || []).length && (
              <p className="px-2 py-6 text-center text-[9px] text-slate-700">Chưa có cuộc điều tra nào</p>
            )}
          </div>
          <div className="border-t border-white/[0.05] p-2.5">
            <div className="flex items-center gap-1.5 text-[9px] text-slate-600"><span className="h-1.5 w-1.5 rounded-full bg-low" /> Công cụ phân tích được kết nối</div>
          </div>
        </Card>

        <Card className="flex flex-col overflow-hidden" style={{ height: "calc(100vh - 12.5rem)", minHeight: 520 }}>
          <div className="flex items-center justify-between gap-2 border-b border-white/[0.05] px-4 py-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-brand-400/25 bg-brand-500/10"><Bot className="h-3 w-3 text-brand-300" /></div>
              <div>
                <p className="text-[11px] font-medium text-slate-200">Nhà phân tích MedicareGuard</p>
                <p className="text-[8.5px] text-slate-600">Dựa trên dữ liệu SOC trực tiếp · {messages.length} tin nhắn</p>
              </div>
            </div>
            <Select value={model} onChange={(event) => setModel(event.target.value)} className="w-40">
              {(models.data?.data || []).map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
            {loadingConversation ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-xl" />)}</div>
            ) : !messages.length ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-brand-500/20 blur-2xl" />
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-400/25 bg-gradient-to-br from-brand-500/20 to-cyan-500/10">
                    <Bot className="h-6 w-6 text-brand-200" />
                  </div>
                </div>
                <h2 className="mt-4 font-display text-lg font-semibold text-white">Tôi có thể giúp điều tra bằng cách nào?</h2>
                <p className="mt-1 max-w-md text-[11px] leading-relaxed text-slate-500">Hỏi về cảnh báo trực tiếp, tác nhân đe dọa, mức phơi nhiễm tài sản, rủi ro SLA hoặc tình hình tuân thủ. Mọi câu trả lời đều dựa trên cơ sở dữ liệu SOC.</p>
                <div className="mt-4 flex max-w-lg flex-wrap justify-center gap-2">
                  {(suggestions.data?.data || []).slice(0, 6).map((suggestion: string) => (
                    <button key={suggestion} onClick={() => send(suggestion)} className="rounded-full border border-white/[0.07] bg-white/[0.02] px-3 py-1.5 text-[10px] text-slate-400 transition hover:border-brand-400/30 hover:bg-brand-500/[0.06] hover:text-brand-200">{suggestion}</button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div key={index} className={cn("flex gap-2.5", message.role === "user" ? "flex-row-reverse" : "")}>
                    {message.role === "user" ? (
                      <Avatar name={user?.fullName} email={user?.email} size="sm" />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand-400/25 bg-brand-500/15"><Bot className="h-4 w-4 text-brand-300" /></div>
                    )}
                    <div className={cn("max-w-[85%] min-w-0", message.role === "user" ? "items-end text-right" : "")}>
                      <div className={cn("rounded-2xl border px-3.5 py-2.5 text-left text-[11.5px]", message.role === "user" ? "rounded-tr-sm border-brand-400/20 bg-brand-600/20 text-slate-100" : "rounded-tl-sm border-white/[0.06] bg-white/[0.025] text-slate-300")}>
                        {message.role === "assistant" ? <Markdown content={message.content} className="text-[11.5px]" /> : <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>}
                      </div>
                      {message.role === "assistant" && (
                        <div className="mt-1 flex flex-wrap items-center gap-2 px-1">
                          <span className="text-[8.5px] text-slate-700">{message.meta?.model || "chuyên viên"} · {message.meta?.latencyMs || 0}ms</span>
                          {message.meta?.intent && <Badge tone="info">{titleCase(String(message.meta.intent))}</Badge>}
                          <button onClick={() => copy(message.content, index)} className="flex items-center gap-1 text-[8.5px] text-slate-700 transition hover:text-brand-300">
                            {copied === index ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />} {copied === index ? "Đã sao chép" : "Sao chép"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand-400/25 bg-brand-500/15"><Bot className="h-4 w-4 text-brand-300" /></div>
                    <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-white/[0.06] bg-white/[0.025] px-3.5 py-3">
                      {[0, 1, 2].map((index) => <span key={index} className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-300" style={{ animationDelay: `${index * 120}ms` }} />)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-white/[0.05] p-3">
            <div className="rounded-xl border border-white/[0.07] bg-black/20 p-2 focus-within:border-brand-400/30">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(input); } }}
                rows={2}
                placeholder="Hỏi về cảnh báo, kẻ tấn công, rủi ro, SLA hoặc tuân thủ… (Enter để gửi, Shift+Enter để có dòng mới)"
                className="w-full resize-none bg-transparent px-1 py-1 text-[11.5px] text-slate-200 outline-none placeholder:text-slate-700"
              />
              <div className="flex items-center justify-between px-1 pt-1">
                <span className="flex items-center gap-1 text-[8.5px] text-slate-700"><Zap className="h-2.5 w-2.5" /> Dựa trên dữ liệu trực tiếp</span>
                <Button size="sm" variant="primary" icon={Send} onClick={() => send(input)} disabled={!input.trim() || sending} loading={sending}>Gửi</Button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(suggestions.data?.data || []).slice(0, 4).map((suggestion: string) => (
                <button key={suggestion} onClick={() => setInput(suggestion)} className="truncate rounded-full border border-white/[0.05] px-2 py-1 text-[8.5px] text-slate-600 transition hover:text-brand-300">{suggestion}</button>
              ))}
            </div>
          </div>
        </Card>

        <div className="hidden space-y-3 xl:block">
          <Card className="p-3.5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Bối cảnh trực tiếp</h2>
              <button onClick={overview.refetch} className="text-slate-600 transition hover:text-brand-300" aria-label="Làm mới bối cảnh"><RefreshCw className={cn("h-3 w-3", overview.refreshing && "animate-spin")} /></button>
            </div>
            <div className="mt-2.5 space-y-2">
              {[
                { label: "Cảnh báo đang mở", value: o?.open_alerts, icon: AlertTriangle },
                { label: "Cảnh báo nghiêm trọng", value: o?.critical_alerts, icon: Zap },
                { label: "Sự cố đang mở", value: o?.open_incidents, icon: Activity },
                { label: "Tài sản rủi ro cao", value: o?.high_risk_assets, icon: Cpu },
                { label: "Điểm tuân thủ", value: o ? `${o.compliance_score}%` : undefined, icon: ShieldCheck },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.015] px-2.5 py-1.5">
                  <span className="flex items-center gap-1.5 text-[9.5px] text-slate-600"><item.icon className="h-3 w-3" /> {item.label}</span>
                  <span className="font-mono text-[10px] text-slate-300">{item.value === undefined ? "—" : typeof item.value === "number" ? formatNumber(item.value) : item.value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-3.5">
            <h2 className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Thông tin chi tiết từ AI</h2>
            <div className="mt-2.5 space-y-2">
              {(insights.data?.data || []).map((insight: any) => {
                const Icon = SEVERITY_ICONS[insight.severity] || Activity;
                return (
                  <button key={insight.id} onClick={() => send(`${insight.title}. ${insight.detail} Chúng ta nên làm gì tiếp theo?`)} className="w-full rounded-xl border border-white/[0.05] bg-white/[0.015] p-2.5 text-left transition hover:border-brand-400/20 hover:bg-white/[0.035]">
                    <div className="flex items-start gap-2">
                      <Icon className={cn("mt-0.5 h-3 w-3 shrink-0", insight.severity === "critical" ? "text-critical" : insight.severity === "high" ? "text-high" : "text-brand-300")} />
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium leading-snug text-slate-300">{insight.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-[8.5px] leading-relaxed text-slate-600">{insight.detail}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
              {insights.loading && !insights.data && <Skeleton className="h-14 rounded-xl" />}
            </div>
          </Card>

          <Card className="p-3.5">
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-slate-600" />
              <p className="text-[9px] text-slate-600">Câu trả lời trích dẫn các bảng trực tiếp. Xác minh đầu ra AI trước khi thực hiện hành động phá hoại.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
