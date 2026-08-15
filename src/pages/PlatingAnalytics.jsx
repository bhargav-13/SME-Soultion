import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Package,
  RotateCcw,
  Scale,
  Users,
} from 'lucide-react';
import SidebarLayout from '@/components/SidebarLayout';
import { ListToolbar } from '@/components/list-toolbar';
import { PageBody, PageHeader } from '@/components/page-header';
import { EmptyState, ListSkeleton } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { matchesSearch, useListFilters } from '@/hooks/use-list-filters';
import { axiosInstance, partyApi } from '@/services/apiService';
import {
  BarChart,
  ChartPanel,
  DonutChart,
  KpiCard,
  LineChart,
  PALETTE,
  StatBar,
  numFmt,
} from '@/components/charts';

const listOf = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.content)) return d.content;
  return [];
};

const monthKey = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const lastNMonths = (n) => {
  const now = new Date();
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('en-IN', { month: 'short' }),
    });
  }
  return out;
};

/**
 * Rolls up a job-work list into party-scoped aggregates:
 *   given   — sum(qtyKg) sent to this party
 *   returned— sum(returns.returnKg) received back
 *   pending — max(0, given − returned)
 *   count / doneCount — job work counts
 *   lastDate— most recent job date
 */
const groupByParty = (jobWorks) => {
  const map = new Map();
  for (const j of jobWorks) {
    const id = j.party?.id ?? 'unknown';
    const name = j.party?.name || '—';
    if (!map.has(id)) {
      map.set(id, {
        partyId: id,
        partyName: name,
        given: 0,
        returned: 0,
        pending: 0,
        count: 0,
        doneCount: 0,
        pendingCount: 0,
        totalRate: 0,
        lastDate: null,
        rows: [],
      });
    }
    const p = map.get(id);
    p.count += 1;
    if ((j.status || 'PENDING') === 'COMPLETE') p.doneCount += 1;
    else p.pendingCount += 1;
    p.given += Number(j.qtyKg) || 0;
    p.totalRate += Number(j.totalRate) || 0;
    const ret = (j.jobWorkReturns || []).reduce((s, r) => s + (Number(r.returnKg) || 0), 0);
    p.returned += ret;
    const dt = j.jobDate || j.chitthiDate || j.createdAt;
    if (dt && (!p.lastDate || new Date(dt) > new Date(p.lastDate))) p.lastDate = dt;
    p.rows.push(j);
  }
  for (const p of map.values()) {
    p.pending = Math.max(0, +(p.given - p.returned).toFixed(3));
    p.given = +p.given.toFixed(3);
    p.returned = +p.returned.toFixed(3);
    p.totalRate = Math.round(p.totalRate);
  }
  return Array.from(map.values()).sort((a, b) => b.given - a.given);
};

const SORT_OPTIONS = [
  { value: 'given', label: 'Most Kg given' },
  { value: 'pending', label: 'Most Kg pending' },
  { value: 'value', label: 'Highest value' },
  { value: 'recent', label: 'Most recent' },
  { value: 'name', label: 'Party name' },
];

