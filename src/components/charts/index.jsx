import { useId, useMemo, useState } from 'react';
import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Zero-dependency chart primitives — pure SVG plus the design tokens. Everything is responsive
 * (viewBox based) and draws from one categorical palette, so the dashboard reads as one system
 * rather than a page of unrelated widgets.
 */

/**
 * The categorical series colours, ordered so the first few are the ones a two- or three-series
 * chart gets: the brand teal, then the brass, then hues that stay distinguishable side by side and
 * clear 3:1 against the white surface they sit on.
 */
export const PALETTE = [
  '#0f5f6b', // primary teal
  '#a8752c', // brass
  '#2b62b8', // info blue
  '#11734f', // success green
  '#8a4f9e', // plum
  '#b4341f', // danger red
  '#3f8fa3', // light teal
  '#96601a', // warning ochre
  '#5a6b7a', // slate
  '#6f7fd4', // periwinkle
];

const fmtInt = (n) => (n == null || Number.isNaN(n) ? '0' : Math.round(n).toLocaleString('en-IN'));
const fmtNum = (n, d = 2) =>
  n == null || Number.isNaN(n) ? '—' : Number(n).toLocaleString('en-IN', { maximumFractionDigits: d });

// ────────────────────────────────────────────────────────────────
// KPI Card
// ────────────────────────────────────────────────────────────────
const ACCENTS = {
  primary: 'bg-primary-soft text-primary',
  brass: 'bg-brass-soft text-brass',
  blue: 'bg-info-soft text-info',
  green: 'bg-success-soft text-success',
  amber: 'bg-warning-soft text-warning',
  red: 'bg-danger-soft text-danger',
  purple: 'bg-primary-soft text-primary',
  slate: 'bg-surface-2 text-ink-2',
};

export const KpiCard = ({ label, value, sublabel, delta, icon: Icon, onClick, accent = 'primary' }) => {
  const clickable = typeof onClick === 'function';

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        {Icon && (
          <span className={cn('grid size-9 shrink-0 place-items-center rounded-[10px]', ACCENTS[accent] ?? ACCENTS.primary)}>
            <Icon className="size-[18px]" aria-hidden="true" />
          </span>
        )}
        {clickable && (
          <ArrowRight
            className="size-4 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
            aria-hidden="true"
          />
        )}
      </div>
      <div className="mt-3.5">
        <p className="font-mono text-[21px] leading-none font-semibold tracking-[-0.02em] text-ink sm:text-[23px]">
          {value}
        </p>
        <p className="mt-1.5 text-[12.5px] font-medium text-ink-2">{label}</p>
        {sublabel ? <p className="mt-0.5 text-[11.5px] text-ink-3">{sublabel}</p> : null}
        {delta != null ? (
          <div
            className={cn(
              'mt-2 inline-flex items-center gap-1 text-[11.5px] font-medium',
              delta >= 0 ? 'text-success' : 'text-danger',
            )}
          >
            {delta >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {Math.abs(delta).toFixed(1)}%
          </div>
        ) : null}
      </div>
    </>
  );

  const className = cn(
    'group block rounded-xl border border-line bg-surface p-4 text-left shadow-sm transition-all',
    clickable && 'hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md',
  );

  if (clickable) {
    return (
      <button type="button" onClick={onClick} className={cn(className, 'w-full')}>
        {body}
      </button>
    );
  }
  return <Card className={cn(className, 'gap-0')}>{body}</Card>;
};

