import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import SidebarLayout from "../components/SidebarLayout";
import PageHeader from "../components/PageHeader";
import toast from "react-hot-toast";
import { partyApi, gresFillingApi, itemBlueprintApi, sizeApi } from "../services/apiService";

const getNow = () => {
  const d = new Date();
  return { date: d.toISOString().split("T")[0], time: d.toTimeString().slice(0, 5) };
};

const round3 = (n) => Math.round(n * 1000) / 1000;
const parseNumber = (v) => {
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

/** Excel formula: Net Kg = Kgs - Peti × 1-Peti weight; Total Rate = Net × Rate (rounded). */
const computeDerived = (calc) => {
  const gross = parseNumber(calc.grossKg);
  const peti = parseNumber(calc.elementCount);
  const tare = parseNumber(calc.petiWeightKg);
  const rate = parseNumber(calc.ratePerKg);
  const netKg =
    gross != null && peti != null && tare != null
      ? Math.max(0, round3(gross - peti * tare))
      : gross != null
      ? round3(gross)
      : null;
  const totalRate = netKg != null && rate != null ? Math.round(netKg * rate) : null;
  return { netKg, totalRate };
};

const fmt = (n, digits = 3) => (n == null || Number.isNaN(n) ? "—" : Number(n).toFixed(digits));
const padCh = (serial) => (serial != null ? String(serial).padStart(3, "0") : "");

const EMPTY_FORM = {
  vendorName: "",
  vendorId: "",
  date: "",
  time: "",
};

const EMPTY_CALC = {
  grossKg: "",
  elementCount: "",
  petiWeightKg: "1",
  ratePerKg: "",
};

// Shared field styles. Labels mirror the client's Excel exactly ("Peti :-" style).
const LBL = "block text-sm font-medium text-black mb-1";
const INP =
  "w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 outline-none placeholder:text-gray-400";
const RO = "w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-800 text-sm";

// Defined at module scope (NOT inside MoveToGres): a component declared inside the parent's render
// is a brand-new type on every keystroke, so React unmounts/remounts its <input> and the caret is
// lost after one character. Hoisting it keeps the input mounted so typing stays focused.
const UnitInput = ({ value, onChange, placeholder, unit, step = "0.001" }) => (
  <div className="flex items-center gap-2">
    <input
      type="number"
      step={step}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`flex-1 min-w-0 ${INP}`}
    />
    {unit ? <span className="text-sm text-gray-500 w-8 shrink-0">{unit}</span> : null}
  </div>
);

