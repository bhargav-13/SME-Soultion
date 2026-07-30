import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Package,
  Layers,
  BriefcaseBusiness,
  ListTodo,
  Package2,
  Building2,
  Home,
  ClipboardList,
  Ruler,
  ShoppingCart,
} from "lucide-react";
import {
  partyApi,
  categoryApi,
  itemBlueprintApi,
  gresFillingApi,
  axiosInstance,
} from "../services/apiService";
import { KpiCard, DonutChart, BarChart, LineChart, PALETTE, numFmt } from "./charts";

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

const DashboardCards = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState({
    parties: [],
    categories: [],
    blueprints: [],
    jobWorks: [],
    orders: [],
    gres: [],
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [pRes, cRes, iRes, jRes, oRes, gRes] = await Promise.allSettled([
          partyApi.getAllParties(),
          categoryApi.getAllCategories(),
          itemBlueprintApi.getAllItems(),
          axiosInstance.get("/api/v1/job-works", { params: { page: 0, size: 1000 } }),
          axiosInstance.get("/api/v1/orders", { params: { page: 0, size: 1000 } }),
          gresFillingApi.getAllGresFillings(undefined, 0, 500),
        ]);
        if (cancelled) return;
        setState({
          parties: pRes.status === "fulfilled" ? listOf(pRes.value) : [],
          categories: cRes.status === "fulfilled" ? listOf(cRes.value) : [],
          blueprints: iRes.status === "fulfilled" ? listOf(iRes.value) : [],
          jobWorks: jRes.status === "fulfilled" ? listOf(jRes.value) : [],
          orders: oRes.status === "fulfilled" ? listOf(oRes.value) : [],
          gres: gRes.status === "fulfilled" ? listOf(gRes.value) : [],
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const { parties, categories, blueprints, jobWorks, orders, gres } = state;
    const vendors = parties.filter((p) => p.partyType === "VENDOR" || p.partyType === "BOTH");
    const clients = parties.filter((p) => p.partyType === "CLIENT" || p.partyType === "BOTH");
    const totalSizes = blueprints.reduce((sum, b) => sum + (b.sizes?.length || 0), 0);

    // ---- Item analytics ----
    // Items per category (donut)
    const itemsPerCat = new Map();
    for (const b of blueprints) {
      const name = b.category?.name || "Uncategorised";
      itemsPerCat.set(name, (itemsPerCat.get(name) || 0) + 1);
    }
    const itemsByCategory = Array.from(itemsPerCat.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    // Items ranked by number of sizes (bar)
    const itemsBySizeCount = blueprints
      .map((b) => ({ label: b.itemName || `#${b.id}`, value: b.sizes?.length || 0 }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value);

    // ---- Order analytics ----
    // Order status (still used by top KPI open/completed counts)
    const orderStatus = orders.reduce((acc, o) => {
      const s = o.orderStatus || o.status || "OPEN";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});

    // Orders trend (count per month)
    const months = lastNMonths(6);
    const ordersByMonth = new Map(months.map((m) => [m.key, 0]));
    for (const o of orders) {
      const k = monthKey(o.orderDate || o.createdAt || o.orderTime);
      if (k && ordersByMonth.has(k)) ordersByMonth.set(k, ordersByMonth.get(k) + 1);
    }
    const orderTrend = months.map((m) => ({ label: m.label, value: ordersByMonth.get(m.key) || 0 }));

    // ---- Order items — finish + dispatch rollups ----
    // Walk every OrderItem across every Order once.
    const finishOrderCount = new Map(); // finish → count of order lines
    const finishDispatchPc = new Map(); // finish → dispatched pieces
    const dispatchByMonth = new Map(months.map((m) => [m.key, 0]));
    let totalOrderedPc = 0;
    let totalDispatchedPc = 0;
    let totalPendingPc = 0;
    const topDispatchedItems = new Map(); // item name → dispatched pcs

    for (const o of orders) {
      for (const it of o.orderItems || []) {
        const finish = it.plating || "—";
        finishOrderCount.set(finish, (finishOrderCount.get(finish) || 0) + 1);

        const ordered = Number(it.qtyPc) || 0;
        const dispatched = Number(it.totalDispatchedPc) || 0;
        const pending = Number(it.pendingPc) || Math.max(0, ordered - dispatched);
        totalOrderedPc += ordered;
        totalDispatchedPc += dispatched;
        totalPendingPc += pending;
        finishDispatchPc.set(finish, (finishDispatchPc.get(finish) || 0) + dispatched);

        const k = monthKey(it.lastDispatchDate);
        if (k && dispatchByMonth.has(k) && dispatched > 0) {
          dispatchByMonth.set(k, dispatchByMonth.get(k) + dispatched);
        }

        const itemName =
          it.itemSize?.itemName ||
          it.itemSize?.sizeInInch ||
          `#${it.id}`;
        topDispatchedItems.set(itemName, (topDispatchedItems.get(itemName) || 0) + dispatched);
      }
    }

    const ordersByFinish = Array.from(finishOrderCount.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    const dispatchTrend = months.map((m) => ({ label: m.label, value: dispatchByMonth.get(m.key) || 0 }));

    const topFinishesDispatched = Array.from(finishDispatchPc.entries())
      .map(([label, value]) => ({ label, value }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    const topDispatchedItemsList = Array.from(topDispatchedItems.entries())
      .map(([label, value]) => ({ label, value }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // ---- Job Work summary (small, at the bottom) ----
    const jwType = jobWorks.reduce(
      (acc, j) => {
        const t = j.jobWorkType || "OUTSIDE";
        acc[t] = (acc[t] || 0) + 1;
        return acc;
      },
      { OUTSIDE: 0, INHOUSE: 0, MANUAL: 0 }
    );
    const jwByMonth = new Map(months.map((m) => [m.key, 0]));
    for (const j of jobWorks) {
      const k = monthKey(j.jobDate || j.chitthiDate || j.createdAt);
      if (k && jwByMonth.has(k)) jwByMonth.set(k, jwByMonth.get(k) + 1);
    }
    const jwTrend = months.map((m) => ({ label: m.label, value: jwByMonth.get(m.key) || 0 }));
    const totalKgOut = jobWorks.reduce((s, j) => s + (Number(j.qtyKg) || 0), 0);
    const totalRate = jobWorks.reduce((s, j) => s + (Number(j.totalRate) || 0), 0);

    // ---- Gres small stat ----
    const totalGresKg = gres.reduce(
      (s, g) => s + (g.items?.reduce((ss, it) => ss + (Number(it.netWeight) || 0), 0) || 0),
      0
    );

    return {
      partyCount: parties.length,
      vendorCount: vendors.length,
      clientCount: clients.length,
      categoryCount: categories.length,
      itemCount: blueprints.length,
      sizeCount: totalSizes,
      orderCount: orders.length,
      openOrders: (orderStatus.OPEN || 0) + (orderStatus.IN_PROGRESS || 0),
      completedOrders: orderStatus.COMPLETED || orderStatus.COMPLETE || 0,
      itemsByCategory,
      itemsBySizeCount,
      orderTrend,
      ordersByFinish,
      dispatchTrend,
      topFinishesDispatched,
      topDispatchedItemsList,
      totalOrderedPc,
      totalDispatchedPc,
      totalPendingPc,
      jwCount: jobWorks.length,
      jwType,
      jwTrend,
      totalKgOut,
      totalRate,
      gresCount: gres.length,
      totalGresKg,
    };
  }, [state]);

  return (
    <div className="mx-auto max-w-7xl px-5 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">Ishita Industries</p>
          <h1 className="text-3xl font-bold text-gray-900 mt-1">Operations Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Live view across items, orders and job work. Click any card to drill in.
          </p>
        </div>
        {loading ? (
          <div className="text-xs text-gray-400 animate-pulse">Loading live data…</div>
        ) : (
          <div className="text-xs text-gray-400">Updated just now</div>
        )}
      </div>

      {/* ═══ 1. TOP KPI ROW — items and orders lead ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          label="Items"
          value={numFmt.int(stats.itemCount)}
          sublabel="In item master"
          icon={Package}
          accent="amber"
          onClick={() => navigate("/inventory")}
        />
        <KpiCard
          label="Sizes"
          value={numFmt.int(stats.sizeCount)}
          sublabel="Total variants"
          icon={Ruler}
          accent="purple"
          onClick={() => navigate("/inventory")}
        />
        <KpiCard
          label="Categories"
          value={numFmt.int(stats.categoryCount)}
          icon={Layers}
          accent="slate"
          onClick={() => navigate("/masters/category")}
        />
        <KpiCard
          label="Orders"
          value={numFmt.int(stats.orderCount)}
          sublabel={`${stats.openOrders} open · ${stats.completedOrders} done`}
          icon={ShoppingCart}
          accent="green"
          onClick={() => navigate("/order")}
        />
        <KpiCard
          label="Parties"
          value={numFmt.int(stats.partyCount)}
          sublabel={`${stats.vendorCount} vendors · ${stats.clientCount} clients`}
          icon={Users}
          accent="blue"
          onClick={() => navigate("/masters/party")}
        />
        <KpiCard
          label="Gres"
          value={numFmt.int(stats.gresCount)}
          sublabel={`${numFmt.num(stats.totalGresKg, 1)} net Kg`}
          icon={Package2}
          accent="red"
          onClick={() => navigate("/gres")}
        />
      </div>

      {/* ═══ 2. ITEMS FOCUS ═══ */}
      <SectionTitle
        eyebrow="Section 1"
        title="Items"
        hint="Master data — categories, items, sizes"
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Items by category" subtitle="Click a slice to open inventory">
          <DonutChart
            data={stats.itemsByCategory}
            centerLabel="Items"
            onSliceClick={(a) => navigate(`/inventory?category=${encodeURIComponent(a.label)}`)}
          />
        </Panel>
        <Panel title="Items with most sizes" subtitle="Top 8 by size-variant count">
          <BarChart
            data={stats.itemsBySizeCount}
            valueLabel="sizes"
            onBarClick={() => navigate("/inventory")}
            maxRows={8}
          />
        </Panel>
      </div>

      {/* ═══ 3. ORDERS FOCUS ═══ */}
      <SectionTitle
        eyebrow="Section 2"
        title="Orders"
        hint="Volume, dispatch and finish mix"
      />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Panel className="lg:col-span-3" title="Orders trend" subtitle="Last 6 months by count">
          <LineChart data={stats.orderTrend} color={PALETTE[1]} valueLabel="Orders per month" />
        </Panel>
        <Panel className="lg:col-span-2" title="Orders by finish" subtitle="Top finishes across all order lines">
          {stats.ordersByFinish.length > 0 ? (
            <DonutChart
              data={stats.ordersByFinish}
              centerLabel="Lines"
              onSliceClick={() => navigate("/order")}
            />
          ) : (
            <p className="text-sm text-gray-400 italic py-6 text-center">No order lines yet.</p>
          )}
        </Panel>
      </div>

      {/* Dispatch analytics — Pieces summary + trend + finish-wise dispatch */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KpiCard
          label="Ordered Pcs"
          value={numFmt.int(stats.totalOrderedPc)}
          sublabel="Across every order line"
          icon={ShoppingCart}
          accent="slate"
          onClick={() => navigate("/order")}
        />
        <KpiCard
          label="Dispatched Pcs"
          value={numFmt.int(stats.totalDispatchedPc)}
          sublabel={`${
            stats.totalOrderedPc > 0
              ? ((stats.totalDispatchedPc / stats.totalOrderedPc) * 100).toFixed(0)
              : 0
          }% of ordered`}
          icon={ListTodo}
          accent="green"
          onClick={() => navigate("/order")}
        />
        <KpiCard
          label="Pending Pcs"
          value={numFmt.int(stats.totalPendingPc)}
          sublabel="Still to dispatch"
          icon={ClipboardList}
          accent="amber"
          onClick={() => navigate("/order")}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Panel className="lg:col-span-3" title="Dispatch trend" subtitle="Pieces dispatched · last 6 months">
          <LineChart data={stats.dispatchTrend} color={PALETTE[3]} valueLabel="Pieces per month" />
        </Panel>
        <Panel className="lg:col-span-2" title="Top finishes dispatched" subtitle="Pieces by finish">
          <BarChart
            data={stats.topFinishesDispatched}
            valueLabel="pcs"
            onBarClick={() => navigate("/order")}
            maxRows={8}
          />
        </Panel>
      </div>

      {/* ═══ 4. JOB WORK (below — summary only) ═══ */}
      <SectionTitle
        eyebrow="Section 3"
        title="Job Work — summary"
        hint="For full party-wise breakdown open In-House Plating or Outside Job Work"
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KpiCard
          label="Job Works"
          value={numFmt.int(stats.jwCount)}
          sublabel="All types"
          icon={BriefcaseBusiness}
          accent="slate"
          onClick={() => navigate("/job-work")}
        />
        <KpiCard
          label="Kg to Job Work"
          value={`${numFmt.num(stats.totalKgOut, 0)} kg`}
          sublabel="Total net sent"
          icon={ListTodo}
          accent="blue"
          onClick={() => navigate("/job-work")}
        />
        <KpiCard
          label="Total JW Value"
          value={`₹ ${numFmt.int(stats.totalRate)}`}
          sublabel="Rate × Net Kg"
          icon={Package}
          accent="amber"
          onClick={() => navigate("/job-work")}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Job Work by type" subtitle="In-Side vs Out-Side vs Manual">
          <DonutChart
            data={[
              { label: "Out-Side", value: stats.jwType.OUTSIDE || 0, color: PALETTE[0] },
              { label: "In-Side", value: stats.jwType.INHOUSE || 0, color: PALETTE[1] },
              { label: "Manual", value: stats.jwType.MANUAL || 0, color: PALETTE[2] },
            ]}
            centerLabel="Total JW"
            onSliceClick={(a) => {
              if (a.label === "In-Side") navigate("/in-house-plating");
              else if (a.label === "Out-Side") navigate("/outside-job-work");
              else navigate("/job-work");
            }}
          />
        </Panel>
        <Panel title="Job Work trend" subtitle="Last 6 months by count">
          <LineChart data={stats.jwTrend} color={PALETTE[0]} valueLabel="Job works per month" />
        </Panel>
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <NavCard icon={Home} label="In-House Plating" hint="Party-wise INHOUSE analytics" onClick={() => navigate("/in-house-plating")} accent="green" />
        <NavCard icon={Building2} label="Outside Job Work" hint="Party-wise OUTSIDE analytics" onClick={() => navigate("/outside-job-work")} accent="blue" />
        <NavCard icon={ClipboardList} label="Orders" hint="Manage customer orders" onClick={() => navigate("/order")} accent="amber" />
        <NavCard icon={Package2} label="Gres" hint="Gres Job Work" onClick={() => navigate("/gres")} accent="purple" />
      </div>
    </div>
  );
};

const SectionTitle = ({ eyebrow, title, hint }) => (
  <div className="pt-2 border-t border-gray-200">
    <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mt-4">{eyebrow}</p>
    <div className="flex items-baseline gap-3">
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      {hint ? <span className="text-xs text-gray-500">{hint}</span> : null}
    </div>
  </div>
);

const Panel = ({ title, subtitle, children, className = "" }) => (
  <div className={`bg-white rounded-2xl border border-gray-200 p-5 shadow-sm ${className}`}>
    <div className="mb-4">
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {subtitle ? <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p> : null}
    </div>
    {children}
  </div>
);

const NavCard = ({ icon: Icon, label, hint, onClick, accent = "blue" }) => {
  const map = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    purple: "bg-violet-50 text-violet-700",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm hover:shadow-md hover:border-gray-300 transition group"
    >
      <div className={`inline-flex rounded-xl p-2 ${map[accent]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="mt-2 font-semibold text-gray-900">{label}</p>
      <p className="text-xs text-gray-500 mt-0.5">{hint}</p>
    </button>
  );
};

export default DashboardCards;
