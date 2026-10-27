"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatNumber, titleCase } from "@/lib/utils";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ff4d6d",
  high: "#ff8a3d",
  medium: "#ffd166",
  low: "#3ddc97",
  info: "#3b82f6",
};

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-surface-900/95 px-3 py-2 shadow-2xl backdrop-blur-xl">
      {label && <p className="mb-1 text-[10px] uppercase tracking-[0.12em] text-slate-500">{label}</p>}
      {payload.map((entry: any, index: number) => (
        <p key={index} className="flex items-center gap-2 text-xs text-slate-300">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: entry.color || entry.fill }} />
          <span className="text-slate-500">{titleCase(entry.name)}:</span>
          <span className="font-medium text-white">{formatNumber(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

export function AttackAreaChart({ data, height = 260 }: { data: { bucket: string; total: number; critical_high: number }[]; height?: number }) {
  const formatted = (data || []).map((item) => ({ ...item, label: (item.bucket || "").slice(5).replace(" ", " · ") }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={formatted} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="criticalGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff4d6d" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#ff4d6d" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 6" stroke="rgba(148,163,184,0.08)" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={40} />
        <YAxis tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Area type="monotone" dataKey="total" name="alerts" stroke="#60a5fa" strokeWidth={2} fill="url(#totalGradient)" dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
        <Area type="monotone" dataKey="critical_high" name="critical / high" stroke="#ff4d6d" strokeWidth={1.5} fill="url(#criticalGradient)" dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SeverityDonut({ data, height = 190 }: { data: { severity: string; total: number }[]; height?: number }) {
  const normalized = ["critical", "high", "medium", "low"].map((severity) => {
    const match = (data || []).find((item) => String(item.severity).toLowerCase() === severity);
    return { name: severity, value: match?.total || 0 };
  });
  const total = normalized.reduce((sum, item) => sum + item.value, 0);
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={normalized} dataKey="value" nameKey="name" innerRadius="64%" outerRadius="88%" paddingAngle={3} stroke="none">
            {normalized.map((entry) => (
              <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name]} opacity={entry.value ? 1 : 0.18} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-semibold text-white">{formatNumber(total)}</span>
        <span className="text-[9px] uppercase tracking-[0.18em] text-slate-500">Total alerts</span>
      </div>
    </div>
  );
}

export function SeverityLegend({ data }: { data: { severity: string; total: number }[] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {["critical", "high", "medium", "low"].map((severity) => {
        const value = (data || []).find((item) => String(item.severity).toLowerCase() === severity)?.total || 0;
        return (
          <div key={severity} className="flex items-center gap-2 rounded-lg border border-white/[0.04] bg-white/[0.02] px-2.5 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: SEVERITY_COLORS[severity] }} />
            <span className="text-[10px] capitalize text-slate-500">{severity}</span>
            <span className="ml-auto text-xs font-medium text-slate-300">{value}</span>
          </div>
        );
      })}
    </div>
  );
}

export function TopAttackersBar({ data, height = 260 }: { data: { source_ip: string; events: number; country?: string }[]; height?: number }) {
  const formatted = (data || []).slice(0, 7).map((item) => ({ ...item, ip: item.source_ip || "unknown" }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={formatted} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id="attackerBar" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2563eb" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 6" stroke="rgba(148,163,184,0.07)" horizontal={false} />
        <XAxis type="number" tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="ip" width={104} tick={{ fill: "#94a3b8", fontSize: 9, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.025)" }} />
        <Bar dataKey="events" name="events" fill="url(#attackerBar)" radius={[0, 4, 4, 0]} barSize={12} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryBars({ data, height = 240 }: { data: { category: string; total: number }[]; height?: number }) {
  const formatted = (data || []).slice(0, 8).map((item) => ({ ...item, category: item.category?.length > 18 ? `${item.category.slice(0, 17)}…` : item.category }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={formatted} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id="categoryBar" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 6" stroke="rgba(148,163,184,0.07)" horizontal={false} />
        <XAxis type="number" tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="category" width={118} tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.025)" }} />
        <Bar dataKey="total" name="threats" fill="url(#categoryBar)" radius={[0, 4, 4, 0]} barSize={12} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ComplianceGauge({ score, size = 170, label = "Compliance" }: { score: number; size?: number; label?: string }) {
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  const data = [{ name: label, value }];
  return (
    <div className="relative" style={{ height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart data={data} innerRadius="72%" outerRadius="100%" startAngle={220} endAngle={-40}>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" cornerRadius={10} fill="#22d3ee" background={{ fill: "rgba(148,163,184,0.08)" }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-semibold text-white">{value}%</span>
        <span className="text-[9px] uppercase tracking-[0.18em] text-slate-500">{label}</span>
      </div>
    </div>
  );
}

export function ActivityTimelineChart({ data, height = 180 }: { data: { hour: string; total: number }[]; height?: number }) {
  const formatted = (data || []).map((item) => ({ ...item, label: (item.hour || "").slice(11, 16) }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={formatted} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 6" stroke="rgba(148,163,184,0.08)" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={40} />
        <YAxis tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Area type="monotone" dataKey="total" name="events" stroke="#22d3ee" strokeWidth={2} fill="url(#activityGradient)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function MiniArea({ data, color = "#22d3ee", height = 56 }: { data: { value: number }[]; color?: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`mini-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} fill={`url(#mini-${color.replace("#", "")})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
