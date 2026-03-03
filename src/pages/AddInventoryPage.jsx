import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import SidebarLayout from "../components/SidebarLayout";
import PageHeader from "../components/PageHeader";
import {
  itemBlueprintApi,
  sizeApi,
  inventoryApi,
  categoryApi,
  itemApi,
} from "../services/apiService";
import toast from "react-hot-toast";

const FINISH_FIELDS = [
  { key: "sssatinlacq", label: "S.S & Satin Lacq" },
  { key: "antiq",       label: "ANTQ" },
  { key: "sidegold",    label: "Side Gold" },
  { key: "zblack",      label: "Z-Black" },
  { key: "grblack",     label: "Gr. Black" },
  { key: "mattss",      label: "Matt S.S" },
  { key: "mattantiq",   label: "Matt ANTQ" },
  { key: "pvdrose",     label: "PVD Rose" },
  { key: "pvdgold",     label: "PVD Gold" },
  { key: "pvdblack",    label: "PVD Black" },
  { key: "rosegold",    label: "Rose Gold" },
  { key: "clearlacq",   label: "Clear Lacq." },
];

const DEFAULT_PACKING = {
  pcsPerBox: "", boxPerCarton: "", pcsPerCarton: "", cartonWeight: "",
  sssatinlacq: "", antiq: "", sidegold: "", zblack: "", grblack: "",
  mattss: "", mattantiq: "", pvdrose: "", pvdgold: "", pvdblack: "",
  rosegold: "", clearlacq: "",
};

const inputCls =
  "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none placeholder:text-sm placeholder:text-gray-500";
const labelCls = "block font-medium text-black mb-2";
const readonlyCls =
  "w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-black cursor-not-allowed outline-none placeholder:text-sm placeholder:text-gray-500";

// ─── Divider with section label ─────────────────────────────────────────────
const SectionDivider = ({ title }) => (
  <div className="flex items-center gap-4 pt-4 pb-1">
    <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap">
      {title}
    </span>
    <div className="flex-1 h-px bg-gray-100" />
  </div>
);

