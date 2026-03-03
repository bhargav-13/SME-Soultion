import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { itemApi, sizeApi } from "../../services/apiService";
import toast from "react-hot-toast";

const inputCls =
  "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none placeholder:text-sm placeholder:text-gray-500";
const readonlyCls =
  "w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-black cursor-not-allowed outline-none placeholder:text-sm placeholder:text-gray-500";
const labelCls = "block font-medium text-black mb-2";

const AddStockDialog = ({ open, onClose, row, onSaved }) => {
  const [itemKg, setItemKg] = useState("");
  const [weightPerPc, setWeightPerPc] = useState("");
  const [weightUnit, setWeightUnit] = useState("");
  const [totalPc, setTotalPc] = useState("");
  const [stockDozenWeight, setStockDozenWeight] = useState("");
  const [lowStockWarning, setLowStockWarning] = useState("");
  const [isWeightUnitOpen, setIsWeightUnitOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load existing stock data when dialog opens
  useEffect(() => {
    if (!open || !row) return;
    setItemKg("");
    setWeightPerPc("");
    setWeightUnit("");
    setTotalPc("");
    setStockDozenWeight("");
    setLowStockWarning("");
    setIsWeightUnitOpen(false);

    // Fetch existing stock entry for this row's size
    if (row.sizeInInch && row.sizeInMm && row._itemId) {
      setLoading(true);
      (async () => {
        try {
          const sizesRes = await sizeApi.getSizesByItemId(Number(row._itemId));
          const sizes = Array.isArray(sizesRes.data) ? sizesRes.data : [];
          const inch = (row.sizeInInch || "").trim();
          const mm = (row.sizeInMm || "").trim();
          const matchedSize = sizes.find(
            (s) =>
              (s.sizeInInch || "").trim() === inch &&
              (s.sizeInMm || "").trim() === mm
          );
          if (!matchedSize?.id) return;

          const res = await itemApi.getAllItems(undefined, undefined, 0, 1000);
          const page = res.data;
          const all = Array.isArray(page?.data)
            ? page.data
            : Array.isArray(page)
            ? page
            : [];
          const matched = all.find((it) => it.sizeId === matchedSize.id);
          if (matched) {
            if (matched.itemKg != null) setItemKg(String(matched.itemKg));
            if (matched.weightPerPc != null)
              setWeightPerPc(String(matched.weightPerPc));
            if (matched.totalPc != null) setTotalPc(String(matched.totalPc));
            if (matched.dozenWeight != null)
              setStockDozenWeight(String(matched.dozenWeight));
            if (matched.lowStockWarning != null)
              setLowStockWarning(String(matched.lowStockWarning));
            setWeightUnit("Kg");
          }
        } catch (err) {
          console.error("Failed to load stock details:", err);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [open, row]);

  // Auto-calculate totalPc & stockDozenWeight
  const recalc = (kg, wpc, unit) => {
    const kgF = parseFloat(kg) || 0;
    const wpcF = parseFloat(wpc) || 0;
    const wpcKg = unit === "Gram" ? wpcF / 1000 : wpcF;
    setTotalPc(kgF > 0 && wpcKg > 0 ? (kgF / wpcKg).toFixed(2) : "");
    setStockDozenWeight(wpcKg > 0 ? (wpcKg * 12).toFixed(2) : "");
  };

  const onItemKgChange = (v) => {
    setItemKg(v);
    recalc(v, weightPerPc, weightUnit);
  };
  const onWeightPerPcChange = (v) => {
    setWeightPerPc(v);
    recalc(itemKg, v, weightUnit);
  };
  const onWeightUnitChange = (v) => {
    setWeightUnit(v);
    setIsWeightUnitOpen(false);
    recalc(itemKg, weightPerPc, v);
  };

  const handleSave = async () => {
    if (!itemKg && !weightPerPc && !lowStockWarning) {
      toast.error("Please fill at least one stock field");
      return;
    }

    setSaving(true);
    try {
      // Resolve sizeId
      const sizesRes = await sizeApi.getSizesByItemId(Number(row._itemId));
      const sizes = Array.isArray(sizesRes.data) ? sizesRes.data : [];
      const inch = (row.sizeInInch || "").trim();
      const mm = (row.sizeInMm || "").trim();
      const matchedSize = sizes.find(
        (s) =>
          (s.sizeInInch || "").trim() === inch &&
          (s.sizeInMm || "").trim() === mm
      );

      if (!matchedSize?.id) {
        toast.error("Could not resolve size. Please try again.");
        return;
      }

      const numericSizeId = Number(matchedSize.id);
      const stockPayload = {
        sizeId: numericSizeId,
        itemKg: parseFloat(itemKg) || 0,
        weightPerPc: parseFloat(weightPerPc) || 0,
        totalPc: parseFloat(totalPc) || 0,
        lowStockWarning: parseFloat(lowStockWarning) || 0,
        stockStatus: "IN_STOCK",
      };

      // Check if stock entry already exists → update, otherwise create
      let existingStockId = null;
      try {
        const stockRes = await itemApi.getAllItems(undefined, undefined, 0, 1000);
        const stockPage = stockRes.data;
        const allStock = Array.isArray(stockPage?.data)
          ? stockPage.data
          : Array.isArray(stockPage)
          ? stockPage
          : [];
        const existing = allStock.find(
          (it) => Number(it.sizeId) === numericSizeId
        );
        if (existing?.id) existingStockId = Number(existing.id);
      } catch {
        /* ignore — will create new */
      }

      if (existingStockId) {
        await itemApi.updateItem(existingStockId, stockPayload);
      } else {
        await itemApi.createItem(stockPayload);
      }

      toast.success("Stock updated successfully!");
      onSaved?.();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to save stock"
      );
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Update Stock
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {row?.itemName}
              {row?.sizeInInch ? ` — ${row.sizeInInch}` : ""}
              {row?.sizeInMm ? ` / ${row.sizeInMm}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              Loading stock details...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Item in Kg</label>
                  <input
                    type="text"
                    value={itemKg}
                    onChange={(e) => onItemKgChange(e.target.value)}
                    placeholder="Enter Kg"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Weight/Pc.</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={weightPerPc}
                      onChange={(e) => onWeightPerPcChange(e.target.value)}
                      placeholder="Weight/Pc."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none placeholder:text-sm placeholder:text-gray-500"
                    />
                    <div className="relative w-24">
                      <button
                        type="button"
                        onClick={() => setIsWeightUnitOpen(!isWeightUnitOpen)}
                        className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-gray-500 transition"
                      >
                        <span
                          className={`font-medium text-sm ${
                            weightUnit === ""
                              ? "text-gray-500"
                              : "text-gray-900"
                          }`}
                        >
                          {weightUnit === "" ? "Unit" : weightUnit}
                        </span>
                        <svg
                          className={`w-3 h-3 text-gray-500 transition-transform ${
                            isWeightUnitOpen ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                      {isWeightUnitOpen && (
                        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                          {["Kg", "Gram"].map((unit) => (
                            <button
                              key={unit}
                              type="button"
                              onClick={() => onWeightUnitChange(unit)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition"
                            >
                              {unit}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>
                    Total Pc.{" "}
                    <span className="text-gray-400 text-xs">(Auto)</span>
                  </label>
                  <input
                    type="text"
                    value={totalPc}
                    readOnly
                    placeholder="Auto"
                    className={readonlyCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>
                    Dozen Wt.{" "}
                    <span className="text-gray-400 text-xs">(Auto)</span>
                  </label>
                  <input
                    type="text"
                    value={stockDozenWeight}
                    readOnly
                    placeholder="Auto"
                    className={readonlyCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Low Stock Warning</label>
                  <input
                    type="text"
                    value={lowStockWarning}
                    onChange={(e) => setLowStockWarning(e.target.value)}
                    placeholder="Pcs"
                    className={inputCls}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition font-medium disabled:opacity-50"
          >
            {saving ? "Saving..." : "Update Stock"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddStockDialog;