// ────────────────────────────────────────────────────────────────
// Donut Chart — data: [{ label, value, color? }]
// ────────────────────────────────────────────────────────────────
export const DonutChart = ({ data = [], size = 172, thickness = 24, onSliceClick, centerLabel, centerValue }) => {
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
    <div className="flex flex-col items-center gap-5 md:flex-row md:gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={centerLabel}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--line-2)" strokeWidth={thickness} />
          {arcs.map((a, i) => (
            <path
              key={i}
              d={a.path}
              fill="none"
              stroke={a.color}
              strokeWidth={thickness}
              strokeLinecap="butt"
              className={cn(
                'transition-opacity',
                onSliceClick && 'cursor-pointer',
                hover != null && hover !== i ? 'opacity-35' : 'opacity-100',
              )}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSliceClick?.(a)}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[11px] tracking-[0.04em] text-ink-3 uppercase">{centerLabel || 'Total'}</p>
          <p className="font-mono text-[22px] font-semibold tracking-[-0.02em] text-ink">
            {centerValue ?? fmtInt(total)}
          </p>
        </div>
      </div>

      <ul className="w-full min-w-0 flex-1 space-y-1">
        {arcs.length === 0 ? (
          <li className="text-[12.5px] text-ink-3 italic">No data yet.</li>
        ) : (
          arcs.map((a, i) => (
            <li
              key={i}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSliceClick?.(a)}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1 text-[12.5px] transition-colors',
                onSliceClick && 'cursor-pointer hover:bg-surface-2',
                hover === i && 'bg-surface-2',
              )}
            >
              <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: a.color }} />
              <span className="flex-1 truncate text-ink-2">{a.label}</span>
              <span className="font-mono font-semibold text-ink">{fmtInt(a.value)}</span>
              <span className="w-9 text-right font-mono text-[11px] text-ink-3">
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
    <div className="space-y-2.5">
      {rows.length === 0 ? (
        <p className="text-[12.5px] text-ink-3 italic">No data yet.</p>
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
              className={cn('w-full text-left', onBarClick ? 'cursor-pointer' : 'cursor-default')}
            >
              <div className="mb-1 flex items-center justify-between gap-2 text-[12px]">
                <span className="truncate font-medium text-ink-2">{r.label}</span>
                <span className="ml-2 shrink-0 font-mono font-semibold text-ink">
                  {fmtInt(r.value)}
                  {valueLabel ? <span className="font-normal text-ink-3"> {valueLabel}</span> : null}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-line-2">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
              </div>
            </button>
          );
        })
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────
// Line / Area Chart — data: [{ label, value }]
// ────────────────────────────────────────────────────────────────
export const LineChart = ({ data = [], height = 180, color = PALETTE[0], valueLabel }) => {
  const gradientId = useId();
  const w = 640;
  const padX = 32;
  const padY = 24;
  const pts = data;
  const max = Math.max(1, ...pts.map((p) => p.value || 0));
  const min = 0;

  const xAt = (i) => padX + (i / Math.max(1, pts.length - 1)) * (w - padX * 2);
  const yAt = (v) => height - padY - ((v - min) / (max - min || 1)) * (height - padY * 2);

  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i)} ${yAt(p.value || 0)}`).join(' ');
  const area = pts.length ? `${path} L ${xAt(pts.length - 1)} ${height - padY} L ${padX} ${height - padY} Z` : '';

  if (pts.length === 0) {
    return <p className="py-10 text-center text-[12.5px] text-ink-3 italic">No data yet.</p>;
  }

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${height}`} className="h-auto w-full" preserveAspectRatio="none" role="img">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.24" />
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
            stroke="var(--line-2)"
            strokeWidth="1"
          />
        ))}
        <path d={area} fill={`url(#${gradientId})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={xAt(i)} cy={yAt(p.value || 0)} r="3.5" fill="var(--surface)" stroke={color} strokeWidth="2" />
        ))}
        {pts.map((p, i) => (
          <text key={`l-${i}`} x={xAt(i)} y={height - 6} textAnchor="middle" className="fill-[var(--ink-3)] text-[10px]">
            {p.label}
          </text>
        ))}
      </svg>
      {valueLabel ? <p className="mt-1 text-[11.5px] text-ink-3">{valueLabel}</p> : null}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────
// StatBar — a small labelled progress bar (kg used / total)
// ────────────────────────────────────────────────────────────────
export const StatBar = ({ label, value, total, color = PALETTE[0], suffix = '' }) => {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-[12px]">
        <span className="font-medium text-ink-2">{label}</span>
        <span className="font-mono font-semibold text-ink">
          {fmtNum(value, 3)}
          {suffix} / {fmtNum(total, 3)}
          {suffix}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-line-2">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
};

/** The card a chart sits in — one title/subtitle treatment for every panel on every screen. */
export const ChartPanel = ({ title, subtitle, children, className, actions }) => (
  <Card className={cn('gap-0 rounded-xl border-line p-4 shadow-sm sm:p-5', className)}>
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="font-heading text-[14px] font-semibold text-ink">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-[11.5px] text-ink-3">{subtitle}</p> : null}
      </div>
      {actions}
    </div>
    {children}
  </Card>
);

export const numFmt = { int: fmtInt, num: fmtNum };
