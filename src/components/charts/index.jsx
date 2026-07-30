import React, { useMemo, useState } from "react";
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react";

/**
 * Zero-dependency chart primitives — pure SVG + Tailwind. Everything is
 * responsive (viewBox based) and honours a single accent palette so the
 * dashboard reads as one system.
 */

export const PALETTE = [
  "#1B6CA8", // brand blue
  "#17875A", // brand green
  "#E8A736", // brand gold
  "#B87813", // dark gold
  "#7C3AED", // purple
  "#EF4444", // red
  "#0EA5E9", // sky
  "#14B8A6", // teal
  "#F59E0B", // amber
  "#6366F1", // indigo
];

const fmtInt = (n) => (n == null || Number.isNaN(n) ? "0" : Math.round(n).toLocaleString("en-IN"));
const fmtNum = (n, d = 2) =>
  n == null || Number.isNaN(n) ? "—" : Number(n).toLocaleString("en-IN", { maximumFractionDigits: d });

// ────────────────────────────────────────────────────────────────
// KPI Card
// ────────────────────────────────────────────────────────────────
export const KpiCard = ({ label, value, sublabel, delta, icon: Icon, onClick, accent = "blue" }) => {
  const accents = {
    blue: "from-blue-500/10 to-blue-600/5 text-blue-700 ring-blue-500/20",
    green: "from-emerald-500/10 to-emerald-600/5 text-emerald-700 ring-emerald-500/20",
    amber: "from-amber-500/10 to-amber-600/5 text-amber-700 ring-amber-500/20",
    purple: "from-violet-500/10 to-violet-600/5 text-violet-700 ring-violet-500/20",
    red: "from-red-500/10 to-red-600/5 text-red-700 ring-red-500/20",
    slate: "from-slate-500/10 to-slate-600/5 text-slate-700 ring-slate-500/20",
  };
  const clickable = typeof onClick === "function";
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition ${
        clickable ? "hover:shadow-md hover:border-gray-300 cursor-pointer" : "cursor-default"
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br opacity-70 ${accents[accent]?.split(" ")[0] || ""} ${accents[accent]?.split(" ")[1] || ""}`}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">{label}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
          {sublabel ? <p className="mt-1 text-xs text-gray-500">{sublabel}</p> : null}
          {delta != null ? (
            <div
              className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${
                delta >= 0 ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {delta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(delta).toFixed(1)}%
            </div>
          ) : null}
        </div>
        {Icon ? (
          <div className={`rounded-xl p-2 ring-1 ${accents[accent] || ""}`}>
            <Icon className="w-5 h-5" />
          </div>
        ) : null}
      </div>
      {clickable ? (
        <div className="relative mt-3 inline-flex items-center gap-1 text-xs font-medium text-gray-500 group-hover:text-gray-900 transition">
          Drill in <ArrowRight className="w-3 h-3" />
        </div>
      ) : null}
    </button>
  );
};

// ────────────────────────────────────────────────────────────────
// Donut Chart
// data: [{ label, value, color? }]
// ────────────────────────────────────────────────────────────────
export const DonutChart = ({ data = [], size = 180, thickness = 26, onSliceClick, centerLabel, centerValue }) => {
  const cleaned = useMemo(() => data.filter((d) => (d.value ?? 0) > 0), [data]);
  const total = useMemo(() => cleaned.reduce((s, d) => s + d.value, 0), [cleaned]);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - thickness / 2 - 2;

  const [hover, setHover] = useState(null);

  const arcs = useMemo(() => {
    if (total === 0) return [];
    let acc = 0;
    return cleaned.map((d, i) => {
      const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
      acc += d.value;
      const end = (acc / total) * Math.PI * 2 - Math.PI / 2;
      const largeArc = end - start > Math.PI ? 1 : 0;
      const sx = cx + r * Math.cos(start);
      const sy = cy + r * Math.sin(start);
      const ex = cx + r * Math.cos(end);
      const ey = cy + r * Math.sin(end);
      const path = `M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey}`;
      return { ...d, path, color: d.color || PALETTE[i % PALETTE.length] };
    });
  }, [cleaned, total, cx, cy, r]);

  return (
    <div className="flex flex-col md:flex-row items-center gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F3F4F6" strokeWidth={thickness} />
          {arcs.map((a, i) => (
            <path
              key={i}
              d={a.path}
              fill="none"
              stroke={a.color}
              strokeWidth={thickness}
              strokeLinecap="butt"
              className={`transition ${onSliceClick ? "cursor-pointer" : ""} ${hover != null && hover !== i ? "opacity-40" : "opacity-100"}`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSliceClick?.(a)}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-xs text-gray-500">{centerLabel || "Total"}</p>
          <p className="text-2xl font-bold text-gray-900">{centerValue ?? fmtInt(total)}</p>
        </div>
      </div>
      <ul className="flex-1 space-y-2 w-full min-w-0">
        {arcs.length === 0 ? (
          <li className="text-sm text-gray-400 italic">No data yet.</li>
        ) : (
          arcs.map((a, i) => (
            <li
              key={i}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSliceClick?.(a)}
              className={`flex items-center gap-2 text-sm rounded-md px-2 py-1 transition ${
                onSliceClick ? "cursor-pointer hover:bg-gray-50" : ""
              } ${hover === i ? "bg-gray-50" : ""}`}
            >
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: a.color }} />
              <span className="flex-1 truncate text-gray-700">{a.label}</span>
              <span className="text-gray-900 font-semibold">{fmtInt(a.value)}</span>
              <span className="text-xs text-gray-400 w-10 text-right">
                {total ? ((a.value / total) * 100).toFixed(0) : 0}%
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────
// Bar Chart (horizontal, ranked list style)
// ────────────────────────────────────────────────────────────────
export const BarChart = ({ data = [], onBarClick, valueLabel, maxRows = 8 }) => {
  const rows = data.slice(0, maxRows);
  const max = Math.max(1, ...rows.map((r) => r.value || 0));
  return (
    <div className="space-y-2">
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No data yet.</p>
      ) : (
        rows.map((r, i) => {
          const pct = ((r.value || 0) / max) * 100;
          const color = r.color || PALETTE[i % PALETTE.length];
          return (
            <button
              key={i}
              type="button"
              disabled={!onBarClick}
              onClick={() => onBarClick?.(r)}
              className={`w-full text-left ${onBarClick ? "cursor-pointer" : "cursor-default"}`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="truncate text-gray-700 font-medium">{r.label}</span>
                <span className="text-gray-900 font-semibold ml-2 shrink-0">
                  {fmtInt(r.value)}
                  {valueLabel ? <span className="text-gray-400 font-normal"> {valueLabel}</span> : null}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
            </button>
          );
        })
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────
// Line / Area Chart
// data: [{ label, value }]
// ────────────────────────────────────────────────────────────────
export const LineChart = ({ data = [], height = 180, color = PALETTE[0], valueLabel }) => {
  const w = 640;
  const padX = 32;
  const padY = 24;
  const pts = data;
  const max = Math.max(1, ...pts.map((p) => p.value || 0));
  const min = 0;

  const xAt = (i) => padX + (i / Math.max(1, pts.length - 1)) * (w - padX * 2);
  const yAt = (v) => height - padY - ((v - min) / (max - min || 1)) * (height - padY * 2);

  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(p.value || 0)}`).join(" ");
  const area = pts.length
    ? `${path} L ${xAt(pts.length - 1)} ${height - padY} L ${padX} ${height - padY} Z`
    : "";

  if (pts.length === 0) {
    return <p className="text-sm text-gray-400 italic py-10 text-center">No data yet.</p>;
  }

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${height}`} className="w-full h-auto" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={padX}
            x2={w - padX}
            y1={padY + t * (height - padY * 2)}
            y2={padY + t * (height - padY * 2)}
            stroke="#F3F4F6"
            strokeWidth="1"
          />
        ))}
        <path d={area} fill={`url(#grad-${color.replace("#", "")})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={xAt(i)} cy={yAt(p.value || 0)} r="3.5" fill="#fff" stroke={color} strokeWidth="2" />
          </g>
        ))}
        {pts.map((p, i) => (
          <text
            key={`l-${i}`}
            x={xAt(i)}
            y={height - 6}
            textAnchor="middle"
            className="text-[10px] fill-gray-500"
          >
            {p.label}
          </text>
        ))}
      </svg>
      {valueLabel ? <p className="text-xs text-gray-400 mt-1">{valueLabel}</p> : null}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────
// StatBar — a small labelled progress bar (kg used / total)
// ────────────────────────────────────────────────────────────────
export const StatBar = ({ label, value, total, color = PALETTE[0], suffix = "" }) => {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-600 font-medium">{label}</span>
        <span className="text-gray-900 font-semibold">
          {fmtNum(value, 3)}
          {suffix} / {fmtNum(total, 3)}
          {suffix}
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
};

export const numFmt = { int: fmtInt, num: fmtNum };
