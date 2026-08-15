import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SidebarLayout from "@/components/SidebarLayout";
import { PageBody, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import toast from "react-hot-toast";
import { partyApi, gresFillingApi, itemBlueprintApi, sizeApi } from "@/services/apiService";

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
const LBL = "mb-1 block text-[12.5px] font-medium text-ink-2";
const INP =
  "w-full rounded-md border border-line bg-surface px-3 py-2 text-[13px] outline-none transition placeholder:text-ink-3 focus:border-primary focus:ring-2 focus:ring-primary-ring/30";
const RO = "w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-[13px] text-ink-2";

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
    {unit ? <span className="w-8 shrink-0 text-[13px] text-ink-3">{unit}</span> : null}
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

  // Party (vendor) + item/size selection
  const [parties, setParties] = useState([]);
  const [blueprints, setBlueprints] = useState([]);
  const [blueprintId, setBlueprintId] = useState("");
  const [sizes, setSizes] = useState([]);
  const [sizeId, setSizeId] = useState("");

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

  const vendorParties = useMemo(
    () => parties.filter((p) => p.partyType === "VENDOR" || p.partyType === "BOTH"),
    [parties]
  );
  const vendorOptions = useMemo(
    () => vendorParties.map((p) => ({ value: String(p.id), label: p.name })),
    [vendorParties]
  );
  const itemOptions = useMemo(
    () =>
      blueprints.map((b) => ({
        value: String(b.id),
        label: b.itemName,
        description: b.category?.name || undefined,
      })),
    [blueprints]
  );
  const sizeOptions = useMemo(
    () =>
      sizes.map((s) => ({
        value: String(s.id),
        label: `${s.sizeInInch}${s.sizeInMm ? ` (${s.sizeInMm})` : ""}`,
      })),
    [sizes]
  );

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
      <PageHeader
        title={mode === "edit" ? "Edit gres job work" : "New gres job work"}
        subtitle="Weigh once, enter Peti + rate — Net Kg and Total Rate work themselves out."
        backTo="/gres"
        backLabel="Gres"
      />

      <PageBody>
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* LEFT — one card mirroring the Excel "Outside Gris Job-Work" block */}
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-line bg-surface shadow-sm">
                <div className="border-b border-line py-3 text-center font-semibold text-ink">
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
                    <div>
                      <label className={LBL}>Job Worker Name :-</label>
                      <SearchableSelect
                        ariaLabel="Job worker name"
                        placeholder="Select vendor"
                        searchPlaceholder="Search vendor…"
                        options={vendorOptions}
                        value={formData.vendorId ? String(formData.vendorId) : undefined}
                        onChange={(v) => {
                          const p = vendorParties.find((x) => String(x.id) === v);
                          if (p) setFormData((prev) => ({ ...prev, vendorName: p.name, vendorId: p.id }));
                        }}
                      />
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-2">
                    <div>
                      <label className={LBL}>Item Name :-</label>
                      <SearchableSelect
                        ariaLabel="Item name"
                        placeholder="Select item"
                        searchPlaceholder="Search item…"
                        options={itemOptions}
                        value={blueprintId ? String(blueprintId) : undefined}
                        onChange={(v) => {
                          setBlueprintId(v);
                          setSizeId("");
                        }}
                      />
                    </div>
                    <div />
                    <div>
                      <label className={LBL}>Size :-</label>
                      <SearchableSelect
                        ariaLabel="Size"
                        placeholder={blueprintId ? "Select size" : "Pick item first"}
                        searchPlaceholder="Search size…"
                        options={sizeOptions}
                        value={sizeId ? String(sizeId) : undefined}
                        disabled={!blueprintId}
                        onChange={(v) => setSizeId(v)}
                      />
                    </div>
                    <div />
                  </div>

                  {/* Row 5+6: Peti | Kgs, then 1 Peti Weight | Net Kg */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-2 border-t border-line-2">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-2 border-t border-line-2">
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
              <div className="sticky top-4 rounded-xl border border-line bg-surface p-5 shadow-sm">
                <div className="mb-4 rounded-lg bg-ink p-4 text-center text-white">
                  <p className="text-[11px] text-white/60">Total Rate</p>
                  <p className="mt-1 font-mono text-3xl font-semibold">
                    {derived.totalRate != null ? derived.totalRate : "—"}
                  </p>
                </div>
                <div className="space-y-2 text-[13px]">
                  {[
                    ["Ch. No.", chithiNoDisplay || "—"],
                    ["Peti", calc.elementCount ? `${calc.elementCount} Peti` : "—"],
                    ["Kgs", calc.grossKg ? `${calc.grossKg} Kg` : "—"],
                    ["Net Kg", derived.netKg != null ? `${derived.netKg} kg` : "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between rounded-md border border-line-2 bg-surface-2 px-3 py-2">
                      <span className="text-ink-3">{k}</span>
                      <span className="font-mono font-semibold text-ink">{v}</span>
                    </div>
                  ))}
                </div>
                <Button type="submit" disabled={saving} className="mt-5 w-full">
                  {saving ? "Saving…" : mode === "edit" ? "Update gres" : "Create gres"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/gres")}
                  disabled={saving}
                  className="mt-2 w-full"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </form>
      </PageBody>
    </SidebarLayout>
  );
};

export default MoveToGres;
