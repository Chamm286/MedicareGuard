"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Bell,
  Bug,
  CalendarDays,
  CheckCircle2,
  Database,
  ExternalLink,
  FlaskConical,
  HeartPulse,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  Pill,
  Shield,
  ShieldAlert,
  Stethoscope,
  UserRound,
  Users,
} from "lucide-react";
import { API_URL } from "@/lib/api";

const MAILPIT_URL = process.env.NEXT_PUBLIC_MAILPIT_URL || "https://buttons-milwaukee-certification-tail.trycloudflare.com";

type Patient = {
  id: string;
  name: string;
  dob: string;
  gender: string;
  phone: string;
  condition: string;
  doctor: string;
  lastVisit: string;
  status: string;
  insurance: string;
};

type AlertFeed = {
  id: string;
  title: string;
  severity: string;
  status: string;
  source_ip?: string;
  detected_at: string;
  risk_score?: number;
  scenario?: string;
};

type AttackResult = {
  alert: AlertFeed;
  scenario: string;
  workflowId?: string;
  dispatched: boolean;
  dispatchStatus: string;
  message: string;
};

const SCENARIOS = [
  { key: "ransomware", label: "Ransomware hồ sơ bệnh án", icon: LockKeyhole, tone: "text-red-600", bg: "bg-red-50", border: "border-red-200", hint: "Mã hóa PDF, đòi tiền chuộc" },
  { key: "phishing", label: "Lừa đảo giả mạo Medicare", icon: Mail, tone: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", hint: "Email giả mạo đòi mật khẩu/OTP" },
  { key: "credential", label: "Nhồi thông tin xác thực", icon: KeyRound, tone: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", hint: "Đăng nhập hàng loạt thất bại" },
  { key: "exfiltration", label: "Rò rỉ dữ liệu bệnh nhân", icon: Database, tone: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200", hint: "Dữ liệu lạ gửi tới máy chủ C2" },
  { key: "insider", label: "Truy cập hồ sơ trái phép", icon: UserRound, tone: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200", hint: "Nhân viên xem hồ sơ ngoài ca" },
];

const severityTone: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const statusTone: Record<string, string> = {
  open: "bg-red-50 text-red-700 border-red-200",
  investigating: "bg-amber-50 text-amber-700 border-amber-200",
  contained: "bg-blue-50 text-blue-700 border-blue-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  false_positive: "bg-slate-100 text-slate-600 border-slate-200",
};

const severityLabel: Record<string, string> = {
  critical: "Nghiêm trọng",
  high: "Cao",
  medium: "Trung bình",
  low: "Thấp",
};

const statusLabel: Record<string, string> = {
  open: "Mở",
  investigating: "Đang điều tra",
  contained: "Đã cô lập",
  resolved: "Đã xử lý",
  false_positive: "Dương tính giả",
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("vi-VN");
};

const timeAgo = (value: string) => {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.round(hours / 24)} ngày trước`;
};

export default function MedicarePortalPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [feed, setFeed] = useState<AlertFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [result, setResult] = useState<AttackResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/demo/feed`, { cache: "no-store" });
      if (!response.ok) throw new Error("Không tải được cảnh báo");
      const payload = await response.json();
      setFeed(payload.data || []);
    } catch (loadError) {
      setError((loadError as Error).message);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [patientResponse] = await Promise.all([fetch(`${API_URL}/demo/patients`, { cache: "no-store" })]);
        if (!patientResponse.ok) throw new Error("Không tải được hồ sơ bệnh nhân");
        const patientPayload = await patientResponse.json();
        if (mounted) setPatients(patientPayload.data || []);
        await loadFeed();
      } catch (loadError) {
        if (mounted) setError((loadError as Error).message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    const timer = setInterval(loadFeed, 15000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [loadFeed]);

  const runAttack = async (scenario: string) => {
    setRunning(scenario);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/demo/attack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario, patientId: patients[0]?.id || "BN-2401" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không chạy được kịch bản");
      setResult(payload.data);
      await loadFeed();
    } catch (runError) {
      setError((runError as Error).message);
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/portal" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20">
              <HeartPulse className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-bold tracking-tight text-slate-900">Medicare</span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">Cổng thông tin bệnh nhân</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-xs font-medium text-slate-600 md:flex">
            <a className="text-blue-700" href="#ho-so">Hồ sơ</a>
            <a className="hover:text-blue-700" href="#benh-nhan">Bệnh nhân</a>
            <a className="hover:text-blue-700" href="#don-thuoc">Đơn thuốc</a>
            <a className="hover:text-blue-700" href="#lich-hen">Lịch hẹn</a>
            <a className="hover:text-blue-700" href="#mo-phong">Mô phỏng</a>
            <Link href="/store" className="hover:text-blue-700">Cửa hàng</Link>
          </nav>
          <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700">
            <Shield className="h-3.5 w-3.5" /> Mở SOC Console
          </Link>
        </div>
      </header>

      <section className="border-b border-blue-100 bg-blue-50/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded-full border border-blue-200 bg-white px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-blue-700">Demo mode</span>
            <div>
              <p className="text-xs font-semibold text-blue-950">Đây là cổng bệnh nhân mô phỏng, không phải bệnh viện thật.</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-blue-800/80">Chạy kịch bản tấn công ở mục “Trung tâm mô phỏng an ninh”, rồi mở SOC Console để xem cảnh báo, Telegram và hộp thư Mailpit.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded-full bg-white px-2.5 py-1 font-medium text-blue-700">1. Chạy mô phỏng</span>
            <span className="rounded-full bg-white px-2.5 py-1 font-medium text-blue-700">2. Xem SOC</span>
            <span className="rounded-full bg-white px-2.5 py-1 font-medium text-blue-700">3. Xem Telegram/Mailpit</span>
            <Link href="/dashboard" className="inline-flex items-center gap-1 rounded-lg bg-blue-700 px-3 py-1.5 font-semibold text-white transition hover:bg-blue-800">Mở SOC <ArrowRight className="h-3 w-3" /></Link>
            <Link href="/store" className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-3 py-1.5 font-semibold text-blue-700 transition hover:border-blue-300">Medicare Store <ExternalLink className="h-3 w-3" /></Link>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <section id="ho-so" className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-600 via-blue-600 to-cyan-500 p-6 text-white shadow-xl shadow-blue-500/20 sm:p-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-50">
                <BadgeCheck className="h-3 w-3" /> ID Medicare · BN-2401
              </span>
              <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Xin chào, Nguyễn Văn An</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-blue-50/90">
                Hồ sơ sức khỏe của bạn được bảo vệ 24/7 bởi MedicareGuard SOC. Mọi truy cập bất thường đều được phát hiện, phân tích và phản ứng tự động qua n8n.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-full bg-white/15 px-3 py-1">Tăng huyết áp</span>
                <span className="rounded-full bg-white/15 px-3 py-1">Đái tháo đường type 2</span>
                <span className="rounded-full bg-white/15 px-3 py-1">Medicare A/B</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:min-w-[420px]">
              {[
                { label: "Hồ sơ", value: patients.length || "6", icon: Users },
                { label: "Đơn thuốc", value: "4", icon: Pill },
                { label: "Lịch hẹn", value: "2", icon: CalendarDays },
                { label: "Xét nghiệm", value: "7", icon: FlaskConical },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur">
                  <item.icon className="h-4 w-4 text-cyan-100" />
                  <p className="mt-2 text-xl font-semibold">{item.value}</p>
                  <p className="text-[10px] uppercase tracking-wide text-blue-100/80">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="benh-nhan" className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Users className="h-4 w-4 text-blue-600" /> Hồ sơ bệnh nhân</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">Dữ liệu minh họa cho môi trường demo.</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">Đã mã hóa</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Bệnh nhân</th>
                    <th className="px-3 py-3 font-semibold">ID Medicare</th>
                    <th className="px-3 py-3 font-semibold">Chẩn đoán</th>
                    <th className="px-3 py-3 font-semibold">Bác sĩ</th>
                    <th className="px-3 py-3 font-semibold">Lần khám gần nhất</th>
                    <th className="px-5 py-3 font-semibold">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></td></tr>}
                  {!loading && patients.map((patient) => (
                    <tr key={patient.id} className="transition hover:bg-blue-50/40">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-slate-900">{patient.name}</p>
                        <p className="text-[10px] text-slate-500">{patient.gender} · {formatDate(patient.dob)}</p>
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px] text-blue-700">{patient.id}</td>
                      <td className="max-w-[220px] px-3 py-3 text-slate-600">{patient.condition}</td>
                      <td className="px-3 py-3 text-slate-600">{patient.doctor}</td>
                      <td className="px-3 py-3 text-slate-500">{formatDate(patient.lastVisit)}</td>
                      <td className="px-5 py-3"><span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">{patient.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div id="don-thuoc" className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Pill className="h-4 w-4 text-blue-600" /> Đơn thuốc đang dùng</h2>
              <div className="mt-4 space-y-3">
                {[
                  ["Metformin 500mg", "2 lần/ngày · sau ăn"],
                  ["Amlodipine 5mg", "1 lần/ngày · sáng"],
                  ["Atorvastatin 20mg", "1 lần/ngày · tối"],
                  ["Vitamin D3 1000IU", "1 lần/ngày"],
                ].map(([name, dose]) => (
                  <div key={name} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                    <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700"><Pill className="h-3.5 w-3.5" /></span>
                    <div><p className="text-xs font-semibold text-slate-800">{name}</p><p className="text-[10px] text-slate-500">{dose}</p></div>
                  </div>
                ))}
              </div>
            </div>

            <div id="lich-hen" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><CalendarDays className="h-4 w-4 text-blue-600" /> Lịch hẹn sắp tới</h2>
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                  <p className="text-xs font-semibold text-slate-800">Tái khám định kỳ</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">30/10/2026 · 09:30 · BS. Trần Minh Khoa</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <p className="text-xs font-semibold text-slate-800">Xét nghiệm HbA1c</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">05/11/2026 · 08:00 · Khoa Xét nghiệm</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="mo-phong" className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-white shadow-xl sm:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-red-300">
                <ShieldAlert className="h-3 w-3" /> Trung tâm mô phỏng an ninh
              </span>
              <h2 className="mt-3 font-display text-xl font-semibold tracking-tight">Tạo bản demo tấn công</h2>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
                Mỗi nút tạo một cảnh báo thật trong PostgreSQL và kích hoạt luồng n8n tương ứng. Đây là cách mô phỏng một cuộc tấn công vào cổng bệnh nhân; kết quả hiển thị trong SOC, Telegram và hộp thư Mailpit.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-[10px] text-slate-300">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" /></span>
              SOC giám sát · n8n :5678
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {SCENARIOS.map((scenario) => (
              <button
                key={scenario.key}
                onClick={() => runAttack(scenario.key)}
                disabled={Boolean(running)}
                className="group rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-left transition hover:-translate-y-0.5 hover:border-slate-600 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${scenario.bg} ${scenario.tone}`}>
                  {running === scenario.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <scenario.icon className="h-4 w-4" />}
                </span>
                <p className="mt-3 text-xs font-semibold text-white">{scenario.label}</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">{scenario.hint}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-medium text-cyan-300 opacity-0 transition group-hover:opacity-100">
                  Chạy bản demo <ArrowRight className="h-3 w-3" />
                </span>
              </button>
            ))}
          </div>

          {error && <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300"><AlertTriangle className="h-4 w-4" /> {error}</div>}

          {result && (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Đã tạo cảnh báo demo</p>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${result.dispatched ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" : "border-amber-400/40 bg-amber-400/10 text-amber-300"}`}>
                  {result.dispatched ? "n8n đã kích hoạt" : "n8n chưa phản hồi"}
                </span>
              </div>
              <p className="mt-2 text-xs text-emerald-100/90">{result.message}</p>
              <div className="mt-3 grid gap-2 text-[10px] text-emerald-100/80 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg bg-black/20 px-2.5 py-2"><span className="block text-emerald-300/60">Mã cảnh báo</span><span className="font-mono">{result.alert.id.slice(0, 8)}…</span></div>
                <div className="rounded-lg bg-black/20 px-2.5 py-2"><span className="block text-emerald-300/60">Mức độ</span><span>{severityLabel[result.alert.severity] || result.alert.severity}</span></div>
                <div className="rounded-lg bg-black/20 px-2.5 py-2"><span className="block text-emerald-300/60">Luồng n8n</span><span>{result.workflowId || "—"}</span></div>
                <div className="rounded-lg bg-black/20 px-2.5 py-2"><span className="block text-emerald-300/60">Điểm rủi ro</span><span>{result.alert.risk_score ?? "—"}/100</span></div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/dashboard" className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-900 transition hover:bg-blue-50">
                  Mở bảng điều khiển SOC <ExternalLink className="h-3 w-3" />
                </Link>
                <a href={MAILPIT_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/30 px-3 py-1.5 text-[11px] font-semibold text-emerald-200 transition hover:bg-emerald-400/10">
                  Xem email Mailpit <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Bell className="h-4 w-4 text-blue-600" /> Cảnh báo gần đây</h2>
              <span className="text-[10px] text-slate-500">Tự động làm mới mỗi 15 giây</span>
            </div>
            <div className="divide-y divide-slate-100">
              {feed.length === 0 && <p className="px-5 py-10 text-center text-xs text-slate-500">Chưa có cảnh báo demo. Hãy chạy một kịch bản ở trên.</p>}
              {feed.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 px-5 py-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Bug className="h-3.5 w-3.5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-800">{alert.title}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">{alert.source_ip || "nội bộ"} · {timeAgo(alert.detected_at)} · {alert.scenario || "demo"}</p>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${severityTone[alert.severity] || "border-slate-200 bg-slate-100 text-slate-600"}`}>{severityLabel[alert.severity] || alert.severity}</span>
                  <span className={`hidden rounded-full border px-2 py-0.5 text-[9px] font-medium sm:inline ${statusTone[alert.status] || "border-slate-200 bg-slate-100 text-slate-600"}`}>{statusLabel[alert.status] || alert.status}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Activity className="h-4 w-4 text-blue-600" /> Tình trạng hệ thống</h2>
              <div className="mt-4 space-y-3 text-xs">
                {[
                  ["MedicareGuard SOC", "Đang trực", "text-emerald-700 bg-emerald-50 border-emerald-200"],
                  ["n8n Automation", "5 luồng đang hoạt động", "text-blue-700 bg-blue-50 border-blue-200"],
                  ["Cảnh báo Telegram", "Đã kết nối", "text-emerald-700 bg-emerald-50 border-emerald-200"],
                  ["Gmail / SMTP", "Mailpit demo", "text-amber-700 bg-amber-50 border-amber-200"],
                ].map(([label, value, tone]) => (
                  <div key={label} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                    <span className="text-slate-600">{label}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-blue-900"><Stethoscope className="h-4 w-4" /> Đường dây hỗ trợ</h2>
              <p className="mt-2 text-xs leading-relaxed text-blue-800/80">Nếu bạn nghi ngờ hồ sơ được truy cập trái phép, hãy gọi ngay <strong>1900 1234</strong> hoặc gửi email tới <strong>soc@medicareguard.io</strong>.</p>
              <Link href="/dashboard" className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900">Xem trạng thái an ninh <ArrowRight className="h-3 w-3" /></Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-[10px] text-slate-500 sm:flex-row sm:px-6">
          <p>© 2026 MedicareGuard · Hệ thống demo cho nền tảng Medicare.</p>
          <p className="flex items-center gap-1"><LockKeyhole className="h-3 w-3" /> Dữ liệu minh họa, không phải hồ sơ bệnh nhân thật.</p>
        </div>
      </footer>
    </div>
  );
}
