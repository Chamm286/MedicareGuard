"use client";

import { useMemo, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import landTopology from "world-atlas/land-110m.json";
import { cn, countryFlag, formatNumber } from "@/lib/utils";

type Origin = {
  country: string;
  country_code: string;
  attacks: number;
  risk?: number;
  avg_risk?: number;
  high_risk?: number;
  lat?: number;
  lon?: number;
};

const COUNTRY_COORDS: Record<string, [number, number]> = {
  RU: [60, 100], RO: [46, 25], IR: [32, 53], KP: [40, 127], US: [39, -98], DE: [51, 10],
  CN: [35, 105], UA: [49, 32], NL: [52, 5], SG: [1.3, 103.8], NG: [9, 8], TR: [39, 35],
  GB: [54, -2], FR: [46, 2], IN: [21, 78], BR: [-10, -52], JP: [36, 138], KR: [36, 128],
  CA: [56, -106], AU: [-25, 134], ID: [-2, 118], VN: [16, 106], TH: [15, 101], PH: [12, 122],
  MY: [4, 102], PK: [30, 70], BD: [24, 90], EG: [27, 30], ZA: [-29, 24], KE: [0, 38],
  SE: [62, 15], NO: [61, 9], FI: [64, 26], PL: [52, 20], CZ: [50, 15], IT: [42, 12],
  ES: [40, -4], PT: [39, -8], CH: [47, 8], AT: [47, 14], BE: [50, 4], GR: [39, 22],
  IL: [31, 35], SA: [24, 45], AE: [24, 54], QA: [25, 51], KZ: [48, 67], MX: [23, -102],
  AR: [-34, -64], CL: [-33, -71], CO: [4, -72], PE: [-10, -76], NZ: [-41, 174], TW: [23.5, 121],
  HK: [22.3, 114], MO: [22.2, 113.5], MM: [21, 96], KH: [12.5, 105], LA: [18, 104], NP: [28, 84],
  LK: [7.8, 80.7], AF: [33, 65], IQ: [33, 44], SY: [35, 38], JO: [31, 36], LB: [33.8, 35.8],
  HU: [47, 20], BG: [43, 25], RS: [44, 21], HR: [45, 15], SK: [48.7, 19.5], SI: [46, 15],
  LT: [55, 24], LV: [57, 25], EE: [59, 26], BY: [53, 28], MD: [47, 29], GE: [42, 43],
  AM: [40, 45], AZ: [40.5, 47.5], UZ: [41, 64], TM: [39, 59], KG: [41, 75], TJ: [39, 71],
  MN: [46, 103], ET: [9, 40], GH: [8, -1], TZ: [-6, 35], UG: [1, 32], MA: [32, -5],
  DZ: [28, 3], TN: [34, 9], LY: [27, 17], SD: [15, 30], SN: [14, -14], CI: [7.5, -5.5],
};

const coordsFor = (origin: Origin): [number, number] | null => {
  if (typeof origin.lat === "number" && typeof origin.lon === "number") return [origin.lon, origin.lat];
  return COUNTRY_COORDS[String(origin.country_code || "").toUpperCase()] || null;
};

const WIDTH = 860;
const HEIGHT = 400;
const HQ: [number, number] = [106.66, 10.76];

const land = feature(landTopology as any, (landTopology as any).objects.land) as any;
const projection = geoNaturalEarth1().fitExtent(
  [
    [20, 18],
    [WIDTH - 20, HEIGHT - 16],
  ],
  land,
);
const pathGenerator = geoPath(projection);
const landPath = pathGenerator(land) || "";
const hq = projection(HQ) || [0, 0];

export function ThreatMap({ data, className }: { data: Origin[]; className?: string }) {
  const [active, setActive] = useState<(Origin & { x: number; y: number }) | null>(null);
  const markers = useMemo(() => {
    return (data || [])
      .map((origin) => {
        const coords = coordsFor(origin);
        if (!coords) return null;
        const point = projection(coords);
        if (!point) return null;
        return { ...origin, x: point[0], y: point[1] };
      })
      .filter(Boolean) as (Origin & { x: number; y: number })[];
  }, [data]);

  const maxAttacks = Math.max(1, ...markers.map((marker) => marker.attacks));
  const total = markers.reduce((sum, marker) => sum + marker.attacks, 0);

  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-white/[0.05] bg-[#060b17]", className)}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_300px_at_50%_0%,rgba(37,99,235,0.12),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-grid-faint [background-size:24px_24px] opacity-40" />

      <div className="relative flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-critical opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-critical" />
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Live attack surface</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-slate-500">
          <span><span className="font-medium text-white">{formatNumber(total)}</span> events</span>
          <span><span className="font-medium text-white">{markers.length}</span> origins</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="relative w-full" role="img" aria-label="Global attack origins map">
        <defs>
          <linearGradient id="landFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#15213c" />
            <stop offset="100%" stopColor="#0b1428" />
          </linearGradient>
          <linearGradient id="arcStroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.05" />
            <stop offset="60%" stopColor="#ff4d6d" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ff8a3d" stopOpacity="0.9" />
          </linearGradient>
          <radialGradient id="hqGlow">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </radialGradient>
        </defs>

        <path d={landPath} fill="url(#landFill)" stroke="rgba(96,165,250,0.2)" strokeWidth="0.7" strokeLinejoin="round" />

        {markers.map((marker) => {
          const midX = (marker.x + hq[0]) / 2;
          const midY = (marker.y + hq[1]) / 2 - Math.abs(marker.x - hq[0]) * 0.22 - 12;
          return (
            <path
              key={`arc-${marker.country_code}-${marker.country}`}
              d={`M ${marker.x} ${marker.y} Q ${midX} ${midY} ${hq[0]} ${hq[1]}`}
              fill="none"
              stroke="url(#arcStroke)"
              strokeWidth={1.1}
              strokeDasharray="5 8"
              opacity={0.7}
            >
              <animate attributeName="stroke-dashoffset" from="0" to="-52" dur={`${2.8 + (1 - marker.attacks / maxAttacks) * 2}s`} repeatCount="indefinite" />
            </path>
          );
        })}

        {markers.map((marker) => {
          const radius = 2.6 + (marker.attacks / maxAttacks) * 4.2;
          const isActive = active?.country_code === marker.country_code && active?.country === marker.country;
          return (
            <g
              key={`${marker.country_code}-${marker.country}`}
              onMouseEnter={() => setActive(marker)}
              onMouseLeave={() => setActive(null)}
              className="cursor-pointer"
            >
              <circle cx={marker.x} cy={marker.y} r={radius + 7} fill="transparent" />
              <circle cx={marker.x} cy={marker.y} r={radius} fill={isActive ? "#67e8f9" : "#ff4d6d"} opacity={0.95} />
              <circle cx={marker.x} cy={marker.y} r={radius} fill="none" stroke={isActive ? "#67e8f9" : "#ff8a3d"} strokeWidth="1" opacity="0.7">
                <animate attributeName="r" from={radius} to={radius + 16} dur="2.4s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.65" to="0" dur="2.4s" repeatCount="indefinite" />
              </circle>
            </g>
          );
        })}

        <circle cx={hq[0]} cy={hq[1]} r="22" fill="url(#hqGlow)" opacity="0.7" />
        <circle cx={hq[0]} cy={hq[1]} r="3.2" fill="#22d3ee" />
        <circle cx={hq[0]} cy={hq[1]} r="3.2" fill="none" stroke="#22d3ee" strokeWidth="1">
          <animate attributeName="r" from="3" to="22" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.8" to="0" dur="3s" repeatCount="indefinite" />
        </circle>
        <text x={hq[0] + 10} y={hq[1] + 3} fill="#67e8f9" fontSize="8" fontFamily="monospace" letterSpacing="1">SOC HQ</text>
      </svg>

      {active && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-xl border border-white/10 bg-surface-900/95 px-3 py-2 shadow-2xl backdrop-blur-xl"
          style={{ left: `${(active.x / WIDTH) * 100}%`, top: `${(active.y / HEIGHT) * 100 - 3}%` }}
        >
          <p className="flex items-center gap-1.5 text-xs font-medium text-white">
            <span>{countryFlag(active.country_code)}</span> {active.country}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-500">
            {formatNumber(active.attacks)} events · risk {active.risk ?? active.avg_risk ?? "—"}
          </p>
        </div>
      )}

      <div className="relative flex flex-wrap items-center justify-between gap-3 px-4 pb-4 pt-1 text-[10px] text-slate-600">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-critical" /> Attack origin</span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-cyan-400" /> SOC headquarters</span>
        </div>
        <span className="font-mono">geo projection · natural earth</span>
      </div>
    </div>
  );
}