// ─── Page ────────────────────────────────────────────────────────────────────
const AddInventoryPage = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const stockSectionRef = useRef(null);

  const [blueprints,     setBlueprints]     = useState([]);
  const [categories,     setCategories]     = useState([]);
  const [blueprintSizes, setBlueprintSizes] = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);

  // ── Section 1 : Blueprint ─────────────────────────────────────────────────
  const [blueprintMode,          setBlueprintMode]          = useState("existing");
  const [selectedBlueprintId,    setSelectedBlueprintId]    = useState("");
  const [newBlueprintName,       setNewBlueprintName]       = useState("");
  const [newBlueprintCategoryId, setNewBlueprintCategoryId] = useState("");
  const [isBpOpen,               setIsBpOpen]               = useState(false);
  const [isCatOpen,              setIsCatOpen]              = useState(false);
  // for displaying selected names
  const selectedBlueprint  = blueprints.find((b) => String(b.id) === String(selectedBlueprintId));
  const selectedCategory   = categories.find((c) => String(c.id) === String(newBlueprintCategoryId));

  // ── Section 2 : Size ──────────────────────────────────────────────────────
  const [sizeInInch,      setSizeInInch]      = useState("");
  const [sizeInMm,        setSizeInMm]        = useState("");
  const [sizeDozenWeight, setSizeDozenWeight] = useState("");

  // ── Section 3 : Stock Entry ───────────────────────────────────────────────
  const [itemKg,           setItemKg]           = useState("");
  const [weightPerPc,      setWeightPerPc]      = useState("");
  const [weightUnit,       setWeightUnit]       = useState("");          // "Kg" | "Gram"
  const [totalPc,          setTotalPc]          = useState("");          // auto-calc
  const [stockDozenWeight, setStockDozenWeight] = useState("");          // auto-calc
  const [lowStockWarning,  setLowStockWarning]  = useState("");
  const [isWeightUnitOpen, setIsWeightUnitOpen] = useState(false);

  // ── Section 4 : Packing ────────────────────────────────────────────────────
  const [packing, setPacking] = useState(DEFAULT_PACKING);

  // ── Highlight stock section on navigate-from-sheet ────────────────────────
  const [stockHighlight, setStockHighlight] = useState(false);

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [bpRes, catRes] = await Promise.all([
          itemBlueprintApi.getAllItems(),
          categoryApi.getAllCategories(),
        ]);
        setBlueprints(Array.isArray(bpRes.data)  ? bpRes.data  : []);
        setCategories(Array.isArray(catRes.data) ? catRes.data : []);
      } catch {
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Auto-select blueprint + pre-fill size + scroll when arriving from sheet ──
  useEffect(() => {
    if (loading) return;                                 // wait for data
    const state = location.state;
    if (!state?.scrollToStock || !state?.blueprintId) return;

    // Pre-select the blueprint in "existing" mode
    setBlueprintMode("existing");
    const bp = blueprints.find((b) => String(b.id) === String(state.blueprintId));
    if (bp) {
      handleBlueprintSelect(bp);                         // sets id + loads sizes
    } else {
      setSelectedBlueprintId(state.blueprintId);
    }

    // Pre-fill Size fields from the row's existing values
    if (state.sizeInInch)  setSizeInInch(state.sizeInInch);
    if (state.sizeInMm)    setSizeInMm(state.sizeInMm);
    if (state.dozenWeight) setSizeDozenWeight(state.dozenWeight);

    // Pre-fill Packing fields from the row's existing values
    const PACKING_KEYS = [
      "pcsPerBox","boxPerCarton","pcsPerCarton","cartonWeight",
      "sssatinlacq","antiq","sidegold","zblack","grblack",
      "mattss","mattantiq","pvdrose","pvdgold","pvdblack","rosegold","clearlacq",
    ];
    const packingFromState = {};
    PACKING_KEYS.forEach((k) => {
      if (state[k] != null && state[k] !== "") packingFromState[k] = String(state[k]);
    });
    if (Object.keys(packingFromState).length > 0) {
      setPacking((prev) => ({ ...prev, ...packingFromState }));
    }

    // Fetch stock entry details from /api/v1/items by resolving sizeId first
    if (state.sizeInInch && state.sizeInMm && state.blueprintId) {
      (async () => {
        try {
          // 1. Resolve sizeId from sizes API
          const sizesRes = await sizeApi.getSizesByItemId(Number(state.blueprintId));
          const sizes = Array.isArray(sizesRes.data) ? sizesRes.data : [];
          const inch = state.sizeInInch.trim();
          const mm   = state.sizeInMm.trim();
          const matchedSize = sizes.find(
            (s) => (s.sizeInInch || "").trim() === inch && (s.sizeInMm || "").trim() === mm
          );
          if (!matchedSize?.id) return;

          // 2. Search stock entries and find by sizeId
          const res  = await itemApi.getAllItems(undefined, undefined, 0, 1000);
          const page = res.data;
          const all  = Array.isArray(page?.data) ? page.data : Array.isArray(page) ? page : [];
          const matched = all.find((it) => it.sizeId === matchedSize.id);
          if (matched) {
            if (matched.itemKg        != null) setItemKg(String(matched.itemKg));
            if (matched.weightPerPc   != null) setWeightPerPc(String(matched.weightPerPc));
            if (matched.totalPc       != null) setTotalPc(String(matched.totalPc));
            if (matched.dozenWeight   != null) setStockDozenWeight(String(matched.dozenWeight));
            if (matched.lowStockWarning != null) setLowStockWarning(String(matched.lowStockWarning));
            setWeightUnit("Kg"); // default; can't infer unit from stored value
          }
        } catch (err) {
          console.error("Failed to load stock details:", err);
        }
      })();
    }

    // Scroll to stock section then highlight for 3 seconds
    const scrollTimer = setTimeout(() => {
      stockSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setStockHighlight(true);
      const clearTimer = setTimeout(() => setStockHighlight(false), 3000);
      return () => clearTimeout(clearTimer);
    }, 400);
    return () => clearTimeout(scrollTimer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // ── Blueprint selection → load sizes ─────────────────────────────────────
  const handleBlueprintSelect = async (bp) => {
    setSelectedBlueprintId(bp.id);
    setIsBpOpen(false);
    setSizeInInch(""); setSizeInMm(""); setSizeDozenWeight("");
    try {
      let sizes = bp.sizes || [];
      if (sizes.length === 0) {
        const res = await sizeApi.getSizesByItemId(Number(bp.id));
        sizes = Array.isArray(res.data) ? res.data : [];
      }
      setBlueprintSizes(sizes);
    } catch (err) {
      console.error("Error loading sizes:", err);
    }
  };

  // ── Quick-fill size chip ───────────────────────────────────────────────────
  const handleSizeChip = (size) => {
    setSizeInInch(size.sizeInInch || "");
    setSizeInMm(size.sizeInMm || "");
    setSizeDozenWeight(size.dozenWeight != null ? String(size.dozenWeight) : "");
  };

  // ── Auto-calculate totalPc & stockDozenWeight ─────────────────────────────
  const recalc = (kg, wpc, unit) => {
    const kgF  = parseFloat(kg)  || 0;
    const wpcF = parseFloat(wpc) || 0;
    const wpcKg = unit === "Gram" ? wpcF / 1000 : wpcF;
    setTotalPc(kgF > 0 && wpcKg > 0 ? (kgF / wpcKg).toFixed(2) : "");
    setStockDozenWeight(wpcKg > 0 ? (wpcKg * 12).toFixed(2) : "");
  };

  const onItemKgChange      = (v) => { setItemKg(v);      recalc(v,      weightPerPc, weightUnit); };
  const onWeightPerPcChange = (v) => { setWeightPerPc(v); recalc(itemKg, v,           weightUnit); };
  const onWeightUnitChange  = (v) => {
    setWeightUnit(v); setIsWeightUnitOpen(false);
    recalc(itemKg, weightPerPc, v);
  };

  const onPackingChange = (key, val) =>
    setPacking((prev) => ({ ...prev, [key]: val }));

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e?.preventDefault();
    const isNew = blueprintMode === "new";

    if (isNew  && !newBlueprintName.trim())    { toast.error("Item name is required");      return; }
    if (isNew  && !newBlueprintCategoryId)     { toast.error("Category is required");       return; }
    if (!isNew && !selectedBlueprintId)        { toast.error("Select a blueprint");         return; }
    if (!sizeInInch.trim() || !sizeInMm.trim()) { toast.error("Size In Inch and MM are required"); return; }

    setSaving(true);
    try {
      // 1) Blueprint
      let blueprintId, categoryId;
      if (isNew) {
        const res = await itemBlueprintApi.createItem({
          itemName:   newBlueprintName.trim(),
          categoryId: Number(newBlueprintCategoryId),
        });
        blueprintId = res.data?.id;
        categoryId  = Number(newBlueprintCategoryId);
      } else {
        blueprintId = Number(selectedBlueprintId);
        const found = blueprints.find((b) => String(b.id) === String(selectedBlueprintId));
        categoryId  = found?.category?.id ?? found?.categoryId;
      }
      if (!blueprintId) throw new Error("Blueprint ID not found");

      // 2) Size — create if new, capture sizeId either way
      const inch = sizeInInch.trim();
      const mm   = sizeInMm.trim();
      const dz   = sizeDozenWeight ? parseFloat(sizeDozenWeight) : null;

      const existingSize = blueprintSizes.find(
        (s) => (s.sizeInInch || "").trim() === inch && (s.sizeInMm || "").trim() === mm
      );

      let sizeId;
      if (!existingSize) {
        // Create new size and capture the returned id
        const szPayload = { sizeInInch: inch, sizeInMm: mm };
        if (dz !== null) szPayload.dozenWeight = dz;
        const szRes = await sizeApi.createSize(blueprintId, szPayload);
        sizeId = szRes.data?.id;
      } else {
        sizeId = existingSize.id;
      }

      // If sizeId still missing (e.g. API didn't return it), re-fetch sizes to find it
      if (!sizeId) {
        const sizesRes = await sizeApi.getSizesByItemId(blueprintId);
        const allSizes = Array.isArray(sizesRes.data) ? sizesRes.data : [];
        const matched  = allSizes.find(
          (s) => (s.sizeInInch || "").trim() === inch && (s.sizeInMm || "").trim() === mm
        );
        sizeId = matched?.id;
      }

      // 3) Stock Entry — /api/v1/items requires sizeId (not sizeInch/sizeMm)
      //    NewItem schema: sizeId, itemKg, weightPerPc, totalPc, lowStockWarning, stockStatus
      if (itemKg || weightPerPc || lowStockWarning) {
        if (!sizeId) throw new Error("Could not resolve sizeId. Cannot create stock entry.");
        const numericSizeId = Number(sizeId);
        const stockPayload = {
          sizeId:          numericSizeId,
          itemKg:          parseFloat(itemKg)           || 0,
          weightPerPc:     parseFloat(weightPerPc)      || 0,
          totalPc:         parseFloat(totalPc)          || 0,
          lowStockWarning: parseFloat(lowStockWarning)  || 0,
          stockStatus:     "IN_STOCK",
        };

        // Check if a stock entry already exists for this sizeId → update instead of create
        let existingStockId = null;
        try {
          const stockRes = await itemApi.getAllItems(undefined, undefined, 0, 1000);
          const stockPage = stockRes.data;
          const allStock = Array.isArray(stockPage?.data) ? stockPage.data : Array.isArray(stockPage) ? stockPage : [];
          const existing = allStock.find((it) => Number(it.sizeId) === numericSizeId);
          if (existing?.id) existingStockId = Number(existing.id);
        } catch { /* ignore — will create new */ }

        if (existingStockId) {
          await itemApi.updateItem(existingStockId, stockPayload);
        } else {
          await itemApi.createItem(stockPayload);
        }
      }

      // 4) Packing inventory (inventoryApi) — still uses sizeInInch/sizeInMm
      const hasPackingData = Object.values(packing).some((v) => v !== "");
      if (hasPackingData) {
        const invPayload = { sizeInInch: inch, sizeInMm: mm };
        if (dz !== null) invPayload.dozenWeight = dz;
        const intFields = ["pcsPerBox", "boxPerCarton", "pcsPerCarton"];
        Object.entries(packing).forEach(([key, val]) => {
          if (val !== "") {
            invPayload[key] = intFields.includes(key)
              ? parseInt(val, 10)
              : parseFloat(val);
          }
        });
        await inventoryApi.createInventory(blueprintId, invPayload);
      }

      toast.success("Inventory saved successfully!");
      navigate("/inventory");
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message || "Failed to save inventory");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => navigate("/inventory");

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
          Loading…
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="max-w-7xl mx-auto">
        {/* ── Page Header ── */}
        <div className="mb-8">
          <PageHeader
            title="Add Inventory"
            description="Create item blueprint, size, stock entry &amp; packing details in one step."
            action={
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400 hover:bg-gray-50 transition"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            }
          />
        </div>

        <form onSubmit={handleSave}>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
            <div className="space-y-6">

              {/* ════ Section 1: Blueprint ════════════════════════════════ */}
              <SectionDivider title="Item Blueprint" />

              {/* Blueprint mode toggle — inline with label row */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="flex items-end justify-between mb-2">
                    <label className="block font-medium text-black">
                      {blueprintMode === "existing" ? "Item Blueprint" : "Item Name"}<span className="text-black">*</span>
                    </label>
                    {/* Toggle */}
                    <div className="flex gap-0.5 bg-gray-100 rounded-md p-0.5">
                      {["existing", "new"].map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => {
                            setBlueprintMode(mode);
                            setSelectedBlueprintId("");
                            setBlueprintSizes([]);
                          }}
                          className={`px-3 py-1 rounded text-xs font-medium transition ${
                            blueprintMode === mode
                              ? "bg-white shadow text-gray-900"
                              : "text-gray-400 hover:text-gray-600"
                          }`}
                        >
                          {mode === "existing" ? "Existing" : "Create New"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {blueprintMode === "existing" ? (
                    /* Select existing — dropdown inside the left column */
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsBpOpen(!isBpOpen)}
                        className="w-full h-[42px] flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-gray-500 transition"
                      >
                        <span className={selectedBlueprint ? "text-gray-900" : "text-gray-500 text-sm"}>
                          {selectedBlueprint
                            ? `${selectedBlueprint.itemName}${selectedBlueprint.category?.name ? ` — ${selectedBlueprint.category.name}` : ""}`
                            : "Select item blueprint…"}
                        </span>
                        <svg className={`w-4 h-4 text-gray-500 transition-transform ${isBpOpen ? "rotate-180" : ""}`}
                          fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isBpOpen && (
                        <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-56 overflow-y-auto">
                          {blueprints.length === 0 ? (
                            <div className="px-4 py-2 text-sm text-gray-500">No blueprints available</div>
                          ) : (
                            blueprints.map((b) => (
                              <button key={b.id} type="button" onClick={() => handleBlueprintSelect(b)}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition">
                                {b.itemName}
                                {b.category?.name && (
                                  <span className="text-gray-400 ml-1">— {b.category.name}</span>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Create new — item name input in left column */
                    <input
                      type="text"
                      value={newBlueprintName}
                      onChange={(e) => setNewBlueprintName(e.target.value)}
                      placeholder="e.g. Butt Hinge, CSK Screw"
                      className="w-full h-[42px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none placeholder:text-sm placeholder:text-gray-500"
                    />
                  )}
                </div>

                {/* Right column — Category (only shown for Create New) */}
                {blueprintMode === "new" && (
                  <div className="flex flex-col">
                    <div className="flex items-end mb-2" style={{ minHeight: "30px" }}>
                      <label className="block font-medium text-black">
                        Category<span className="text-black">*</span>
                      </label>
                    </div>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsCatOpen(!isCatOpen)}
                        className="w-full h-[42px] flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-gray-500 transition"
                      >
                        <span className={selectedCategory ? "text-gray-900" : "text-gray-500 text-sm"}>
                          {selectedCategory ? selectedCategory.name : "Select Category"}
                        </span>
                        <svg className={`w-4 h-4 text-gray-500 transition-transform ${isCatOpen ? "rotate-180" : ""}`}
                          fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isCatOpen && (
                        <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                          {categories.map((c) => (
                            <button key={c.id} type="button"
                              onClick={() => { setNewBlueprintCategoryId(c.id); setIsCatOpen(false); }}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition">
                              {c.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ════ Section 2: Size ════════════════════════════════════ */}
              <SectionDivider title="Size" />

              {/* Quick-fill chips (only when an existing blueprint with sizes is selected) */}
              {blueprintSizes.length > 0 && (
                <div>
                  <label className={labelCls}>Quick-fill from existing sizes</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {blueprintSizes.map((s, i) => {
                      const active = sizeInInch === s.sizeInInch && sizeInMm === s.sizeInMm;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSizeChip(s)}
                          className={`px-3 py-1.5 text-sm rounded-lg border font-medium transition ${
                            active
                              ? "border-black bg-black text-white"
                              : "border-gray-300 text-gray-700 hover:border-gray-500"
                          }`}
                        >
                          {s.sizeInInch} / {s.sizeInMm}
                          {s.dozenWeight != null ? ` (dz ${s.dozenWeight})` : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className={labelCls}>
                    Size in Inch<span className="text-black">*</span>
                  </label>
                  <input type="text" value={sizeInInch}
                    onChange={(e) => setSizeInInch(e.target.value)}
                    placeholder="e.g. 3x3/8" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>
                    Size in MM<span className="text-black">*</span>
                  </label>
                  <input type="text" value={sizeInMm}
                    onChange={(e) => setSizeInMm(e.target.value)}
                    placeholder="e.g. 75x9" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Dozen Weight</label>
                  <input type="number" step="any" value={sizeDozenWeight}
                    onChange={(e) => setSizeDozenWeight(e.target.value)}
                    placeholder="e.g. 1.2" className={inputCls} />
                </div>
              </div>

              {/* ════ Section 3: Stock Entry ════════════════════════════ */}
              <div
                ref={stockSectionRef}
                className={`rounded-lg transition-all duration-700 ${
                  stockHighlight
                    ? "ring-2 ring-amber-400 bg-amber-50 px-4 pb-4 -mx-4"
                    : ""
                }`}
              >
              <SectionDivider title="Stock Entry" />

              <div className="space-y-6 mt-1">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className={labelCls}>Item in Kg</label>
                    <input type="text" value={itemKg}
                      onChange={(e) => onItemKgChange(e.target.value)}
                      placeholder="Enter Kg" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Weight/Pc.</label>
                    <div className="flex gap-2">
                      <input type="text" value={weightPerPc}
                        onChange={(e) => onWeightPerPcChange(e.target.value)}
                        placeholder="Enter Weight/Pc."
                        className={inputCls} />
                      {/* Unit dropdown */}
                      <div className="relative w-28 shrink-0">
                        <button
                          type="button"
                          onClick={() => setIsWeightUnitOpen(!isWeightUnitOpen)}
                          className="w-full h-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-gray-500 transition"
                        >
                          <span className={`font-medium ${weightUnit === "" ? "text-gray-500 text-sm" : "text-gray-900"}`}>
                            {weightUnit === "" ? "Gram/Kg" : weightUnit}
                          </span>
                          <svg className={`w-4 h-4 text-gray-500 transition-transform ${isWeightUnitOpen ? "rotate-180" : ""}`}
                            fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {isWeightUnitOpen && (
                          <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                            {["Kg", "Gram"].map((unit) => (
                              <button key={unit} type="button"
                                onClick={() => onWeightUnitChange(unit)}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition">
                                {unit}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label className={labelCls}>
                      Total Pc. <span className="text-gray-400 text-xs">(Auto-calculated)</span>
                    </label>
                    <input type="text" value={totalPc} readOnly
                      placeholder="Auto-calculated" className={readonlyCls} />
                  </div>
                  <div>
                    <label className={labelCls}>
                      Dozen Weight <span className="text-gray-400 text-xs">(Auto-calculated)</span>
                    </label>
                    <input type="text" value={stockDozenWeight} readOnly
                      placeholder="Auto-calculated" className={readonlyCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Low Stock Warning [Pc.]</label>
                    <input type="text" value={lowStockWarning}
                      onChange={(e) => setLowStockWarning(e.target.value)}
                      placeholder="Set Low stock Warning" className={inputCls} />
                  </div>
                </div>
              </div>
              </div>{/* end stock highlight wrapper */}

              {/* ════ Section 4: Packing Details ═══════════════════════ */}
              <SectionDivider title="Packing Details" />

              <div className="grid grid-cols-4 gap-6">
                {[
                  { key: "pcsPerBox",    label: "Pcs / Box" },
                  { key: "boxPerCarton", label: "Box / Carton" },
                  { key: "pcsPerCarton", label: "Pcs / Carton" },
                  { key: "cartonWeight", label: "Carton Weight" },
                ].map((f) => (
                  <div key={f.key}>
                    <label className={labelCls}>{f.label}</label>
                    <input type="number" step="any" value={packing[f.key]}
                      onChange={(e) => onPackingChange(f.key, e.target.value)}
                      placeholder="—"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none text-center placeholder:text-sm placeholder:text-gray-500" />
                  </div>
                ))}
              </div>

              {/* ════ Section 5: Plating ════════════════════════════════ */}
              <SectionDivider title="Plating" />

              <div className="grid grid-cols-4 gap-6">
                {FINISH_FIELDS.map((f) => (
                  <div key={f.key}>
                    <label className={labelCls}>{f.label}</label>
                    <input type="number" step="any" value={packing[f.key]}
                      onChange={(e) => onPackingChange(f.key, e.target.value)}
                      placeholder="—"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none text-center placeholder:text-sm placeholder:text-gray-500" />
                  </div>
                ))}
              </div>

              {/* ── Action Buttons — identical to AddItem.jsx ── */}
              <div className="flex gap-4 justify-center pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-12 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition font-medium disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-12 py-2 border border-black text-black rounded-xl hover:bg-gray-50 transition font-medium"
                >
                  Cancel
                </button>
              </div>

            </div>
          </div>
        </form>
      </div>
    </SidebarLayout>
  );
};

export default AddInventoryPage;
