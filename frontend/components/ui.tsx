"use client";

import { useEffect, useState, type ButtonHTMLAttributes, type CSSProperties, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, Inbox, Loader2, X, type LucideIcon } from "lucide-react";
import { cn, initials, severityDot, severityStyles, statusStyles, titleCase } from "@/lib/utils";

export function Card({ className, children, style }: { className?: string; children: ReactNode; style?: CSSProperties }) {
  return <div className={cn("panel", className)} style={style}>{children}</div>;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
  icon?: LucideIcon;
};

export function Button({ className, variant = "secondary", size = "md", loading, icon: Icon, children, disabled, ...props }: ButtonProps) {
  const variants = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    ghost: "btn-ghost",
    danger: "btn-danger",
    outline: "border border-brand-400/40 bg-transparent text-brand-200 hover:bg-brand-500/10",
  };
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-9 px-3.5",
    lg: "h-11 px-5",
    icon: "h-9 w-9 p-0",
  };
  return (
    <button className={cn("btn", variants[variant], sizes[size], className)} disabled={disabled || loading} {...props}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

export function Badge({ children, className, tone = "neutral", dot = false }: { children: ReactNode; className?: string; tone?: string; dot?: boolean }) {
  return (
    <span className={cn("chip", severityStyles[tone] || "border-white/10 bg-white/5 text-slate-400", className)}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", severityDot[tone] || "bg-slate-500")} />}
      {children}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity?: string | null }) {
  const value = (severity || "info").toLowerCase();
  return <Badge tone={value} dot>{titleCase(value)}</Badge>;
}

export function StatusBadge({ status }: { status?: string | null }) {
  const value = (status || "unknown").toLowerCase();
  return <span className={cn("chip", statusStyles[value] || "border-white/10 bg-white/5 text-slate-400")}>{titleCase(value)}</span>;
}

export function Avatar({ name, email, src, size = "md" }: { name?: string | null; email?: string | null; src?: string | null; size?: "xs" | "sm" | "md" | "lg" }) {
  const sizes = { xs: "h-6 w-6 text-[9px]", sm: "h-8 w-8 text-[10px]", md: "h-10 w-10 text-xs", lg: "h-12 w-12 text-sm" };
  return (
    <div className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-gradient-to-br from-brand-500/30 to-cyan-500/20 font-semibold text-brand-100", sizes[size])}>
      {src ? <img src={src} alt={name || "avatar"} className="h-full w-full object-cover" /> : initials(name, email)}
    </div>
  );
}

export function Sparkline({ data, color = "#3b82f6", className }: { data: number[]; color?: string; className?: string }) {
  if (!data?.length) return <div className={cn("h-8 w-full", className)} />;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const points = data
    .map((value, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * 100;
      const y = 28 - ((value - min) / Math.max(max - min, 1)) * 24;
      return `${x},${y}`;
    })
    .join(" ");
  const id = `spark-${color.replace("#", "")}-${data.length}`;
  return (
    <svg viewBox="0 0 100 32" className={cn("h-8 w-full", className)} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={`0,32 ${points} 100,32`} fill={`url(#${id})`} stroke="none" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StatCard({
  label,
  value,
  delta,
  hint,
  icon: Icon,
  tone = "brand",
  spark,
  className,
}: {
  label: string;
  value: string | number;
  delta?: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "brand" | "critical" | "warning" | "success" | "cyan";
  spark?: number[];
  className?: string;
}) {
  const tones = {
    brand: { icon: "text-brand-300 bg-brand-500/10 border-brand-400/20", spark: "#3b82f6" },
    critical: { icon: "text-critical bg-critical/10 border-critical/20", spark: "#ff4d6d" },
    warning: { icon: "text-high bg-high/10 border-high/20", spark: "#ff8a3d" },
    success: { icon: "text-low bg-low/10 border-low/20", spark: "#3ddc97" },
    cyan: { icon: "text-cyan-300 bg-cyan-500/10 border-cyan-400/20", spark: "#22d3ee" },
  }[tone];
  return (
    <div className={cn("panel panel-hover stat-glow group overflow-hidden p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">{label}</p>
          <p className="mt-2 font-display text-[26px] font-semibold leading-none text-white">{value}</p>
        </div>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl border", tones.icon)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          {delta && <span className={cn("text-[11px] font-medium", delta.startsWith("-") ? "text-emerald-400" : "text-high")}>{delta}</span>}
          {hint && <p className="text-[10px] text-slate-600">{hint}</p>}
        </div>
        {spark && <Sparkline data={spark} color={tones.spark} className="h-7 w-20 opacity-80" />}
      </div>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  const sizes = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl", xl: "max-w-6xl" };
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-10 backdrop-blur-sm">
      <div className={cn("panel w-full animate-in overflow-hidden bg-surface-850/95 shadow-2xl", sizes[size])}>
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-6 py-5">
          <div>
            <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
            {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/[0.06] hover:text-white" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-white/[0.06] bg-surface-900/40 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Confirm action",
  message,
  confirmLabel = "Confirm",
  loading,
  danger = true,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  danger?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="flex gap-3">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", danger ? "bg-critical/10 text-critical" : "bg-brand-500/10 text-brand-300")}>
          <AlertCircle className="h-5 w-5" />
        </div>
        <p className="text-sm leading-relaxed text-slate-400">{message}</p>
      </div>
    </Modal>
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[10px] text-slate-600">{hint}</p>}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("input", props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn("input min-h-[90px] resize-y", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn("select", props.className)} />;
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn("relative h-6 w-11 shrink-0 rounded-full border transition", checked ? "border-brand-400/50 bg-brand-500" : "border-white/10 bg-surface-700")}
      aria-pressed={checked}
      aria-label={label || "Toggle"}
    >
      <span className={cn("absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow transition-all", "h-[18px] w-[18px]", checked ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

export function Tabs({ tabs, value, onChange }: { tabs: { key: string; label: string; count?: number; icon?: LucideIcon }[]; value: string; onChange: (key: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-xl border border-white/[0.06] bg-surface-900/60 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition",
            value === tab.key ? "bg-white/[0.08] text-white shadow-sm" : "text-slate-500 hover:text-slate-200",
          )}
        >
          {tab.icon && <tab.icon className="h-3.5 w-3.5" />}
          {tab.label}
          {tab.count !== undefined && <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-slate-400">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Pagination({ page, pages, total, limit, onPage }: { page: number; pages: number; total: number; limit: number; onPage: (page: number) => void }) {
  if (!total) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.05] px-4 py-3">
      <p className="text-[11px] text-slate-500">
        Showing <span className="text-slate-300">{from}</span>–<span className="text-slate-300">{to}</span> of <span className="text-slate-300">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {Array.from({ length: Math.min(5, pages) }).map((_, index) => {
          const start = Math.max(1, Math.min(page - 2, pages - 4));
          const number = start + index;
          if (number > pages) return null;
          return (
            <button
              key={number}
              onClick={() => onPage(number)}
              className={cn("h-8 min-w-8 rounded-lg px-2 text-xs transition", number === page ? "bg-brand-500/20 text-brand-200" : "text-slate-500 hover:bg-white/[0.05] hover:text-slate-200")}
            >
              {number}
            </button>
          );
        })}
        <Button size="icon" variant="ghost" onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function EmptyState({ title = "Nothing here yet", message, icon: Icon = Inbox, action }: { title?: string; message?: string; icon?: LucideIcon; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03] text-slate-500">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm font-medium text-slate-300">{title}</p>
      {message && <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-600">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-critical/20 bg-critical/10 text-critical">
        <AlertCircle className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm font-medium text-slate-300">Unable to load data</p>
      <p className="mt-1 max-w-sm text-xs text-slate-600">{message}</p>
      {onRetry && <Button className="mt-4" size="sm" onClick={onRetry}>Retry</Button>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export function ProgressBar({ value, className, barClassName }: { value: number; className?: string; barClassName?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]", className)}>
      <div className={cn("h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-400 transition-all duration-500", barClassName)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function PageHeader({ title, subtitle, icon: Icon, actions, badge }: { title: string; subtitle?: string; icon?: LucideIcon; actions?: ReactNode; badge?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex items-start gap-3.5">
        {Icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brand-400/20 bg-gradient-to-br from-brand-500/15 to-cyan-500/5 text-brand-300 shadow-[0_0_40px_-16px_rgba(59,130,246,0.9)]">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-white md:text-[26px]">{title}</h1>
            {badge}
          </div>
          {subtitle && <p className="mt-1 text-[13px] text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="font-display text-sm font-semibold tracking-tight text-slate-200">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[11px] text-slate-600">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function KeyValue({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/[0.04] py-2.5 last:border-0">
      <span className="text-[11px] uppercase tracking-[0.1em] text-slate-600">{label}</span>
      <span className={cn("max-w-[60%] break-words text-right text-xs text-slate-300", mono && "font-mono text-[11px]")}>{value || "—"}</span>
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search…", className }: { value: string; onChange: (value: string) => void; placeholder?: string; className?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className={cn("relative", className)}>
      <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className={cn("input h-9 pl-9 pr-14 text-xs", focused && "border-brand-400/40")}
      />
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] text-slate-600">⌘K</span>
    </div>
  );
}
