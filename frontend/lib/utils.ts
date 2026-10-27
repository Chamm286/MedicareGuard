import clsx, { type ClassValue } from "clsx";

export const cn = (...inputs: ClassValue[]) => clsx(inputs);

export const formatNumber = (value: number | string | null | undefined) => {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return "0";
  return new Intl.NumberFormat("en-US", { notation: number >= 100000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(number);
};

export const formatDate = (value: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", options || { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export const formatDateShort = (value: string | Date | null | undefined) => formatDate(value, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export const relativeTime = (value: string | Date | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (Math.abs(minutes) < 1) return "just now";
  if (Math.abs(minutes) < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return `${days}d ago`;
  return formatDate(date, { day: "2-digit", month: "short" });
};

export const timeUntil = (value: string | Date | null | undefined) => {
  if (!value) return null;
  const diff = new Date(value).getTime() - Date.now();
  if (Number.isNaN(diff)) return null;
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.max(0, Math.floor((diff % 3600000) / 60000));
  if (diff < 0) return `Overdue ${Math.abs(hours)}h ${minutes}m`;
  return `${hours}h ${minutes}m left`;
};

export const initials = (name?: string | null, email?: string | null) => {
  if (name) {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "MG";
};

export const firstName = (name?: string | null) => (name ? name.split(/\s+/)[0] : "Analyst");

export const countryFlag = (code?: string | null) => {
  if (!code || code.length !== 2 || code === "UN") return "🌐";
  return String.fromCodePoint(...code.toUpperCase().split("").map((char) => 127397 + char.charCodeAt(0)));
};

export const severityStyles: Record<string, string> = {
  critical: "border-critical/30 bg-critical/10 text-critical",
  high: "border-high/30 bg-high/10 text-high",
  medium: "border-medium/30 bg-medium/10 text-medium",
  low: "border-low/30 bg-low/10 text-low",
  info: "border-brand-400/30 bg-brand-400/10 text-brand-300",
};

export const severityDot: Record<string, string> = {
  critical: "bg-critical",
  high: "bg-high",
  medium: "bg-medium",
  low: "bg-low",
  info: "bg-brand-400",
};

export const statusStyles: Record<string, string> = {
  open: "border-critical/30 bg-critical/10 text-red-300",
  investigating: "border-medium/30 bg-medium/10 text-amber-200",
  contained: "border-brand-400/30 bg-brand-400/10 text-brand-300",
  eradicated: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
  recovered: "border-low/30 bg-low/10 text-emerald-300",
  resolved: "border-low/30 bg-low/10 text-emerald-300",
  closed: "border-white/10 bg-white/5 text-slate-400",
  false_positive: "border-white/10 bg-white/5 text-slate-400",
  active: "border-critical/30 bg-critical/10 text-red-300",
  blocked: "border-white/10 bg-white/5 text-slate-400",
  monitoring: "border-medium/30 bg-medium/10 text-amber-200",
  online: "border-low/30 bg-low/10 text-emerald-300",
  offline: "border-white/10 bg-white/5 text-slate-400",
  maintenance: "border-medium/30 bg-medium/10 text-amber-200",
  disabled: "border-white/10 bg-white/5 text-slate-500",
  pending: "border-medium/30 bg-medium/10 text-amber-200",
  in_progress: "border-brand-400/30 bg-brand-400/10 text-brand-300",
  compliant: "border-low/30 bg-low/10 text-emerald-300",
  completed: "border-low/30 bg-low/10 text-emerald-300",
  ready: "border-low/30 bg-low/10 text-emerald-300",
  connected: "border-low/30 bg-low/10 text-emerald-300",
  degraded: "border-medium/30 bg-medium/10 text-amber-200",
};

export const riskColor = (score: number) => {
  if (score >= 80) return "text-critical";
  if (score >= 60) return "text-high";
  if (score >= 40) return "text-medium";
  return "text-low";
};

export const riskBar = (score: number) => {
  if (score >= 80) return "from-red-500 to-rose-400";
  if (score >= 60) return "from-orange-500 to-amber-400";
  if (score >= 40) return "from-yellow-500 to-amber-300";
  return "from-emerald-500 to-teal-400";
};

export const titleCase = (value?: string | null) =>
  (value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const percentage = (value: number, total: number) => (total ? Math.round((value / total) * 100) : 0);
