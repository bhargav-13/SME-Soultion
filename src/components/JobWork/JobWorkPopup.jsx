import React, { useEffect, useState } from "react";
import { X, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import { jobWorkApi } from "../../services/apiService";

const FINISH_OPTIONS = [
  "S.S & Sartin Lacq",
  "ANTQ",
  "Side Gold",
  "Z-Black.",
  "Gr. Black.",
  "Matt S.S",
  "Matt ANTQ",
  "PVD Rose",
  "PVD Gold",
  "PVD Black",
  "Rose Gold",
  "Clear Lacq.",
];

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "COMPLETE", label: "Complete" },
  { value: "REJECT", label: "Reject" },
];

const JOB_TYPE_OPTIONS = [
  { value: "JOB_WORK", label: "Job Work" },
  { value: "INHOUSE", label: "In-House" },
  { value: "OUTSIDE", label: "Outside" },
];

const EMPTY_FORM = {
  partyName: "",
  partyId: "",
  sizeLabel: "",
  sizeId: "",
  jobDate: "",
  qtyPc: "",
  qtyKg: "",
  finish: "",
  elementCount: "",
  elementType: "Peti",
  stickerQty: "",
  status: "PENDING",
  jobWorkType: "JOB_WORK",
};

const JobWorkPopup = ({ isOpen, orderRow, onClose, onSaved }) => {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [isElementTypeOpen, setIsElementTypeOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsElementTypeOpen(false);

    if (orderRow) {
      const platingRaw = String(orderRow.jobWork || "").trim().toLowerCase().replace(/[\s-]/g, "");
      let jobWorkType = "JOB_WORK";
      if (platingRaw === "inhouse" || platingRaw === "in_house") jobWorkType = "INHOUSE";
      else if (platingRaw === "outside") jobWorkType = "OUTSIDE";

      setFormData({
        partyName: orderRow.partyName || "",
        partyId: orderRow.partyId || "",
        sizeLabel: orderRow.size || "",
        sizeId: orderRow.sizeId || "",
        jobDate: orderRow.date && orderRow.date !== "—"
          ? normalizeToDateInput(orderRow.date)
          : new Date().toISOString().slice(0, 10),
        qtyPc: orderRow.qtyPc !== "—" ? String(orderRow.qtyPc ?? "") : "",
        qtyKg: orderRow.qtyKg !== "—" ? String(orderRow.qtyKg ?? "") : "",
        finish: orderRow.plating && orderRow.plating !== "_" ? orderRow.plating : "",
        elementCount: "",
        elementType: "Peti",
        stickerQty: orderRow.stickerQty !== "—" ? String(orderRow.stickerQty ?? "") : "",
        status: "PENDING",
        jobWorkType,
      });
    } else {
      setFormData(EMPTY_FORM);
    }
  }, [isOpen, orderRow]);

  if (!isOpen) return null;

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!formData.partyId) { toast.error("Party is required"); return; }
    if (!formData.sizeId) { toast.error("Size is required"); return; }
    if (!formData.jobDate) { toast.error("Job date is required"); return; }
    if (!formData.qtyPc || parseFloat(formData.qtyPc) <= 0) { toast.error("Qty Pc is required"); return; }

    const orderItemId = orderRow?.id;
    if (!orderItemId) { toast.error("Order item ID is missing"); return; }

    setSaving(true);
    try {
      const payload = {
        partyId: Number(formData.partyId),
        sizeId: Number(formData.sizeId),
        jobDate: formData.jobDate,
        qtyPc: parseFloat(formData.qtyPc) || 0,
        qtyKg: formData.qtyKg ? parseFloat(formData.qtyKg) : undefined,
        finish: formData.finish || undefined,
        elementCount: formData.elementCount ? parseFloat(formData.elementCount) : undefined,
        elementType: formData.elementType === "Peti" ? "PETI" : "DRUM",
        stickerQty: formData.stickerQty ? parseFloat(formData.stickerQty) : undefined,
        status: formData.status || "PENDING",
        jobWorkType: formData.jobWorkType || "JOB_WORK",
      };

      const res = await jobWorkApi.createJobWork(orderItemId, payload);
      toast.success("Job work created successfully!");
      onSaved?.(formData, res.data);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create job work");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl border border-gray-200 max-h-[90vh] flex flex-col shadow-lg">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <h2 className="w-full text-center text-xl font-medium text-black">
            Create Job Work
          </h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-8 py-6 overflow-y-auto flex-1">
          {/* Auto-filled info banner */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Party Name</p>
                <p className="text-sm font-medium text-black">{formData.partyName || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Size</p>
                <p className="text-sm font-medium text-black">{formData.sizeLabel || "—"}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Job Date */}
            <div>
              <label className="block text-md font-medium text-black mb-2">
                Job Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={formData.jobDate}
                onChange={(e) => handleChange("jobDate", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition"
              />
            </div>

            {/* Qty Pc */}
            <div>
              <label className="block text-md font-medium text-black mb-2">
                Qty Pc <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={formData.qtyPc}
                onChange={(e) => handleChange("qtyPc", e.target.value)}
                placeholder="Enter Pc."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition placeholder:text-sm placeholder:text-gray-500"
              />
            </div>

            {/* Qty Kg */}
            <div>
              <label className="block text-md font-medium text-black mb-2">Qty Kg</label>
              <input
                type="number"
                min="0"
                step="0.001"
                value={formData.qtyKg}
                onChange={(e) => handleChange("qtyKg", e.target.value)}
                placeholder="Auto"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition placeholder:text-sm placeholder:text-gray-500"
              />
            </div>

            {/* Finish */}
            <div>
              <label className="block text-md font-medium text-black mb-2">Finish</label>
              <select
                value={formData.finish}
                onChange={(e) => handleChange("finish", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition bg-white"
              >
                <option value="">Select finish…</option>
                {FINISH_OPTIONS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            {/* Element */}
            <div>
              <label className="block text-md font-medium text-black mb-2">Element</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  value={formData.elementCount}
                  onChange={(e) => handleChange("elementCount", e.target.value)}
                  placeholder="Count"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition placeholder:text-sm placeholder:text-gray-500"
                />
                <div className="relative min-w-[130px]">
                  <button
                    type="button"
                    onClick={() => setIsElementTypeOpen((prev) => !prev)}
                    className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-gray-500 transition text-sm"
                  >
                    <span>{formData.elementType}</span>
                    <ChevronDown
                      className={`w-5 h-5 transition-transform ${isElementTypeOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isElementTypeOpen && (
                    <div className="absolute z-10 mt-2 w-full rounded-xl border border-gray-200 bg-white overflow-hidden shadow">
                      {["Peti", "Drum"].map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            handleChange("elementType", option);
                            setIsElementTypeOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sticker Qty */}
            <div>
              <label className="block text-md font-medium text-black mb-2">Sticker Qty</label>
              <input
                type="number"
                min="0"
                value={formData.stickerQty}
                onChange={(e) => handleChange("stickerQty", e.target.value)}
                placeholder="Enter sticker qty"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition placeholder:text-sm placeholder:text-gray-500"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-md font-medium text-black mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => handleChange("status", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition bg-white"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Job Work Type */}
            <div>
              <label className="block text-md font-medium text-black mb-2">Job Work Type</label>
              <select
                value={formData.jobWorkType}
                onChange={(e) => handleChange("jobWorkType", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition bg-white"
              >
                {JOB_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-gray-200 flex items-center justify-center gap-5 flex-shrink-0">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-28 h-10 bg-black text-white rounded-lg hover:bg-gray-700 transition text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="w-28 h-10 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

function normalizeToDateInput(dateStr) {
  if (!dateStr || dateStr === "—") return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split("/");
    return `${y}-${m}-${d}`;
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split("-");
    return `${y}-${m}-${d}`;
  }
  return dateStr;
}

export default JobWorkPopup;