/** The party-wise plating analytics screen, shared by the in-house and outside job-work routes. */
const PlatingAnalytics = ({ jobWorkType, title, subtitle, accent = 'primary' }) => {
  const [loading, setLoading] = useState(true);
  const [jobWorks, setJobWorks] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const { filters, setFilter, search, onSearchChange, debouncedSearch, clearFilters, hasActiveFilters } =
    useListFilters({ defaults: { sort: 'given' } });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [jRes] = await Promise.allSettled([
          axiosInstance.get('/api/v1/job-works', {
            params: { jobWorkType, page: 0, size: 1000 },
          }),
          partyApi.getAllParties(),
        ]);
        if (cancelled) return;
        setJobWorks(jRes.status === 'fulfilled' ? listOf(jRes.value) : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobWorkType]);

  const partyAggregates = useMemo(() => groupByParty(jobWorks), [jobWorks]);

  const filteredParties = useMemo(() => {
    const list = partyAggregates.filter((p) => matchesSearch(p, debouncedSearch, ['partyName']));
    const sorted = [...list];
    switch (filters.sort) {
      case 'pending':
        sorted.sort((a, b) => b.pending - a.pending);
        break;
      case 'value':
        sorted.sort((a, b) => b.totalRate - a.totalRate);
        break;
      case 'recent':
        sorted.sort((a, b) => new Date(b.lastDate || 0) - new Date(a.lastDate || 0));
        break;
      case 'name':
        sorted.sort((a, b) => a.partyName.localeCompare(b.partyName));
        break;
      default:
        sorted.sort((a, b) => b.given - a.given);
    }
    return sorted;
  }, [partyAggregates, debouncedSearch, filters.sort]);

  const selected = useMemo(
    () => partyAggregates.find((p) => String(p.partyId) === String(selectedId)) || null,
    [partyAggregates, selectedId],
  );

  const summary = useMemo(() => {
    const given = partyAggregates.reduce((s, p) => s + p.given, 0);
    const returned = partyAggregates.reduce((s, p) => s + p.returned, 0);
    const pending = Math.max(0, given - returned);
    const rate = partyAggregates.reduce((s, p) => s + p.totalRate, 0);
    return {
      partyCount: partyAggregates.length,
      given: +given.toFixed(3),
      returned: +returned.toFixed(3),
      pending: +pending.toFixed(3),
      totalRate: Math.round(rate),
    };
  }, [partyAggregates]);

  return (
    <SidebarLayout>
      <PageHeader
        title={selected ? selected.partyName : title}
        subtitle={selected ? `${selected.count} job work${selected.count === 1 ? '' : 's'}` : subtitle}
        {...(selected
          ? {
              actions: (
                <Button variant="outline" size="sm" onClick={() => setSelectedId(null)}>
                  All parties
                </Button>
              ),
            }
          : {})}
      />

      <PageBody className="space-y-5">
        {selected ? (
          <PartyDetail party={selected} accent={accent} />
        ) : (
          <>
            {/* Summary KPI */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard label="Parties" value={numFmt.int(summary.partyCount)} icon={Users} accent={accent} />
              <KpiCard
                label="Total Kg given"
                value={numFmt.num(summary.given, 1)}
                sublabel="Across all job works"
                icon={Scale}
                accent="slate"
              />
              <KpiCard
                label="Total Kg returned"
                value={numFmt.num(summary.returned, 1)}
                sublabel={`${((summary.returned / (summary.given || 1)) * 100).toFixed(0)}% of given`}
                icon={RotateCcw}
                accent="green"
              />
              <KpiCard
                label="Kg pending"
                value={numFmt.num(summary.pending, 1)}
                sublabel={`₹ ${numFmt.int(summary.totalRate)} total value`}
                icon={Clock}
                accent="amber"
              />
            </div>

            {loading ? (
              <ListSkeleton rows={3} className="h-44" />
            ) : partyAggregates.length === 0 ? (
              <EmptyState
                icon={Users}
                title={`No ${title.toLowerCase()} records yet`}
                description="Job works of this type will roll up here, party by party."
              />
            ) : (
              <>
                <ListToolbar
                  search={{ value: search, onChange: onSearchChange, placeholder: 'Search party…' }}
                  onClear={clearFilters}
                  hasActiveFilters={hasActiveFilters}
                  sort={{ value: filters.sort, onChange: (v) => setFilter('sort', v), options: SORT_OPTIONS }}
                  className="mb-0"
                />

                {filteredParties.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No parties match"
                    description="Nothing here matches that search."
                    action={
                      <Button variant="outline" size="sm" onClick={clearFilters}>
                        Clear search
                      </Button>
                    }
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {filteredParties.map((p, idx) => (
                      <PartyCard
                        key={p.partyId}
                        party={p}
                        color={PALETTE[idx % PALETTE.length]}
                        onClick={() => setSelectedId(p.partyId)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </PageBody>
    </SidebarLayout>
  );
};

// ────────────────────────────────────────────────────────────────
// Party card in the grid
// ────────────────────────────────────────────────────────────────
const PartyCard = ({ party, onClick, color }) => {
  const returnedPct = party.given > 0 ? (party.returned / party.given) * 100 : 0;
  const isComplete = party.pending < 0.01 && party.given > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-xl border border-line bg-surface p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-bold text-white"
            style={{ background: color }}
          >
            {(party.partyName || '?').charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold text-ink">{party.partyName}</p>
            <p className="text-[11.5px] text-ink-3">
              {party.count} job work{party.count === 1 ? '' : 's'} · last{' '}
              {party.lastDate ? new Date(party.lastDate).toLocaleDateString('en-IN') : '—'}
            </p>
          </div>
        </div>
        {isComplete ? (
          <Badge variant="success" className="shrink-0 gap-1">
            <CheckCircle2 className="size-3" /> Cleared
          </Badge>
        ) : party.pending > 0 ? (
          <Badge variant="warning" className="shrink-0 gap-1">
            <AlertTriangle className="size-3" /> {numFmt.num(party.pending, 1)} kg
          </Badge>
        ) : null}
      </div>

      <div className="mt-3.5 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-surface-2 p-2">
          <p className="text-[10px] tracking-[0.04em] text-ink-3 uppercase">Given</p>
          <p className="font-mono text-[13px] font-semibold text-ink">{numFmt.num(party.given, 1)}</p>
        </div>
        <div className="rounded-lg bg-success-soft p-2">
          <p className="text-[10px] tracking-[0.04em] text-success uppercase">Returned</p>
          <p className="font-mono text-[13px] font-semibold text-success">{numFmt.num(party.returned, 1)}</p>
        </div>
        <div className="rounded-lg bg-warning-soft p-2">
          <p className="text-[10px] tracking-[0.04em] text-warning uppercase">Pending</p>
          <p className="font-mono text-[13px] font-semibold text-warning">{numFmt.num(party.pending, 1)}</p>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[11px] text-ink-3">
          <span>Return progress</span>
          <span className="font-mono font-medium text-ink-2">{returnedPct.toFixed(0)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-line-2">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(100, returnedPct)}%`, background: color }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-line-2 pt-2.5 text-[11.5px] text-ink-3">
        <span>Total value</span>
        <span className="font-mono font-semibold text-ink">₹ {numFmt.int(party.totalRate)}</span>
      </div>
    </button>
  );
};

// ────────────────────────────────────────────────────────────────
// Drill-down for one party
// ────────────────────────────────────────────────────────────────
const PartyDetail = ({ party, accent }) => {
  const months = lastNMonths(6);
  const byMonth = new Map(months.map((m) => [m.key, { given: 0, returned: 0 }]));
  for (const j of party.rows) {
    const k = monthKey(j.jobDate || j.chitthiDate || j.createdAt);
    if (!k || !byMonth.has(k)) continue;
    const b = byMonth.get(k);
    b.given += Number(j.qtyKg) || 0;
    b.returned += (j.jobWorkReturns || []).reduce((s, r) => s + (Number(r.returnKg) || 0), 0);
  }
  const trend = months.map((m) => ({ label: m.label, value: +byMonth.get(m.key).given.toFixed(2) }));

  // Item-wise sent
  const itemMap = new Map();
  for (const j of party.rows) {
    const name = j.size?.itemName || j.size?.item?.itemName || j.size?.sizeInInch || '—';
    itemMap.set(name, (itemMap.get(name) || 0) + (Number(j.qtyKg) || 0));
  }
  const topItems = Array.from(itemMap.entries())
    .map(([label, value]) => ({ label, value: +value.toFixed(2) }))
    .sort((a, b) => b.value - a.value);

  const statusDonut = [
    { label: 'Completed', value: party.doneCount, color: PALETTE[3] },
    { label: 'Pending', value: party.pendingCount, color: PALETTE[7] },
  ];

  return (
    <div className="space-y-5">
      <p className="text-[12.5px] text-ink-3">
        Last activity{' '}
        <span className="font-mono font-medium text-ink-2">
          {party.lastDate ? new Date(party.lastDate).toLocaleDateString('en-IN') : '—'}
        </span>
      </p>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Given" value={`${numFmt.num(party.given, 2)} kg`} icon={Scale} accent="slate" />
        <KpiCard label="Returned" value={`${numFmt.num(party.returned, 2)} kg`} icon={RotateCcw} accent="green" />
        <KpiCard label="Pending" value={`${numFmt.num(party.pending, 2)} kg`} icon={Clock} accent="amber" />
        <KpiCard label="Total value" value={`₹ ${numFmt.int(party.totalRate)}`} icon={Package} accent={accent} />
      </div>

      {/* Progress bar */}
      <Card className="gap-0 rounded-xl p-4 sm:p-5">
        <StatBar label="Return progress" value={party.returned} total={party.given} suffix=" kg" color={PALETTE[3]} />
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartPanel className="xl:col-span-2" title="Monthly Kg given" subtitle="Last 6 months">
          <LineChart data={trend} color={PALETTE[0]} />
        </ChartPanel>
        <ChartPanel title="Status" subtitle="Completed vs pending">
          <DonutChart data={statusDonut} centerLabel="Total JW" />
        </ChartPanel>
      </div>

      <ChartPanel title="Top items sent" subtitle="Total Kg by item">
        <BarChart data={topItems} valueLabel="Kg" maxRows={8} />
      </ChartPanel>

      {/* Job work rows table */}
      <Card className="gap-0 overflow-hidden py-0">
        <div className="border-b border-line px-4 py-3.5 sm:px-5">
          <h3 className="font-heading text-[14px] font-semibold text-ink">Job work history</h3>
        </div>
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {['Chithi no.', 'Date', 'Item'].map((h) => (
                  <TableHead
                    key={h}
                    className="px-3 text-[11.5px] font-semibold tracking-[0.03em] text-ink-3 uppercase"
                  >
                    {h}
                  </TableHead>
                ))}
                {['Kg given', 'Kg returned', 'Rate / Kg', 'Total'].map((h) => (
                  <TableHead
                    key={h}
                    className="px-3 text-right text-[11.5px] font-semibold tracking-[0.03em] text-ink-3 uppercase"
                  >
                    {h}
                  </TableHead>
                ))}
                <TableHead className="px-3 text-[11.5px] font-semibold tracking-[0.03em] text-ink-3 uppercase">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {party.rows.map((j) => {
                const ret = (j.jobWorkReturns || []).reduce((s, r) => s + (Number(r.returnKg) || 0), 0);
                const itemName = j.size?.itemName || j.size?.item?.itemName || j.size?.sizeInInch || '—';
                return (
                  <TableRow key={j.id} className="border-line-2">
                    <TableCell className="px-3 py-2.5 font-mono text-[12.5px] font-medium text-ink">
                      {j.chitthiNo || `#${j.id}`}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 font-mono text-[12.5px] text-ink-2">
                      {j.jobDate ? new Date(j.jobDate).toLocaleDateString('en-IN') : '—'}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-[13px] text-ink-2">{itemName}</TableCell>
                    <TableCell className="px-3 py-2.5 text-right font-mono text-[12.5px]">
                      {numFmt.num(j.qtyKg, 3)}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-right font-mono text-[12.5px] text-success">
                      {numFmt.num(ret, 3)}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-right font-mono text-[12.5px]">
                      {j.ratePerKg != null ? numFmt.num(j.ratePerKg, 2) : '—'}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-right font-mono text-[12.5px] font-semibold text-ink">
                      ₹ {numFmt.int(j.totalRate || 0)}
                    </TableCell>
                    <TableCell className="px-3 py-2.5">
                      <Badge variant={j.status === 'COMPLETE' ? 'success' : 'warning'}>{j.status || 'PENDING'}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default PlatingAnalytics;
