import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import { jobWorkReturnApi } from "../../services/apiService";

const EMPTY_FORM = {
  returnKg: "",
  rsKg: "875",
  returnElementCount: "",
  elementType: "PETI",
  elementWeightGm: "900",
  jobReturnDate: "",
};

const round3 = (n) => Math.round(n * 1000) / 1000;

const parseNumber = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getAutoNetKg = (form) => {
  const returnKg = parseNumber(form.returnKg);
  if (returnKg === null) return "";

  const elementWeightKg = form.elementType === "PETI"
    ? 0.9
    : (() => {
        const gm = parseNumber(form.elementWeightGm);
        return gm !== null && gm > 0 ? gm / 1000 : null;
      })();

  if (elementWeightKg === null) return "";

  const rawCount = parseNumber(form.returnElementCount);
  const count = rawCount !== null && rawCount > 0 ? rawCount : 1;
  return String(round3(Math.max(0, returnKg - count * elementWeightKg)));
};

const JobWorkReturnRecordDialog = ({ isOpen, jobWork, editingReturn, onClose, onSaved }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsTypeOpen(false);
    if (editingReturn) {
      setForm({
        returnKg: String(editingReturn.returnKg ?? ""),
        rsKg: "875",
        returnElementCount: String(editingReturn.returnElementCount ?? ""),
        elementType: editingReturn.elementType || "PETI",
        elementWeightGm: editingReturn.elementType === "DRUM" ? "" : "900",
        jobReturnDate: editingReturn.jobReturnDate ? editingReturn.jobReturnDate.substring(0, 10) : "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [isOpen, editingReturn]);

  if (!isOpen || !jobWork) return null;

  const returns = jobWork.jobWorkReturns || [];
  const alreadyReturnedKg = round3(
    returns
      .filter((r) => r.id !== editingReturn?.id)
      .reduce((sum, r) => sum + (r.returnKg || 0) + (r.ghati || 0), 0)
  );
  const sentKg = jobWork.qtyKg || 0;
  const availableKg = round3(Math.max(0, sentKg - alreadyReturnedKg));

  const handleSave = async () => {
    const kg = parseFloat(form.returnKg);
    if (!form.returnKg || Number.isNaN(kg) || kg <= 0) {
      toast.error("Return Kg is required and must be greater than 0");
      return;
    }

    const netVal = parseNumber(getAutoNetKg(form));
    if (netVal === null || netVal < 0 || netVal > kg) {
      toast.error("Net could not be calculated from the selected element details");
      return;
    }

    const ghatiVal = Math.max(0, round3(kg - netVal));
    const newContribution = round3(kg + (Number.isNaN(ghatiVal) ? 0 : ghatiVal));
    if (sentKg > 0 && newContribution > availableKg) {
      toast.error(`Return Kg + Ghati (${newContribution}) exceeds remaining (${availableKg} Kg)`);
      return;
    }

    const ghatiPayload = ghatiVal || undefined;
    if (ghatiPayload !== undefined && (Number.isNaN(ghatiPayload) || ghatiPayload < 0)) {
      toast.error("Ghati must be a valid non-negative number");
      return;
    }

    const elemCount = form.returnElementCount ? parseFloat(form.returnElementCount) : undefined;
    if (elemCount !== undefined && (Number.isNaN(elemCount) || elemCount < 0 || !Number.isInteger(elemCount))) {
      toast.error("Return Element Count must be a valid non-negative integer");
      return;
    }

    const elementWeight = form.elementType === "PETI" ? 900 : parseFloat(form.elementWeightGm);
    if (form.elementType !== "PETI" && (Number.isNaN(elementWeight) || elementWeight <= 0)) {
      toast.error("Element weight is required for Drum");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        returnKg: kg,
        ghati: ghatiPayload,
        returnElementCount: elemCount,
        elementType: form.elementType,
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
            <label className="block text-sm font-medium text-black mb-1">Return Element</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="1"
                value={form.returnElementCount}
                onChange={(e) => setForm((prev) => ({ ...prev, returnElementCount: e.target.value }))}
                placeholder="Enter Element"
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
                          setForm((prev) => ({
                            ...prev,
                            elementType: opt,
                            elementWeightGm: opt === "PETI" ? "900" : "",
                          }));
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
                step="1"
                min="0"
                value={form.elementWeightGm}
                onChange={(e) => setForm((prev) => ({ ...prev, elementWeightGm: e.target.value }))}
                placeholder="gm"
                disabled={form.elementType === "PETI"}
                className={`w-28 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500 outline-none placeholder:text-sm placeholder:text-gray-400 ${
                  form.elementType === "PETI"
                    ? "border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                    : "border-gray-300 bg-white"
                }`}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Return Kg <span className="text-red-400">*</span></label>
            <input
              type="number"
              step="0.001"
              value={form.returnKg}
              onChange={(e) => setForm((prev) => ({ ...prev, returnKg: e.target.value }))}
              placeholder="Enter Kg."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none placeholder:text-sm placeholder:text-gray-400"
            />
            {sentKg > 0 && (
              <p className="mt-1 text-xs text-gray-400">
                Remaining (incl. Ghati): <span className="font-medium text-gray-600">{availableKg} Kg</span> of {sentKg} Kg
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Net</label>
            <input
              type="number"
              step="0.001"
              value={getAutoNetKg(form)}
              readOnly
              placeholder="Auto calculated"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 outline-none placeholder:text-sm placeholder:text-gray-400 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-400">
              Net is auto calculated from Return Kg and {form.elementType === "PETI" ? "Peti (900 gm)" : "the manual gm value"}.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Rs/Kg</label>
            <input
              type="number"
              step="0.001"
              value={form.rsKg}
              onChange={(e) => setForm((prev) => ({ ...prev, rsKg: e.target.value }))}
              placeholder="875"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none placeholder:text-sm placeholder:text-gray-400"
            />
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
