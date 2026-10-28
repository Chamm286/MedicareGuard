"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Eye,
  EyeOff,
  Fingerprint,
  Globe2,
  HeartPulse,
  Loader2,
  Lock,
  Mail,
  Radar,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { API_URL, api } from "@/lib/api";
import { titleCase } from "@/lib/utils";
import { setSession, isAuthenticated } from "@/lib/auth";

const DEMO_ACCOUNTS = [
  { role: "Administrator", email: "admin@medicareguard.io", password: "Admin@123" },
  { role: "SOC Analyst", email: "analyst@medicareguard.io", password: "Analyst@123" },
  { role: "Viewer", email: "viewer@medicareguard.io", password: "Viewer@123" },
];

const FEATURES = [
  { icon: Radar, title: "Phát hiện thời gian thực", text: "Tương quan dữ liệu SIEM, EDR và tường lửa trong vài giây." },
  { icon: BrainCircuit, title: "Phân loại được hỗ trợ bởi AI", text: "Điều tra dựa trên dữ liệu SOC trực tiếp." },
  { icon: Workflow, title: "SOAR tự trị", text: "Quy trình n8n ngăn chặn mối đe dọa mà không cần chờ con người." },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@medicareguard.io");
  const [password, setPassword] = useState("Admin@123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [endpointCount, setEndpointCount] = useState(537);

  useEffect(() => {
    if (isAuthenticated()) router.replace("/dashboard");
    fetch(`${API_URL}/_meta/endpoints`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => data?.total && setEndpointCount(data.total))
      .catch(() => {});
  }, [router]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await api<{ token: string; user: any }>("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      setSession(result.token, result.user);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể đăng nhập");
      setLoading(false);
    }
  };

  const useDemo = (account: (typeof DEMO_ACCOUNTS)[number]) => {
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-surface-950">
      <div className="pointer-events-none absolute inset-0 bg-hero-radial" />
      <div className="pointer-events-none absolute inset-0 bg-grid-faint [background-size:46px_46px] opacity-60" />

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
        {/* Brand / narrative panel */}
        <section className="relative hidden flex-col justify-between overflow-hidden border-r border-white/[0.06] p-12 lg:flex xl:p-16">
          <div className="absolute -left-40 top-1/3 h-[520px] w-[520px] rounded-full bg-brand-600/10 blur-[130px]" />
          <div className="absolute -right-20 top-0 h-[420px] w-[420px] rounded-full bg-cyan-500/10 blur-[120px]" />

          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-400/40 bg-gradient-to-br from-brand-500/20 to-cyan-400/10 shadow-[0_0_40px_-10px_rgba(59,130,246,0.8)]">
                <ShieldCheck className="h-6 w-6 text-brand-300" />
              </div>
              <div>
                <p className="font-display text-lg font-semibold tracking-tight text-white">MedicareGuard</p>
                <p className="text-[10px] uppercase tracking-[0.32em] text-brand-300/80">Trung tâm vận hành an ninh</p>
              </div>
            </div>

            <div className="mt-14 max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-400/20 bg-brand-500/10 px-3 py-1 text-[11px] font-medium text-brand-200">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
                </span>
                SOC trực tuyến · {endpointCount} Điểm cuối API được trang bị
              </div>
              <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.08] tracking-tight text-white xl:text-6xl">
                Phòng thủ tự chủ
                <span className="block text-gradient-accent">cho chăm sóc sức khỏe hiện đại.</span>
              </h1>
              <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-slate-400">
                Một bảng điều khiển duy nhất cho phát hiện, điều tra và ứng phó. MedicareGuard tương quan dữ liệu từ
                hệ thống bệnh nhân, hạ tầng đám mây và biên mạng — sau đó hành động qua AI và tự động hóa n8n.
              </p>
            </div>
          </div>

          <div className="relative mt-10 grid max-w-xl gap-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group flex items-start gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.02] p-3.5 transition hover:border-brand-400/20 hover:bg-white/[0.04]"
              >
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-surface-800 text-brand-300">
                  <feature.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">{feature.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{feature.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="relative mt-10 flex items-center gap-8 border-t border-white/[0.05] pt-6">
            {[
              { value: "42", label: "Mô hình dữ liệu" },
              { value: "4", label: "Quy trình làm việc SOAR" },
              { value: "99.98%", label: "Thời gian hoạt động" },
              { value: "24/7", label: "Hỗ trợ" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-display text-2xl font-semibold text-white">{stat.value}</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Radar illustration */}
          <div className="pointer-events-none absolute bottom-28 right-10 h-64 w-64 opacity-60">
            <div className="absolute inset-0 rounded-full border border-brand-400/10" />
            <div className="absolute inset-8 rounded-full border border-brand-400/10" />
            <div className="absolute inset-16 rounded-full border border-brand-400/10" />
            <div className="absolute inset-24 rounded-full border border-brand-400/10" />
            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-brand-400/20 via-transparent to-transparent" />
            <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-gradient-to-r from-brand-400/20 via-transparent to-transparent" />
            <div className="radar-sweep absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(34,211,238,0.18)_40deg,transparent_80deg)]" />
            <span className="absolute left-[62%] top-[28%] h-2 w-2 rounded-full bg-critical shadow-[0_0_16px_4px_rgba(255,77,109,0.45)]" />
            <span className="absolute left-[36%] top-[58%] h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_3px_rgba(34,211,238,0.5)]" />
            <span className="absolute left-[72%] top-[66%] h-1.5 w-1.5 rounded-full bg-medium shadow-[0_0_12px_3px_rgba(255,209,102,0.4)]" />
          </div>
        </section>

        {/* Auth panel */}
        <section className="relative flex items-center justify-center px-5 py-10 sm:px-10">
          <div className="w-full max-w-[430px] animate-in">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-400/40 bg-brand-500/10">
                <ShieldCheck className="h-5 w-5 text-brand-300" />
              </div>
              <div>
                <p className="font-display text-base font-semibold text-white">MedicareGuard</p>
                <p className="text-[9px] uppercase tracking-[0.3em] text-brand-300/80">SOC</p>
              </div>
            </div>

            <div className="panel overflow-hidden p-7 shadow-[0_40px_120px_-50px_rgba(37,99,235,0.7)] sm:p-9">
              <div className="mb-7">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  <Lock className="h-3 w-3 text-brand-300" /> Truy cập dành cho chuyên viên
                </div>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-white">Chào mừng trở lại</h2>
                <p className="mt-1.5 text-sm text-slate-500">Đăng nhập vào bảng điều khiển vận hành an ninh.</p>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="label" htmlFor="email">
                    Email công việc
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="input pl-10"
                      placeholder="analyst@medicareguard.io"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="label" htmlFor="password">
                      Mật khẩu
                    </label>
                    <button type="button" className="mb-1.5 text-[11px] text-brand-300 transition hover:text-cyan-300">
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="input pl-10 pr-10"
                      placeholder="••••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-critical/20 bg-critical/[0.08] px-3.5 py-2.5 text-xs text-red-200">
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-500">
                    <input type="checkbox" defaultChecked className="h-3.5 w-3.5 rounded border-white/20 bg-surface-900 accent-brand-500" />
                    Giữ cho thiết bị này luôn được tin cậy
                  </label>
                  <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Fingerprint className="h-3.5 w-3.5 text-emerald-400" /> Bắt buộc MFA
                  </span>
                </div>

                <button type="submit" disabled={loading} className="btn btn-primary h-11 w-full">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  {loading ? "Đang xác minh danh tính…" : "Vào SOC"}
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/[0.06]" />
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-600">Danh tính demo</span>
                <div className="h-px flex-1 bg-white/[0.06]" />
              </div>

              <div className="grid gap-2">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.role}
                    type="button"
                    onClick={() => useDemo(account)}
                    className="group flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-left transition hover:border-brand-400/25 hover:bg-white/[0.05]"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/10 text-brand-300">
                        {account.role === "Administrator" ? <Sparkles className="h-3.5 w-3.5" /> : account.role === "SOC Analyst" ? <Activity className="h-3.5 w-3.5" /> : <Globe2 className="h-3.5 w-3.5" />}
                      </span>
                      <div>
                        <p className="text-xs font-medium text-slate-200">{titleCase(account.role)}</p>
                        <p className="text-[10px] text-slate-600">{account.email}</p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] text-slate-600 transition group-hover:text-brand-300">
                      Dùng <ArrowRight className="h-3 w-3" />
                    </span>
                  </button>
                ))}
              </div>

              <Link
                href="/portal"
                className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.06] px-3.5 py-3 text-xs text-emerald-200 transition hover:border-emerald-300/40 hover:bg-emerald-500/[0.1] hover:text-emerald-100"
              >
                <span className="flex items-center gap-2">
                  <HeartPulse className="h-4 w-4" />
                  Cổng bệnh nhân Medicare (demo)
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="mt-6 flex items-center justify-center gap-4 text-[10px] text-slate-600">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-emerald-500/80" /> phù hợp với HIPAA
              </span>
              <span className="h-3 w-px bg-white/10" />
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3 text-emerald-500/80" /> AES-256 ở trạng thái nghỉ
              </span>
              <span className="h-3 w-px bg-white/10" />
              <span>SOC 2 Loại II</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
