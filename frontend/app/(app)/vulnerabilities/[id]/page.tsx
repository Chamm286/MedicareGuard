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
      success("Đã cập nhật trạng thái", `Lỗ hổng đã chuyển sang ${titleCase(status)}.`);
      refetch();
    } catch (err) {
      toastError("Cập nhật thất bại", err instanceof Error ? err.message : "Không thể cập nhật trạng thái");
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
  const difficulty = cvss >= 9 ? "Rất dễ — có khả năng đã bị vũ khí hóa" : cvss >= 7 ? "Trung bình — có thể có khai thác công khai" : cvss >= 4 ? "Khó — cần điều kiện cụ thể" : "Thấp — khả năng khai thác hạn chế";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] text-slate-600">
          <Link href="/vulnerabilities" className="flex items-center gap-1 transition hover:text-brand-300"><ArrowLeft className="h-3 w-3" /> Danh sách lỗ hổng</Link>
          <span className="text-slate-800">/</span>
          <span className="font-mono text-slate-500">{vuln.cve_id || String(id).slice(0, 8)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/ai?prompt=${encodeURIComponent(`Giải thích ${vuln.cve_id || vuln.title} (CVSS ${vuln.cvss_score}) và đưa ra kế hoạch khắc phục cho ${asset.data?.data?.name || "tài sản bị ảnh hưởng"}.`)}`}>
            <Button icon={Bot}>Hỏi AI</Button>
          </Link>
          <Button variant="primary" icon={CheckCircle2} onClick={() => setStatus("resolved")} disabled={vuln.status === "resolved" || updating}>Đánh dấu đã giải quyết</Button>
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
            <span className="ml-auto text-[10px] text-slate-600">Phát hiện {formatDate(vuln.created_at)}</span>
          </div>
          <h1 className="mt-3 font-display text-xl font-semibold tracking-tight text-white md:text-2xl">{vuln.title}</h1>
          <p className="mt-2 max-w-4xl text-[13px] leading-relaxed text-slate-400">{vuln.description || "Chưa ghi nhận mô tả kỹ thuật cho lỗ hổng này."}</p>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-sm font-semibold text-slate-200">Đánh giá tác động</h2>
                <p className="mt-0.5 text-[11px] text-slate-600">Khả năng khai thác và tiếp xúc kinh doanh có nguồn gốc từ CVSS</p>
              </div>
              <Bug className="h-4 w-4 text-high" />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                <p className="text-[9px] uppercase tracking-[0.14em] text-slate-600">Điểm CVSS</p>
                <p className={cn("mt-1 font-display text-2xl font-semibold", cvss >= 9 ? "text-critical" : cvss >= 7 ? "text-high" : "text-medium")}>{cvss.toFixed(1)}</p>
                <p className="text-[9px] text-slate-700">trên thang 10</p>
              </div>
              <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 sm:col-span-2">
                <p className="text-[9px] uppercase tracking-[0.14em] text-slate-600">Khả năng khai thác</p>
                <p className="mt-1 text-[12px] text-slate-300">{difficulty}</p>
                <ProgressBar value={cvss * 10} barClassName={cvss >= 9 ? "from-critical to-rose-400" : "from-high to-amber-400"} className="mt-2" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-sm font-semibold text-slate-200">Kế hoạch khắc phục</h2>
                <p className="mt-0.5 text-[11px] text-slate-600">Trình tự phản hồi được đề xuất</p>
              </div>
              <Wrench className="h-4 w-4 text-brand-400" />
            </div>
            <div className="mt-3 space-y-2.5">
              {[
                { title: "Xác thực mức độ hiển thị", detail: "Xác nhận phiên bản bị ảnh hưởng và bề mặt tấn công có thể tiếp cận." },
                { title: "Áp dụng bản vá của nhà cung cấp", detail: "Triển khai bản phát hành đã sửa qua quy trình quản lý thay đổi." },
                { title: "Kiểm soát thay thế", detail: "Nếu việc vá bị trì hoãn, áp dụng WAF, tường lửa hoặc phân đoạn mạng." },
                { title: "Xác minh cách khắc phục", detail: "Chạy quét có xác thực và xác nhận phát hiện đã được đóng." },
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
            <h2 className="font-display text-sm font-semibold text-slate-200">Thông tin chi tiết</h2>
            <div className="mt-2">
              <KeyValue label="Mã CVE" value={vuln.cve_id || "—"} mono />
              <KeyValue label="Mức độ" value={<SeverityBadge severity={vuln.severity} />} />
              <KeyValue label="CVSS" value={vuln.cvss_score} />
              <KeyValue label="Trạng thái" value={<StatusBadge status={vuln.status} />} />
              <KeyValue label="Phát hiện" value={formatDate(vuln.created_at)} />
              <KeyValue label="Cập nhật" value={formatDate(vuln.updated_at)} />
              <KeyValue label="ID bản ghi" value={<span className="font-mono text-[10px]">{vuln.id}</span>} />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="font-display text-sm font-semibold text-slate-200">Thang đo CVSS</h2>
            <ComplianceGauge score={cvss * 10} size={168} label="Điểm mức độ nghiêm trọng" />
            <p className="text-center text-[10px] text-slate-600">Chuẩn hóa thành 100</p>
          </Card>

          <Card className="p-4">
            <h2 className="font-display text-sm font-semibold text-slate-200">Tài sản bị ảnh hưởng</h2>
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
                  <span className="text-[9px] text-slate-600">{titleCase(asset.data.data.criticality)} mức quan trọng</span>
                </div>
              </Link>
            ) : (
              <p className="mt-2 text-[11px] text-slate-600">Không có tài sản nào được ánh xạ tới phát hiện này.</p>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="font-display text-sm font-semibold text-slate-200">Trạng thái khắc phục</h2>
            <div className="mt-3">
              <Select value={vuln.status} onChange={(event) => setStatus(event.target.value)} disabled={updating}>
                {STATUSES.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}
              </Select>
            </div>
            <div className="mt-3 space-y-2">
              <Button variant="primary" className="w-full" icon={ShieldCheck} onClick={() => setStatus("resolved")} loading={updating} disabled={vuln.status === "resolved"}>Xác nhận khắc phục</Button>
              <Button className="w-full" icon={Siren} onClick={() => setStatus("accepted")} disabled={vuln.status === "accepted" || updating}>Chấp nhận rủi ro</Button>
            </div>
            <p className="mt-2 text-[9px] leading-relaxed text-slate-700">Rủi ro được chấp nhận đòi hỏi phải có biện pháp kiểm soát đền bù và phê duyệt của ban quản lý.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
