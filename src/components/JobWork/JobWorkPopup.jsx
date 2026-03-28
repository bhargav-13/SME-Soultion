import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import { jobWorkApi, partyApi } from "../../services/apiService";
import { upsertOrderJobOverride } from "../../utils/orderJobWorkSync";

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
  const [parties, setParties] = useState([]);
  const [isPartyOpen, setIsPartyOpen] = useState(false);
  const [partySearch, setPartySearch] = useState("");
  const partyRef = useRef(null);

  // Fetch parties for dropdown
  useEffect(() => {
    if (!isOpen) return;
    const fetchParties = async () => {
      try {
        const res = await partyApi.getAllParties();
        const data = res.data;
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setParties(list);
      } catch { /* silent */ }
    };
    fetchParties();
  }, [isOpen]);

  // Close party dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (partyRef.current && !partyRef.current.contains(e.target)) {
        setIsPartyOpen(false);
        setPartySearch("");
      }
    };
    if (isPartyOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isPartyOpen]);

  const filteredParties = useMemo(() => {
    const q = partySearch.trim().toLowerCase();
    if (!q) return parties;
    return parties.filter(p => (p.name || "").toLowerCase().includes(q));
  }, [parties, partySearch]);

  useEffect(() => {
    if (!isOpen) return;
    setIsElementTypeOpen(false);
    setIsPartyOpen(false);
    setPartySearch("");

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

  const isOutsideJobWork = formData.jobWorkType === "OUTSIDE";

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
      upsertOrderJobOverride({
        orderItemId,
        orderId: orderRow?.orderId,
        jobWork: formData.jobWorkType === "INHOUSE" ? "In-House" : formData.jobWorkType === "OUTSIDE" ? "Outside" : "Job Work",
        platingStatus: true,
        jobWorkNo: orderRow?.jobWorkNo,
      });
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
          {/* Party + Size banner */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="relative" ref={partyRef}>
                <p className="text-xs text-gray-500 mb-1">Party Name</p>
                <div
                  className={`flex items-center justify-between px-3 py-1.5 border rounded-lg transition ${
                    isOutsideJobWork
                      ? "border-gray-300 bg-white cursor-pointer hover:border-gray-400"
                      : "border-gray-200 bg-gray-50 cursor-not-allowed"
                  }`}
                  onClick={() => {
                    if (!isOutsideJobWork) return;
                    setIsPartyOpen(prev => !prev);
                  }}
                >
                  <span className={`text-sm ${formData.partyName ? "font-medium text-black" : "text-gray-400"}`}>
                    {formData.partyName || "Select Party"}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isPartyOpen ? "rotate-180" : ""}`} />
                </div>
                {isPartyOpen && isOutsideJobWork && (
                  <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    <div className="px-3 py-2 border-b border-gray-100">
                      <input
                        type="text"
                        value={partySearch}
                        onChange={(e) => setPartySearch(e.target.value)}
                        placeholder="Search party..."
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-gray-500 outline-none"
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredParties.length === 0 ? (
                        <p className="px-4 py-2 text-sm text-gray-400">No parties found</p>
                      ) : (
                        filteredParties.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, partyName: p.name, partyId: p.id }));
                              setIsPartyOpen(false);
                              setPartySearch("");
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${formData.partyId === p.id ? "font-semibold bg-gray-50" : ""}`}
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
                disabled
                className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none transition bg-gray-50 text-gray-500 cursor-not-allowed"
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
                onChange={(e) => {
                  const nextType = e.target.value;
                  handleChange("jobWorkType", nextType);
                  if (nextType !== "OUTSIDE") {
                    setIsPartyOpen(false);
                    setPartySearch("");
                  }
                }}
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
