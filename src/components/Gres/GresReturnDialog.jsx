import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import toast from "react-hot-toast";

const EMPTY_FORM = {
  returnElement: "",
  returnType: "PETI",
  elementWeightGm: "900",
  returnKg: "",
  netKg: "",
  rsKg: "875",
};

const TYPE_LABEL = {
  PETI: "Peti",
  DRUM: "Drum",
};

const round3 = (n) => Math.round(n * 1000) / 1000;
const parseNumber = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getAutoNetKg = (form) => {
  const returnKg = parseNumber(form.returnKg);
  const elementCount = parseNumber(form.returnElement) || 0;
  if (returnKg === null) return "";

  const weightKg =
    form.returnType === "PETI"
      ? 0.9
      : (() => {
          const gm = parseNumber(form.elementWeightGm);
          return gm !== null && gm > 0 ? gm / 1000 : null;
        })();

  if (weightKg === null) return "";
  return String(round3(Math.max(0, returnKg - elementCount * weightKg)));
};

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
        elementWeightGm:
          editingReturn.elementWeightGm != null
            ? String(editingReturn.elementWeightGm)
            : editingReturn.returnType === "DRUM"
              ? ""
              : "900",
        returnKg: editingReturn.returnKg != null ? String(editingReturn.returnKg) : "",
        netKg: editingReturn.netKg != null ? String(editingReturn.netKg) : "",
        rsKg: editingReturn.rsKg != null ? String(editingReturn.rsKg) : "875",
      });
      return;
    }
    setForm(EMPTY_FORM);
  }, [editingReturn, isOpen]);

  const returns = useMemo(() => gres?.returns || [], [gres?.returns]);
  const existingReturned = useMemo(
    () =>
      round3(
        returns
          .filter((item) => item.id !== editingReturn?.id)
          .reduce((sum, item) => sum + (Number(item.returnKg) || 0), 0)
      ),
    [returns, editingReturn?.id]
  );

  if (!isOpen || !gres) return null;

  const handleSave = () => {
    const returnKg = Number.parseFloat(form.returnKg);
    const rsKg = Number.parseFloat(form.rsKg);

    if (!Number.isFinite(returnKg) || returnKg <= 0) {
      toast.error("Return Kg is required and must be greater than 0");
      return;
    }
    const autoNetKg = parseNumber(getAutoNetKg(form));
    if (!Number.isFinite(autoNetKg) || autoNetKg < 0 || autoNetKg > returnKg) {
      toast.error("Net could not be calculated from the selected type and gram value");
      return;
    }
    if (!Number.isFinite(rsKg) || rsKg < 0) {
      toast.error("Rs/Kg must be a valid number");
      return;
    }

    const ghati = round3(returnKg - autoNetKg);
    const contribution = round3(returnKg);
    if (gres.qtyKg && existingReturned + contribution > Number(gres.qtyKg)) {
      toast.error("Return Kg exceeds remaining quantity");
      return;
    }

    onSave?.({
      id: editingReturn?.id || Date.now(),
      returnElement: form.returnElement,
      returnType: form.returnType,
      elementWeightGm: form.returnType === "PETI" ? 900 : parseNumber(form.elementWeightGm),
      returnKg: round3(returnKg),
      netKg: round3(autoNetKg),
      ghati,
      rsKg: round3(rsKg),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-xl border border-gray-200 shadow-xl">
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="w-full text-center text-xl font-medium text-black">Gres Return</h2>
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
                min="0"
                step="1"
                value={form.returnElement}
                onChange={(e) => setForm((prev) => ({ ...prev, returnElement: e.target.value }))}
                placeholder="Enter count"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none placeholder:text-sm placeholder:text-gray-400"
              />
              <div className="relative w-28">
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
                          setForm((prev) => ({
                            ...prev,
                            returnType: opt,
                            elementWeightGm: opt === "PETI" ? "900" : "",
                          }));
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
              <input
                type="number"
                min="0"
                step="1"
                value={form.elementWeightGm}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    elementWeightGm: e.target.value,
                  }))
                }
                disabled={form.returnType === "PETI"}
                placeholder="gm"
                className={`w-24 h-10 px-3 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 ${
                  form.returnType === "PETI"
                    ? "border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                    : "border-gray-300 bg-white"
                }`}
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Enter number of {form.returnType === "PETI" ? "Peti" : "Drum"} elements returned.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Return Kg.</label>
            <input
              type="number"
              step="0.001"
              value={form.returnKg}
              onChange={(e) => setForm((prev) => ({ ...prev, returnKg: e.target.value }))}
              placeholder="Enter Kg."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none placeholder:text-sm placeholder:text-gray-400"
            />
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
              Net = Return Kg − (Element Count × {form.returnType === "PETI" ? "900 gm" : `${form.elementWeightGm || "?"} gm`})
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
              className="w-28 h-10 bg-black text-white rounded-lg hover:bg-gray-700 transition text-sm"
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
