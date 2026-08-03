import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import toast from "react-hot-toast";

const EMPTY_FORM = {
  returnElement: "",
  returnType: "PETI",
  grossKg: "",
  petiWeightKg: "1",
};

const TYPE_LABEL = { PETI: "Peti", DRUM: "Drum" };

const round3 = (n) => Math.round(n * 1000) / 1000;
const parseNumber = (v) => {
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

/** Excel: Net Kg = Kgs − Peti × 1-Peti Weight. */
const computeReturnNet = (form) => {
  const gross = parseNumber(form.grossKg);
  const count = parseNumber(form.returnElement);
  const tare = parseNumber(form.petiWeightKg);
  if (gross == null) return null;
  if (count == null || tare == null) return round3(gross);
  return round3(Math.max(0, gross - count * tare));
};

const fmt = (v, d = 3) => (v == null ? "—" : Number(v).toFixed(d));

const GresReturnDialog = ({ isOpen, gres, editingReturn, onClose, onSave }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [openType, setOpenType] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setOpenType(false);
    if (editingReturn) {
      setForm({
        returnElement: editingReturn.returnElement != null ? String(editingReturn.returnElement) : "",
        returnType: editingReturn.returnType || "PETI",
        grossKg: editingReturn.grossKg != null ? String(editingReturn.grossKg) : "",
        petiWeightKg: editingReturn.petiWeightKg != null ? String(editingReturn.petiWeightKg) : "1",
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editingReturn, isOpen]);

  // Job's forward Net Kg — used for both the Diff live preview and the remaining-quota guard.
  const jobNet = useMemo(() => {
    const item = gres?.items?.[0];
    if (!item) return null;
    const n = parseNumber(item.qtyKg);
    return n == null ? null : round3(n);
  }, [gres]);

  // Everything already returned across other rows on this Gres.
  const otherReturnedNet = useMemo(() => {
    const rows = gres?.returns || [];
    return round3(
      rows
        .filter((r) => r.id !== editingReturn?.id)
        .reduce((sum, r) => sum + (Number(r.returnKg) || 0), 0)
    );
  }, [gres, editingReturn?.id]);

  const remaining = useMemo(() => {
    if (jobNet == null) return null;
    return round3(Math.max(0, jobNet - otherReturnedNet));
  }, [jobNet, otherReturnedNet]);

  const returnNet = useMemo(() => computeReturnNet(form), [form]);
  // Diff is cumulative: all returns so far (incl. this one) vs the job's net. Negative = still
  // short (a shortfall / ghati); this makes the final entry read the true loss, not this row
  // measured against the whole job net.
  const ghati = useMemo(() => {
    if (returnNet == null || jobNet == null) return null;
    return round3(otherReturnedNet + returnNet - jobNet);
  }, [returnNet, jobNet, otherReturnedNet]);

  if (!isOpen || !gres) return null;

  const handleSave = () => {
    const gross = parseNumber(form.grossKg);
    const count = parseNumber(form.returnElement);
    const tare = parseNumber(form.petiWeightKg);
    if (gross == null || gross <= 0) {
      toast.error("Kgs is required and must be greater than 0");
      return;
    }
    if (count == null || count < 0) {
      toast.error("Enter the Peti count");
      return;
    }
    if (tare == null || tare < 0) {
      toast.error("Enter the 1 Peti Weight");
      return;
    }
    // Excel allows +Diff (returned more) but blocks further returns once the
    // full Job Net has already been accounted for.
    if (remaining != null && remaining <= 1e-6) {
      toast.error("This Gres is fully returned — no remaining Kg to record.");
      return;
    }

    onSave?.({
      id: editingReturn?.id || Date.now(),
      returnElement: form.returnElement,
      returnType: form.returnType,
      grossKg: round3(gross),
      petiWeightKg: round3(tare),
      returnKg: returnNet,
      ghati,
    });
  };

  const ghatiLabel = ghati == null ? "—" : `${ghati > 0 ? "+ " : ghati < 0 ? "- " : ""}${Math.abs(ghati)}`;
  const inputClass =
    "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none text-sm placeholder:text-gray-400";
  const readonlyClass =
    "w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 outline-none text-sm";

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl border border-gray-200 shadow-xl">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="w-full text-center text-xl font-medium text-black">Return Aavak</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="text-gray-400 hover:text-gray-600">
            x
          </button>
        </div>

        <div className="px-8 py-6 space-y-4">
          {/* Remaining-quota strip */}
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 flex items-center justify-between text-sm">
            <span className="text-amber-900">
              Job Net: <span className="font-semibold">{fmt(jobNet)} Kg</span>
              <span className="mx-2 text-amber-400">·</span>
              Already returned: <span className="font-semibold">{otherReturnedNet} Kg</span>
            </span>
            <span className="text-amber-900">
              Remaining: <span className="font-bold text-amber-800">{fmt(remaining)} Kg</span>
            </span>
          </div>

          {/* Row 1: Peti (left) | Kgs (right) — matches Excel layout */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">Peti :-</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.returnElement}
                  onChange={(e) => setForm((prev) => ({ ...prev, returnElement: e.target.value }))}
                  placeholder="5"
                  className={`flex-1 min-w-0 ${inputClass}`}
                />
                <div className="relative w-24 shrink-0">
                  <button
                    type="button"
                    onClick={() => setOpenType((prev) => !prev)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-lg bg-white text-sm flex items-center justify-between"
                  >
                    <span>{TYPE_LABEL[form.returnType] || form.returnType}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${openType ? "rotate-180" : ""}`} />
                  </button>
                  {openType && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                      {["PETI", "DRUM"].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({ ...prev, returnType: opt }));
                            setOpenType(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                        >
                          {TYPE_LABEL[opt]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Kgs :-</label>
              <input
                type="number"
                step="0.001"
                value={form.grossKg}
                onChange={(e) => setForm((prev) => ({ ...prev, grossKg: e.target.value }))}
                placeholder="153.000"
                className={inputClass}
              />
            </div>
          </div>

          {/* Row 2: 1 Peti Weight (left) | blank (right) — matches Excel */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">1 Peti Weight :-</label>
              <input
                type="number"
                step="0.001"
                value={form.petiWeightKg}
                onChange={(e) => setForm((prev) => ({ ...prev, petiWeightKg: e.target.value }))}
                placeholder="1"
                className={inputClass}
              />
            </div>
            <div />
          </div>

          {/* Row 3: Net Kg (left) | Diff. (right) — matches Excel */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">Net Kg :-</label>
              <input
                value={returnNet != null ? `${returnNet} kg` : ""}
                readOnly
                placeholder="Auto"
                className={readonlyClass}
              />
              <p className="mt-1 text-xs text-gray-400">Net Kg = Kgs − Peti × 1-Peti Weight</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Diff. :-</label>
              <input
                value={ghatiLabel}
                readOnly
                placeholder="—"
                className={`w-full px-3 py-2 border rounded-lg outline-none text-sm ${
                  ghati == null
                    ? "border-gray-200 bg-gray-50 text-gray-700"
                    : ghati >= 0
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold"
                    : "border-red-200 bg-red-50 text-red-700 font-semibold"
                }`}
              />
              <p className="mt-1 text-xs text-gray-400">
                Total Returned {fmt(round3(otherReturnedNet + (returnNet || 0)))} − Job Net {fmt(jobNet)}
              </p>
            </div>
          </div>

          {remaining != null && remaining <= 1e-6 && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              This Gres has 0 Kg remaining — return cannot be recorded.
            </p>
          )}

          <div className="pt-2 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={remaining != null && remaining <= 1e-6}
              className="w-28 h-10 bg-black text-white rounded-lg hover:bg-gray-700 transition text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-28 h-10 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GresReturnDialog;
