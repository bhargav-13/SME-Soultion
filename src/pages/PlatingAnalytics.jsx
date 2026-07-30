import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  ArrowLeft,
  Package,
  Scale,
  RotateCcw,
  Clock,
  Search,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import SidebarLayout from "../components/SidebarLayout";
import { axiosInstance, partyApi } from "../services/apiService";
import { KpiCard, BarChart, LineChart, DonutChart, StatBar, PALETTE, numFmt } from "../components/charts";

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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const lastNMonths = (n) => {
  const now = new Date();
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("en-IN", { month: "short" }),
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
    const id = j.party?.id ?? "unknown";
    const name = j.party?.name || "—";
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
    if ((j.status || "PENDING") === "COMPLETE") p.doneCount += 1;
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

/** ⬇ MAIN PAGE ⬇ */
const PlatingAnalytics = ({ jobWorkType, title, subtitle, accent = "blue" }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [jobWorks, setJobWorks] = useState([]);
  const [parties, setParties] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [jRes, pRes] = await Promise.allSettled([
          axiosInstance.get("/api/v1/job-works", {
            params: { jobWorkType, page: 0, size: 1000 },
          }),
          partyApi.getAllParties(),
        ]);
        if (cancelled) return;
        setJobWorks(jRes.status === "fulfilled" ? listOf(jRes.value) : []);
        setParties(pRes.status === "fulfilled" ? listOf(pRes.value) : []);
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
    const q = search.trim().toLowerCase();
    if (!q) return partyAggregates;
    return partyAggregates.filter((p) => (p.partyName || "").toLowerCase().includes(q));
  }, [partyAggregates, search]);

  const selected = useMemo(
    () => partyAggregates.find((p) => String(p.partyId) === String(selectedId)) || null,
    [partyAggregates, selectedId]
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
      <div className="mx-auto max-w-7xl px-5 py-6 space-y-6">
        {selected ? (
          <PartyDetail party={selected} accent={accent} onBack={() => setSelectedId(null)} />
        ) : (
          <>
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            </div>

            {/* Summary KPI */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard label="Parties" value={numFmt.int(summary.partyCount)} icon={Users} accent={accent} />
              <KpiCard
                label="Total Kg Given"
                value={numFmt.num(summary.given, 1)}
                sublabel="Across all job works"
                icon={Scale}
                accent="slate"
              />
              <KpiCard
                label="Total Kg Returned"
                value={numFmt.num(summary.returned, 1)}
                sublabel={`${((summary.returned / (summary.given || 1)) * 100).toFixed(0)}% of given`}
                icon={RotateCcw}
                accent="green"
              />
              <KpiCard
                label="Kg Pending"
                value={numFmt.num(summary.pending, 1)}
                sublabel={`₹ ${numFmt.int(summary.totalRate)} total value`}
                icon={Clock}
                accent="amber"
              />
            </div>

            {loading ? (
              <div className="text-sm text-gray-400 py-16 text-center">Loading party analytics…</div>
            ) : partyAggregates.length === 0 ? (
              <div className="text-sm text-gray-400 py-16 text-center rounded-xl border border-dashed border-gray-300 bg-gray-50">
                No {title.toLowerCase()} records yet.
              </div>
            ) : (
              <>
                {/* Search */}
                <div className="relative max-w-md">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search party…"
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-gray-900/10 outline-none"
                  />
                </div>

                {/* Party cards grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredParties.map((p, idx) => (
                    <PartyCard
                      key={p.partyId}
                      party={p}
                      accent={accent}
                      color={PALETTE[idx % PALETTE.length]}
                      onClick={() => setSelectedId(p.partyId)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
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
      className="group relative text-left rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-gray-300 transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center justify-center w-9 h-9 rounded-full text-white text-sm font-bold shrink-0"
              style={{ background: color }}
            >
              {(party.partyName || "?").charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">{party.partyName}</p>
              <p className="text-xs text-gray-500">
                {party.count} job work{party.count === 1 ? "" : "s"} · last{" "}
                {party.lastDate ? new Date(party.lastDate).toLocaleDateString("en-IN") : "—"}
              </p>
            </div>
          </div>
        </div>
        {isComplete ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 shrink-0">
            <CheckCircle2 className="w-3 h-3" /> Cleared
          </span>
        ) : party.pending > 0 ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-amber-50 text-amber-700 shrink-0">
            <AlertTriangle className="w-3 h-3" /> {numFmt.num(party.pending, 1)} kg
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Given</p>
          <p className="text-sm font-bold text-slate-900">{numFmt.num(party.given, 1)}</p>
        </div>
        <div className="rounded-lg bg-emerald-50 p-2">
          <p className="text-[10px] uppercase tracking-wide text-emerald-600">Returned</p>
          <p className="text-sm font-bold text-emerald-800">{numFmt.num(party.returned, 1)}</p>
        </div>
        <div className="rounded-lg bg-amber-50 p-2">
          <p className="text-[10px] uppercase tracking-wide text-amber-600">Pending</p>
          <p className="text-sm font-bold text-amber-800">{numFmt.num(party.pending, 1)}</p>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
          <span>Return progress</span>
          <span className="font-medium text-gray-700">{returnedPct.toFixed(0)}%</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(100, returnedPct)}%`, background: color }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span>Total value</span>
        <span className="font-semibold text-gray-900">₹ {numFmt.int(party.totalRate)}</span>
      </div>
    </button>
  );
};

// ────────────────────────────────────────────────────────────────
// Drill-down for one party
// ────────────────────────────────────────────────────────────────
const PartyDetail = ({ party, onBack, accent }) => {
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
    const name = j.size?.itemName || j.size?.item?.itemName || j.size?.sizeInInch || "—";
    itemMap.set(name, (itemMap.get(name) || 0) + (Number(j.qtyKg) || 0));
  }
  const topItems = Array.from(itemMap.entries())
    .map(([label, value]) => ({ label, value: +value.toFixed(2) }))
    .sort((a, b) => b.value - a.value);

  const statusDonut = [
    { label: "Completed", value: party.doneCount, color: PALETTE[1] },
    { label: "Pending", value: party.pendingCount, color: PALETTE[2] },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-black transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to all parties
        </button>
      </div>

      <div className="flex items-center gap-3">
        <span
          className="inline-flex items-center justify-center w-12 h-12 rounded-full text-white text-lg font-bold"
          style={{ background: PALETTE[0] }}
        >
          {(party.partyName || "?").charAt(0).toUpperCase()}
        </span>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{party.partyName}</h2>
          <p className="text-sm text-gray-500">
            {party.count} job work{party.count === 1 ? "" : "s"} · Last activity{" "}
            {party.lastDate ? new Date(party.lastDate).toLocaleDateString("en-IN") : "—"}
          </p>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Given" value={`${numFmt.num(party.given, 2)} kg`} icon={Scale} accent="slate" />
        <KpiCard label="Returned" value={`${numFmt.num(party.returned, 2)} kg`} icon={RotateCcw} accent="green" />
        <KpiCard label="Pending" value={`${numFmt.num(party.pending, 2)} kg`} icon={Clock} accent="amber" />
        <KpiCard label="Total Value" value={`₹ ${numFmt.int(party.totalRate)}`} icon={Package} accent={accent} />
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <StatBar
          label="Return progress"
          value={party.returned}
          total={party.given}
          suffix=" kg"
          color={PALETTE[1]}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm lg:col-span-2">
          <div className="mb-3">
            <h3 className="text-base font-semibold text-gray-900">Monthly Kg given</h3>
            <p className="text-xs text-gray-500">Last 6 months</p>
          </div>
          <LineChart data={trend} color={PALETTE[0]} />
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="mb-3">
            <h3 className="text-base font-semibold text-gray-900">Status</h3>
            <p className="text-xs text-gray-500">Completed vs pending</p>
          </div>
          <DonutChart data={statusDonut} centerLabel="Total JW" />
        </div>
      </div>

      {/* Top items */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-gray-900">Top items sent</h3>
          <p className="text-xs text-gray-500">Total Kg by item</p>
        </div>
        <BarChart data={topItems} valueLabel="Kg" maxRows={8} />
      </div>

      {/* Job work rows table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">Job work history</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2.5">Chithi No.</th>
                <th className="text-left px-4 py-2.5">Date</th>
                <th className="text-left px-4 py-2.5">Item</th>
                <th className="text-right px-4 py-2.5">Kg given</th>
                <th className="text-right px-4 py-2.5">Kg returned</th>
                <th className="text-right px-4 py-2.5">Rate / Kg</th>
                <th className="text-right px-4 py-2.5">Total</th>
                <th className="text-left px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {party.rows.map((j) => {
                const ret = (j.jobWorkReturns || []).reduce((s, r) => s + (Number(r.returnKg) || 0), 0);
                const itemName = j.size?.itemName || j.size?.item?.itemName || j.size?.sizeInInch || "—";
                return (
                  <tr key={j.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{j.chitthiNo || `#${j.id}`}</td>
                    <td className="px-4 py-2.5 text-gray-700">
                      {j.jobDate ? new Date(j.jobDate).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">{itemName}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{numFmt.num(j.qtyKg, 3)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-emerald-700">
                      {numFmt.num(ret, 3)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {j.ratePerKg != null ? numFmt.num(j.ratePerKg, 2) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold">
                      ₹ {numFmt.int(j.totalRate || 0)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          j.status === "COMPLETE"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {j.status || "PENDING"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PlatingAnalytics;