const MoveToGres = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const mode = location.state?.mode === "edit" ? "edit" : "create";
  const editGresId = location.state?.gresId || null;

  const [formData, setFormData] = useState(() => ({ ...EMPTY_FORM, ...getNow() }));
  const [calc, setCalc] = useState(EMPTY_CALC);
  const [status, setStatus] = useState("PENDING");
  const [chithiNoDisplay, setChithiNoDisplay] = useState(""); // "001" — backend-assigned on save
  const [saving, setSaving] = useState(false);

  // Party (vendor) dropdown
  const [parties, setParties] = useState([]);
  const [isPartyOpen, setIsPartyOpen] = useState(false);
  const [partySearch, setPartySearch] = useState("");
  const partyRef = useRef(null);

  // Item + size dropdowns
  const [blueprints, setBlueprints] = useState([]);
  const [blueprintId, setBlueprintId] = useState("");
  const [sizes, setSizes] = useState([]);
  const [sizeId, setSizeId] = useState("");
  const [itemOpen, setItemOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const itemRef = useRef(null);
  const sizeRef = useRef(null);

  // Load vendors + items on mount
  useEffect(() => {
    (async () => {
      try {
        const [pRes, bRes] = await Promise.all([partyApi.getAllParties(), itemBlueprintApi.getAllItems()]);
        const pd = pRes.data;
        setParties(Array.isArray(pd?.data) ? pd.data : Array.isArray(pd) ? pd : []);
        const bd = bRes.data;
        setBlueprints(Array.isArray(bd?.data) ? bd.data : Array.isArray(bd) ? bd : []);
      } catch {
        toast.error("Failed to load vendors / items");
      }
    })();
  }, []);

  // Load sizes when the item changes
  useEffect(() => {
    if (!blueprintId) {
      setSizes([]);
      return;
    }
    (async () => {
      try {
        const res = await sizeApi.getSizesByItemId(Number(blueprintId));
        setSizes(Array.isArray(res.data) ? res.data : []);
      } catch {
        toast.error("Failed to load sizes");
      }
    })();
  }, [blueprintId]);

  // Load existing record for edit. Runs once blueprints are available so we can
  // walk them to find the parent item when the API response's size doesn't
  // carry itemId itself (older records, or backends that haven't picked up the
  // mapper reload yet).
  useEffect(() => {
    if (!editGresId || blueprints.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await gresFillingApi.getGresFillingById(editGresId);
        if (cancelled) return;
        const g = res.data;
        if (!g) return;
        setStatus(g.status || "PENDING");
        setChithiNoDisplay(padCh(g.chNoSerial) || g.chitthiNo || "");
        setFormData({
          vendorName: g.party?.name || "",
          vendorId: g.party?.id || "",
          date: /^\d{4}-\d{2}-\d{2}$/.test(g.chitthiDate || "") ? g.chitthiDate : getNow().date,
          time: g.orderTime || getNow().time,
        });
        const item = (g.items || [])[0] || {};
        const sz = item.size || {};
        let bpId = sz.itemId != null ? String(sz.itemId) : "";
        if (!bpId && sz.id != null) {
          // Fallback: walk item-master blueprints (getAllItems embeds their sizes)
          // and pick the one that owns this size id.
          const parent = blueprints.find((bp) =>
            (bp.sizes || []).some((s) => Number(s.id) === Number(sz.id))
          );
          if (parent) bpId = String(parent.id);
        }
        if (bpId) setBlueprintId(bpId);
        if (sz.id != null) setSizeId(String(sz.id));
        setCalc({
          grossKg: item.unitKg != null ? String(item.unitKg) : "",
          elementCount: item.elementCount != null ? String(item.elementCount) : "",
          petiWeightKg: item.petiWeightKg != null ? String(item.petiWeightKg) : "1",
          ratePerKg: item.ratePerKg != null ? String(item.ratePerKg) : "",
        });
      } catch {
        if (!cancelled) toast.error("Failed to load gres record for editing");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editGresId, blueprints]);

  // Close dropdowns on outside click
  useEffect(() => {
    const onDown = (e) => {
      if (partyRef.current && !partyRef.current.contains(e.target)) setIsPartyOpen(false);
      if (itemRef.current && !itemRef.current.contains(e.target)) setItemOpen(false);
      if (sizeRef.current && !sizeRef.current.contains(e.target)) setSizeOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const vendorParties = useMemo(
    () => parties.filter((p) => p.partyType === "VENDOR" || p.partyType === "BOTH"),
    [parties]
  );
  const filteredParties = useMemo(() => {
    const q = partySearch.trim().toLowerCase();
    return q ? vendorParties.filter((p) => (p.name || "").toLowerCase().includes(q)) : vendorParties;
  }, [vendorParties, partySearch]);
  const filteredItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    return q ? blueprints.filter((b) => (b.itemName || "").toLowerCase().includes(q)) : blueprints;
  }, [blueprints, itemSearch]);

  const selectedBlueprint = blueprints.find((b) => String(b.id) === String(blueprintId));
  const selectedSize = sizes.find((s) => String(s.id) === String(sizeId));

  const derived = useMemo(() => computeDerived(calc), [calc]);

  const handleSave = async () => {
    if (!formData.vendorId) {
      toast.error("Please select a job worker (vendor)");
      return;
    }
    if (!sizeId) {
      toast.error("Please pick the item and size");
      return;
    }
    if (!calc.grossKg || parseFloat(calc.grossKg) <= 0) {
      toast.error("Enter the gross Kgs");
      return;
    }

    const payload = {
      partyId: Number(formData.vendorId),
      chitthiDate: formData.date || getNow().date,
      orderTime: formData.time || undefined,
      status,
      items: [
        {
          sizeId: Number(sizeId),
          unitKg: parseFloat(calc.grossKg),
          unitType: "Kgs",
          elementCount: calc.elementCount ? parseFloat(calc.elementCount) : undefined,
          elementType: "PETI",
          petiWeightKg: calc.petiWeightKg ? parseFloat(calc.petiWeightKg) : undefined,
          ratePerKg: calc.ratePerKg ? parseFloat(calc.ratePerKg) : undefined,
          // netWeight + totalAmount are computed server-side; sent for convenience only.
          netWeight: derived.netKg ?? undefined,
          totalAmount: derived.totalRate ?? undefined,
        },
      ],
    };

    setSaving(true);
    try {
      if (mode === "edit" && editGresId) {
        await gresFillingApi.updateGresFilling(editGresId, payload);
        toast.success("Gres updated!");
      } else {
        await gresFillingApi.createGresFilling(payload);
        toast.success("Gres created!");
      }
      navigate("/gres");
    } catch {
      toast.error(mode === "edit" ? "Failed to update gres" : "Failed to create gres");
    } finally {
      setSaving(false);
    }
  };

  const netKgText = derived.netKg != null ? `${derived.netKg} kg` : "";
  const totalRateText = derived.totalRate != null ? `${derived.totalRate}` : "";

  return (
    <SidebarLayout>
      <div className="max-w-5xl mx-auto pb-12">
        <div className="mb-4">
          <PageHeader
            title={mode === "edit" ? "Edit Gres Job Work" : "New Gres Job Work"}
            description="Weigh once, enter Peti + rate — Net Kg and Total Rate work themselves out."
            action={
              <button
                type="button"
                onClick={() => navigate("/gres")}
                className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400 hover:bg-gray-50 transition"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            }
          />
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT — one card mirroring the Excel "Outside Gris Job-Work" block */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl border border-gray-300 shadow-sm">
                <div className="text-center py-3 border-b border-gray-300 font-bold text-black">
                  Outside Gris Job-Work
                </div>
                <div className="p-6 space-y-5">
                  {/* Row 1: Ch. No. | Date */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <label className={LBL}>Ch. No. :-</label>
                      <input
                        value={chithiNoDisplay || "— auto —"}
                        readOnly
                        className={RO}
                        title="Assigned on save (monthly counter, resets each month)"
                      />
                    </div>
                    <div>
                      <label className={LBL}>Date :-</label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                        className={INP}
                      />
                    </div>
                  </div>

                  {/* Row 2: Job Worker Name | Time */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div className="relative" ref={partyRef}>
                      <label className={LBL}>Job Worker Name :-</label>
                      <div
                        className={`${INP} cursor-pointer flex items-center justify-between`}
                        onClick={() => setIsPartyOpen((p) => !p)}
                      >
                        <span className={formData.vendorName ? "text-gray-900" : "text-gray-400"}>
                          {formData.vendorName || "Select vendor"}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isPartyOpen ? "rotate-180" : ""}`} />
                      </div>
                      {isPartyOpen && (
                        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                          <div className="px-3 py-2 border-b border-gray-100">
                            <input
                              type="text"
                              value={partySearch}
                              onChange={(e) => setPartySearch(e.target.value)}
                              placeholder="Search vendor..."
                              className={INP}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {filteredParties.length === 0 ? (
                              <p className="px-4 py-2 text-sm text-gray-400">No vendors found</p>
                            ) : (
                              filteredParties.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    setFormData((prev) => ({ ...prev, vendorName: p.name, vendorId: p.id }));
                                    setIsPartyOpen(false);
                                    setPartySearch("");
                                  }}
                                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                                    formData.vendorId === p.id ? "font-semibold bg-gray-50" : ""
                                  }`}
                                >
                                  {p.name}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className={LBL}>Time :-</label>
                      <input
                        type="time"
                        value={formData.time}
                        onChange={(e) => setFormData((prev) => ({ ...prev, time: e.target.value }))}
                        className={INP}
                      />
                    </div>
                  </div>

                  {/* Row 3+4: Item Name / Size on their own row per Excel (label + input, right column blank) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-2 border-t border-gray-100">
                    <div className="relative" ref={itemRef}>
                      <label className={LBL}>Item Name :-</label>
                      <div
                        className={`${INP} cursor-pointer flex items-center justify-between`}
                        onClick={() => setItemOpen((p) => !p)}
                      >
                        <span className={selectedBlueprint ? "text-gray-900" : "text-gray-400"}>
                          {selectedBlueprint?.itemName || "Select item"}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${itemOpen ? "rotate-180" : ""}`} />
                      </div>
                      {itemOpen && (
                        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                          <div className="px-3 py-2 border-b border-gray-100">
                            <input
                              type="text"
                              value={itemSearch}
                              onChange={(e) => setItemSearch(e.target.value)}
                              placeholder="Search item..."
                              className={INP}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {filteredItems.length === 0 ? (
                              <p className="px-4 py-2 text-sm text-gray-400">No items</p>
                            ) : (
                              filteredItems.map((b) => (
                                <button
                                  key={b.id}
                                  type="button"
                                  onClick={() => {
                                    setBlueprintId(String(b.id));
                                    setSizeId("");
                                    setItemOpen(false);
                                    setItemSearch("");
                                  }}
                                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                                    String(b.id) === String(blueprintId) ? "font-semibold bg-gray-50" : ""
                                  }`}
                                >
                                  {b.itemName}
                                  {b.category?.name ? <span className="text-gray-400"> · {b.category.name}</span> : null}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div />
                    <div className="relative" ref={sizeRef}>
                      <label className={LBL}>Size :-</label>
                      <button
                        type="button"
                        disabled={!blueprintId}
                        onClick={() => setSizeOpen((p) => !p)}
                        className={`${INP} flex items-center justify-between ${!blueprintId ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        <span className={selectedSize ? "text-gray-900" : "text-gray-400"}>
                          {selectedSize
                            ? `${selectedSize.sizeInInch}${selectedSize.sizeInMm ? ` (${selectedSize.sizeInMm})` : ""}`
                            : blueprintId
                            ? "Select size"
                            : "Pick item first"}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${sizeOpen ? "rotate-180" : ""}`} />
                      </button>
                      {sizeOpen && blueprintId && (
                        <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                          {sizes.length === 0 ? (
                            <p className="px-4 py-2 text-sm text-gray-400">No sizes</p>
                          ) : (
                            sizes.map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => {
                                  setSizeId(String(s.id));
                                  setSizeOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                                  String(s.id) === String(sizeId) ? "font-semibold bg-gray-50" : ""
                                }`}
                              >
                                {s.sizeInInch}
                                {s.sizeInMm ? ` (${s.sizeInMm})` : ""}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    <div />
                  </div>

                  {/* Row 5+6: Peti | Kgs, then 1 Peti Weight | Net Kg */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-2 border-t border-gray-100">
                    <div>
                      <label className={LBL}>Peti :-</label>
                      <UnitInput
                        value={calc.elementCount}
                        onChange={(e) => setCalc((c) => ({ ...c, elementCount: e.target.value }))}
                        placeholder="5"
                        unit="Peti"
                        step="1"
                      />
                    </div>
                    <div>
                      <label className={LBL}>Kgs :-</label>
                      <UnitInput
                        value={calc.grossKg}
                        onChange={(e) => setCalc((c) => ({ ...c, grossKg: e.target.value }))}
                        placeholder="150.150"
                        unit="Kg"
                      />
                    </div>
                    <div>
                      <label className={LBL}>1 Peti Weight :-</label>
                      <UnitInput
                        value={calc.petiWeightKg}
                        onChange={(e) => setCalc((c) => ({ ...c, petiWeightKg: e.target.value }))}
                        placeholder="1"
                        unit="Kg"
                      />
                    </div>
                    <div>
                      <label className={LBL}>Net Kg :-</label>
                      <input value={netKgText} readOnly placeholder="Auto" className={RO} />
                    </div>
                  </div>

                  {/* Row 7: Rate / Kg | Total Rate */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-2 border-t border-gray-100">
                    <div>
                      <label className={LBL}>Rate / Kg :-</label>
                      <input
                        type="number"
                        step="0.01"
                        value={calc.ratePerKg}
                        onChange={(e) => setCalc((c) => ({ ...c, ratePerKg: e.target.value }))}
                        className={INP}
                        placeholder="5"
                      />
                    </div>
                    <div>
                      <label className={LBL}>Total Rate :-</label>
                      <input value={totalRateText} readOnly placeholder="Auto" className={RO} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT — compact summary + actions */}
            <div>
              <div className="sticky top-4 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="rounded-lg bg-gray-900 text-white p-4 mb-4 text-center">
                  <p className="text-xs text-white/60">Total Rate</p>
                  <p className="text-3xl font-semibold mt-1">
                    {derived.totalRate != null ? derived.totalRate : "—"}
                  </p>
                </div>
                <div className="space-y-2 text-sm">
                  {[
                    ["Ch. No.", chithiNoDisplay || "—"],
                    ["Peti", calc.elementCount ? `${calc.elementCount} Peti` : "—"],
                    ["Kgs", calc.grossKg ? `${calc.grossKg} Kg` : "—"],
                    ["Net Kg", derived.netKg != null ? `${derived.netKg} kg` : "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between px-3 py-2 rounded-md bg-gray-50 border border-gray-100">
                      <span className="text-gray-500">{k}</span>
                      <span className="font-semibold text-gray-900">{v}</span>
                    </div>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="mt-5 w-full py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving…" : mode === "edit" ? "Update Gres" : "Create Gres"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/gres")}
                  disabled={saving}
                  className="mt-2 w-full py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
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

export default MoveToGres;
