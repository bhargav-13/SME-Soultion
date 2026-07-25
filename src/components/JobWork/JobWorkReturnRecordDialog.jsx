import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import { jobWorkReturnApi } from "../../services/apiService";

const EMPTY_FORM = {
  returnElementCount: "",
  elementType: "PETI",
  petiWeightKg: "",
  grossKg: "",
  ghati: "",
  jobReturnDate: "",
};

const round3 = (n) => Math.round(n * 1000) / 1000;

const parseNumber = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/** Net Kg = Gross Kg (weighed once) - Peti/Drum count * tare weight per Peti/Drum (kg). */
const getNetKg = (form) => {
  const grossKg = parseNumber(form.grossKg);
  if (grossKg === null) return null;
  const count = parseNumber(form.returnElementCount) ?? 0;
  const petiWeightKg = parseNumber(form.petiWeightKg) ?? 0;
  return Math.max(0, round3(grossKg - count * petiWeightKg));
};

const JobWorkReturnRecordDialog = ({ isOpen, jobWork, editingReturn, onClose, onSaved }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [ghatiTouched, setGhatiTouched] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsTypeOpen(false);
    setGhatiTouched(false);
    if (editingReturn) {
      setForm({
        returnElementCount: String(editingReturn.returnElementCount ?? ""),
        elementType: editingReturn.elementType || "PETI",
        petiWeightKg: editingReturn.petiWeightKg != null ? String(editingReturn.petiWeightKg) : "",
        grossKg: editingReturn.grossKg != null ? String(editingReturn.grossKg) : "",
        ghati: editingReturn.ghati != null ? String(editingReturn.ghati) : "",
        jobReturnDate: editingReturn.jobReturnDate ? editingReturn.jobReturnDate.substring(0, 10) : "",
      });
      setGhatiTouched(true);
    } else {
      setForm(EMPTY_FORM);
    }
  }, [isOpen, editingReturn]);

  const returns = jobWork?.jobWorkReturns || [];
  const alreadyReturnedKg = round3(
    returns
      .filter((r) => r.id !== editingReturn?.id)
      .reduce((sum, r) => sum + (r.returnKg || 0) + (r.ghati || 0), 0)
  );
  const sentKg = jobWork?.qtyKg || 0;
  const remainingBeforeThisReturn = round3(Math.max(0, sentKg - alreadyReturnedKg));

  const netKg = getNetKg(form);

  // Auto-suggest Ghati as "what's still outstanding after this return", editable by the user.
  useEffect(() => {
    if (ghatiTouched) return;
    if (netKg === null) return;
    const suggested = round3(Math.max(0, remainingBeforeThisReturn - netKg));
    setForm((prev) => ({ ...prev, ghati: suggested > 0 ? String(suggested) : "" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.grossKg, form.returnElementCount, form.petiWeightKg]);

  if (!isOpen || !jobWork) return null;

  const handleSave = async () => {
    const grossKg = parseFloat(form.grossKg);
    if (!form.grossKg || Number.isNaN(grossKg) || grossKg <= 0) {
      toast.error("Gross Kg is required and must be greater than 0");
      return;
    }

    if (netKg === null || netKg < 0) {
      toast.error("Net Kg could not be calculated");
      return;
    }

    const ghatiVal = form.ghati ? parseFloat(form.ghati) : 0;
    if (Number.isNaN(ghatiVal) || ghatiVal < 0) {
      toast.error("Ghati must be a valid non-negative number");
      return;
    }

    const newContribution = round3(netKg + ghatiVal);
    if (sentKg > 0 && newContribution > remainingBeforeThisReturn) {
      toast.error(`Net Kg + Ghati (${newContribution}) exceeds remaining (${remainingBeforeThisReturn} Kg)`);
      return;
    }

    const elemCount = form.returnElementCount ? parseFloat(form.returnElementCount) : undefined;
    if (elemCount !== undefined && (Number.isNaN(elemCount) || elemCount < 0 || !Number.isInteger(elemCount))) {
      toast.error("Peti/Drum count must be a valid non-negative integer");
      return;
    }

    const petiWeightKg = form.petiWeightKg ? parseFloat(form.petiWeightKg) : undefined;

    setSaving(true);
    try {
      const payload = {
        grossKg,
        petiWeightKg,
        returnElementCount: elemCount,
        elementType: form.elementType,
        ghati: ghatiVal || undefined,
        jobReturnDate: form.jobReturnDate || undefined,
      };

      if (editingReturn?.id) {
        await jobWorkReturnApi.updateJobWorkReturn(jobWork.orderItemId, jobWork.id, editingReturn.id, payload);
        toast.success("Return record updated!");
      } else {
        await jobWorkReturnApi.createJobWorkReturn(jobWork.orderItemId, jobWork.id, payload);
        toast.success("Return record saved!");
      }

      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save return");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-xl border border-gray-200 shadow-xl">
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="w-full text-center text-xl font-medium text-black">Job Work Return</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="text-gray-400 hover:text-gray-600">
            x
          </button>
        </div>
        <div className="px-10 py-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-black mb-1">Peti / Drum Count</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="1"
                value={form.returnElementCount}
                onChange={(e) => setForm((prev) => ({ ...prev, returnElementCount: e.target.value }))}
                placeholder="Enter count"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none placeholder:text-sm placeholder:text-gray-400"
              />
              <div className="relative w-28">
                <button
                  type="button"
                  onClick={() => setIsTypeOpen((prev) => !prev)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg bg-white text-sm flex items-center justify-between"
                >
                  <span>{form.elementType === "PETI" ? "Peti" : "Drum"}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isTypeOpen ? "rotate-180" : ""}`} />
                </button>
                {isTypeOpen && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    {["PETI", "DRUM"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({ ...prev, elementType: opt }));
                          setIsTypeOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                      >
                        {opt === "PETI" ? "Peti" : "Drum"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="number"
                step="0.001"
                min="0"
                value={form.petiWeightKg}
                onChange={(e) => setForm((prev) => ({ ...prev, petiWeightKg: e.target.value }))}
                placeholder="Kg each"
                className="w-28 px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-gray-500 outline-none placeholder:text-sm placeholder:text-gray-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Gross Kg (weighed) <span className="text-red-400">*</span></label>
            <input
              type="number"
              step="0.001"
              value={form.grossKg}
              onChange={(e) => setForm((prev) => ({ ...prev, grossKg: e.target.value }))}
              placeholder="Enter Kg."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none placeholder:text-sm placeholder:text-gray-400"
            />
            {sentKg > 0 && (
              <p className="mt-1 text-xs text-gray-400">
                Remaining (incl. Ghati): <span className="font-medium text-gray-600">{remainingBeforeThisReturn} Kg</span> of {sentKg} Kg
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Net Kg</label>
            <input
              type="number"
              step="0.001"
              value={netKg ?? ""}
              readOnly
              placeholder="Auto calculated"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 outline-none placeholder:text-sm placeholder:text-gray-400 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-400">
              Net Kg = Gross Kg − (Peti/Drum count × weight each).
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Ghati</label>
            <input
              type="number"
              step="0.001"
              min="0"
              value={form.ghati}
              onChange={(e) => {
                setGhatiTouched(true);
                setForm((prev) => ({ ...prev, ghati: e.target.value }));
              }}
              placeholder="Auto suggested, editable"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none placeholder:text-sm placeholder:text-gray-400"
            />
            <p className="mt-1 text-xs text-gray-400">
              Auto-suggested as the remaining shortfall after this return — adjust if the actual process loss differs.
            </p>
          </div>
          <div className="pt-4 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-28 h-10 bg-black text-white rounded-lg hover:bg-gray-700 transition text-sm disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
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

export default JobWorkReturnRecordDialog;
