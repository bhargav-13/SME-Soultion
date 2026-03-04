import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Printer,
  SquarePen,
  Trash2,
  CircleCheck,
  ChevronDown,
  RefreshCw,
  ChevronLeft,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import SidebarLayout from "../components/SidebarLayout";
import PageHeader from "../components/PageHeader";
import SearchFilter from "../components/SearchFilter";
import ConfirmationDialog from "../components/ConfirmationDialog";
import { jobWorkApi, jobWorkReturnApi, axiosInstance } from "../services/apiService";
import toast from "react-hot-toast";

// ── Print helper ─────────────────────────────────────────────────────────────
// 1. Downloads the PNG to disk (no pop-up needed — uses hidden <a download> click)
// 2. Opens a minimal print window with the image and triggers the print dialog
//    the moment the image finishes loading (no pop-up blocker issues because
//    this is called synchronously inside a user click event).
const printJobWorkPng = async (jwId, formType, setLoadingKey) => {
  const key = formType.toLowerCase(); // 'aavak' | 'javak'
  setLoadingKey(key);
  try {
    const res = await axiosInstance.get(
      `/api/v1/job-works/${jwId}/type/${formType}/png`,
      {
        responseType: "blob",
        headers: { Accept: "image/png,application/json" },
      }
    );

    const blob    = new Blob([res.data], { type: "image/png" });
    const blobUrl = URL.createObjectURL(blob);
    const label   = formType === "AAVAK" ? "aavak" : "javak";
    const filename = `job-work-${jwId}-${label}.png`;

    // ── 1. Download the file to disk ────────────────────────────────────────
    const a = document.createElement("a");
    a.href     = blobUrl;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // ── 2. Open print dialog via a hidden iframe ─────────────────────────────
    // We write an HTML page into the iframe that shows the image at full size
    // and calls window.print() once the image is loaded.
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:0;";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
<head>
  <title>Print — ${filename}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { display: flex; justify-content: center; align-items: flex-start; }
    img { max-width: 100%; height: auto; display: block; }
    @media print { body { margin: 0; } img { width: 100%; } }
  </style>
</head>
<body>
  <img src="${blobUrl}"
    onload="window.focus(); window.print();"
    onerror="window.parent.postMessage('print-error','*');" />
</body>
</html>`);
    doc.close();

    // Clean up blob URL and iframe after printing (give plenty of time)
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 120_000);

    toast.success(`${label.toUpperCase()} image downloaded. Print dialog will open shortly.`);
  } catch (err) {
    const msg = err?.response?.data?.message || err?.message || "Failed to generate print";
    toast.error(msg);
  } finally {
    setLoadingKey(null);
  }
};

// ── Status helpers ──────────────────────────────────────────────────────────
const STATUS_OPTIONS = ["PENDING", "COMPLETE", "REJECT"];
const TYPE_OPTIONS   = ["JOB_WORK", "INHOUSE", "OUTSIDE"];

const STATUS_LABEL = { PENDING: "Pending", COMPLETE: "Complete", REJECT: "Reject" };
const TYPE_LABEL   = { JOB_WORK: "Job Work", INHOUSE: "In-House", OUTSIDE: "Outside" };

const STATUS_COLOR = {
  COMPLETE: "bg-[#D1FFE2] text-green-800",
  PENDING:  "bg-[#fde68a] text-yellow-800",
  REJECT:   "bg-[#fecaca] text-red-800",
};

const fmt = (v) => (v == null || v === "" ? "—" : v);
const fmtDate = (s) => {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("en-IN"); } catch { return s; }
};

// ── Return Record Dialog ─────────────────────────────────────────────────────
const ReturnDialog = ({ isOpen, jobWork, editingReturn, onClose, onSaved }) => {
  const [form, setForm] = useState({ returnKg: "", ghati: "", returnElementCount: "", elementType: "PETI" });
  const [saving, setSaving] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsTypeOpen(false);
    if (editingReturn) {
      setForm({
        returnKg:           String(editingReturn.returnKg ?? ""),
        ghati:              String(editingReturn.ghati ?? ""),
        returnElementCount: String(editingReturn.returnElementCount ?? ""),
        elementType:        editingReturn.elementType || "PETI",
      });
    } else {
      setForm({ returnKg: "", ghati: "", returnElementCount: "", elementType: "PETI" });
    }
  }, [isOpen, editingReturn]);

  if (!isOpen || !jobWork) return null;

  const round3 = (n) => Math.round(n * 1000) / 1000;
  const returns = jobWork.jobWorkReturns || [];
  const alreadyReturnedKg = round3(returns
    .filter(r => r.id !== editingReturn?.id)
    .reduce((sum, r) => sum + (r.returnKg || 0), 0));
  const alreadyReturnedElements = returns
    .filter(r => r.id !== editingReturn?.id)
    .reduce((sum, r) => sum + (r.returnElementCount || 0), 0);
  const sentKg = jobWork.qtyKg || 0;
  const sentElements = jobWork.elementCount || 0;
  const availableKg = round3(Math.max(0, sentKg - alreadyReturnedKg));
  const availableElements = Math.max(0, sentElements - alreadyReturnedElements);

  const handleSave = async () => {
    const kg = parseFloat(form.returnKg);
    if (!form.returnKg || isNaN(kg) || kg <= 0) { toast.error("Return Kg is required and must be greater than 0"); return; }
    if (sentKg > 0 && round3(kg) > availableKg) { toast.error(`Return Kg (${kg}) exceeds remaining (${availableKg} Kg)`); return; }
    const ghatiVal = form.ghati ? parseFloat(form.ghati) : undefined;
    if (ghatiVal !== undefined && (isNaN(ghatiVal) || ghatiVal < 0)) { toast.error("Ghati must be a valid non-negative number"); return; }
    const elemCount = form.returnElementCount ? parseFloat(form.returnElementCount) : undefined;
    if (elemCount !== undefined && (isNaN(elemCount) || elemCount < 0 || !Number.isInteger(elemCount))) { toast.error("Return Element Count must be a valid non-negative integer"); return; }
    setSaving(true);
    try {
      const payload = {
        returnKg:           kg,
        ghati:              ghatiVal,
        returnElementCount: elemCount,
        elementType:        form.elementType,
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
          <h2 className="w-full text-center text-xl font-medium text-black">
            {editingReturn ? "Edit Return Record" : "Return Record"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="px-10 py-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-black mb-1">Return Kg <span className="text-red-400">*</span></label>
            <input type="number" step="0.001" value={form.returnKg}
              onChange={(e) => setForm(p => ({ ...p, returnKg: e.target.value }))}
              placeholder="Enter Kg"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none placeholder:text-sm placeholder:text-gray-400" />
            {sentKg > 0 && (
              <p className="mt-1 text-xs text-gray-400">Remaining: <span className="font-medium text-gray-600">{availableKg} Kg</span> of {sentKg} Kg</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Ghati</label>
            <input type="number" step="0.001" value={form.ghati}
              onChange={(e) => setForm(p => ({ ...p, ghati: e.target.value }))}
              placeholder="Enter Ghati"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none placeholder:text-sm placeholder:text-gray-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Return Element</label>
            <div className="flex gap-2">
              <input type="number" step="1" value={form.returnElementCount}
                onChange={(e) => setForm(p => ({ ...p, returnElementCount: e.target.value }))}
                placeholder="Count"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none placeholder:text-sm placeholder:text-gray-400" />
              <div className="relative w-28">
                <button type="button" onClick={() => setIsTypeOpen(p => !p)}
                  className="w-full h-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm">
                  <span>{form.elementType === "PETI" ? "Peti" : "Drum"}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isTypeOpen ? "rotate-180" : ""}`} />
                </button>
                {isTypeOpen && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    {["PETI", "DRUM"].map(opt => (
                      <button key={opt} type="button"
                        onClick={() => { setForm(p => ({ ...p, elementType: opt })); setIsTypeOpen(false); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100">
                        {opt === "PETI" ? "Peti" : "Drum"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="pt-4 flex items-center justify-center gap-4">
            <button type="button" onClick={handleSave} disabled={saving}
              className="w-28 h-10 bg-black text-white rounded-lg hover:bg-gray-700 transition text-sm disabled:opacity-60">
              {saving ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={onClose}
              className="w-28 h-10 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Status Dropdown ──────────────────────────────────────────────────────────
const StatusDropdown = ({ value, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const colorClass = STATUS_COLOR[value] || "bg-gray-100 text-gray-700";
  return (
    <div className="relative">
      <button type="button" onClick={() => !disabled && setOpen(p => !p)}
        className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition ${colorClass} ${disabled ? "opacity-70 cursor-not-allowed" : ""}`}>
        {STATUS_LABEL[value] || value}
        {!disabled && <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>
      {open && !disabled && (
        <div className="absolute z-20 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {STATUS_OPTIONS.map(opt => (
            <button key={opt} type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${value === opt ? "font-semibold" : ""}`}>
              {STATUS_LABEL[opt]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Type Dropdown ────────────────────────────────────────────────────────────
const TypeDropdown = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(p => !p)}
        className="flex items-center gap-2 px-4 py-1.5 border border-gray-300 rounded-md bg-white text-sm font-medium text-black transition hover:border-gray-400">
        {TYPE_LABEL[value] || value}
        <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {TYPE_OPTIONS.map(opt => (
            <button key={opt} type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${value === opt ? "font-semibold" : ""}`}>
              {TYPE_LABEL[opt]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Job Work Card ─────────────────────────────────────────────────────────────
const JobWorkCardItem = ({ jw, onStatusChange, onTypeChange, onReturnRecord, onEditReturn, onDeleteReturn, onEdit, onDelete }) => {
  const returns = jw.jobWorkReturns || [];
  const [printingKey, setPrintingKey] = useState(null);
  const [returnExpanded, setReturnExpanded] = useState(false);

  const sizeLabel = [
    jw.size?.sizeInInch,
    jw.size?.sizeInMm ? `(${jw.size.sizeInMm})` : null,
  ].filter(Boolean).join(" ") || "—";

  const elementLabel = jw.elementCount != null
    ? `${jw.elementCount} ${jw.elementType === "DRUM" ? "Drum" : "Peti"}`
    : "—";

  const round3 = (n) => Math.round(n * 1000) / 1000;
  const totalReturnKg = round3(returns.reduce((sum, r) => sum + (r.returnKg || 0), 0));
  const totalGhati = round3(returns.reduce((sum, r) => sum + (r.ghati || 0), 0));
  const totalReturnElements = returns.reduce((sum, r) => sum + (r.returnElementCount || 0), 0);
  const sentKg = jw.qtyKg || 0;
  const remainingKg = round3(Math.max(0, sentKg - totalReturnKg));
  const isFullyReturned = sentKg > 0 && totalReturnKg >= sentKg;
  const isCompleted = jw.status === "COMPLETE";

  return (
    <div className="border border-gray-200 rounded-xl bg-white p-4 shadow-sm">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-3 text-black">
            <span className="font-semibold text-sm">JW-{jw.id}</span>
            <button type="button" onClick={onEdit} aria-label="Edit job work" className="text-gray-500 hover:text-gray-800 transition">
              <SquarePen className="w-4 h-4" />
            </button>
            <button type="button" onClick={onDelete} aria-label="Delete job work" className="text-red-400 hover:text-red-600 transition">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-500">
            <span>{jw.party?.name || "—"}</span>
            <span className="w-1 h-1 rounded-full bg-gray-400 inline-block" />
            <span>Finish: <span className="font-bold text-black">{fmt(jw.finish)}</span></span>
            <span className="w-1 h-1 rounded-full bg-gray-400 inline-block" />
            <span>Sticker Qty: <span className="font-bold text-black">{fmt(jw.stickerQty)}</span></span>
          </div>
        </div>
        <div className="text-right text-sm text-gray-500 flex-shrink-0">
          <p>Date: <span className="font-bold">{fmtDate(jw.jobDate)}</span></p>
          <p>Created: <span className="font-bold">{fmtDate(jw.createdAt)}</span></p>
        </div>
      </div>

      {/* Items + Return panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        {/* Items panel */}
        <div className="border border-gray-200 rounded-xl bg-gray-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-black font-semibold">Items</p>
            <button
              type="button"
              disabled={printingKey === "javak"}
              onClick={() => printJobWorkPng(jw.id, "JAVAK", setPrintingKey)}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-sm border border-gray-300 rounded-md text-black hover:bg-gray-100 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {printingKey === "javak" ? (
                <><span className="animate-spin inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full" /> Printing…</>
              ) : (
                <>Print <Printer className="w-4 h-4" /></>
              )}
            </button>
          </div>
          <div className="grid grid-cols-3 text-xs text-gray-400 mb-1">
            <span>Size</span><span className="text-center">Element</span><span className="text-right">Kg</span>
          </div>
          <div className="grid grid-cols-3 text-sm text-gray-700">
            <span className="font-bold">{sizeLabel}</span>
            <span className="text-center font-bold">{elementLabel}</span>
            <span className="text-right font-bold">{fmt(jw.qtyKg)} Kg</span>
          </div>
          <div className="mt-2 text-xs text-gray-500">Qty Pc: <span className="font-bold text-black">{fmt(jw.qtyPc)}</span></div>
        </div>

        {/* Return panel */}
        <div className="border border-gray-200 rounded-xl bg-gray-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <p className="text-black font-semibold">Return Details</p>
              {returns.length > 0 && (
                <span className="text-xs font-medium text-gray-500">({returns.length})</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {returns.length > 0 && (
                <button
                  type="button"
                  onClick={() => setReturnExpanded(p => !p)}
                  className="text-xs font-medium text-gray-500 hover:text-black transition flex items-center gap-1"
                >
                  {returnExpanded ? "Collapse" : "Expand"}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${returnExpanded ? "rotate-180" : ""}`} />
                </button>
              )}
              <button
                type="button"
                disabled={printingKey === "aavak"}
                onClick={() => printJobWorkPng(jw.id, "AAVAK", setPrintingKey)}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-sm border border-gray-300 rounded-md text-black hover:bg-gray-100 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {printingKey === "aavak" ? (
                  <><span className="animate-spin inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full" /> Printing…</>
                ) : (
                  <>Print <Printer className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </div>

          {returns.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No return recorded yet</p>
          ) : (
            <>
              {/* Expanded: show individual return records */}
              {returnExpanded && (
                <div className="space-y-3 mb-3">
                  {returns.map((ret) => (
                    <div key={ret.id} className="border border-gray-200 rounded-lg bg-white p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-gray-400">{fmtDate(ret.createdAt)}</span>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => onEditReturn(ret)} aria-label="Edit return"
                            className="text-gray-400 hover:text-gray-700 transition">
                            <SquarePen className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => onDeleteReturn(ret)} aria-label="Delete return"
                            className="text-red-300 hover:text-red-500 transition">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 text-xs text-gray-400 mb-0.5">
                        <span>Element</span><span className="text-center">Return Kg</span><span className="text-right">Ghati</span>
                      </div>
                      <div className="grid grid-cols-3 text-sm text-gray-700">
                        <span className="font-bold">
                          {ret.returnElementCount != null
                            ? `${ret.returnElementCount} ${ret.elementType === "DRUM" ? "Drum" : "Peti"}`
                            : "—"}
                        </span>
                        <span className="text-center font-bold">{fmt(ret.returnKg)} Kg</span>
                        <span className="text-right font-bold">{fmt(ret.ghati)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary totals (always visible) */}
              <div className="border-t border-dashed border-gray-300 pt-2">
                <div className="grid grid-cols-2 text-xs text-gray-400 mb-0.5">
                  <span>Total Return</span><span className="text-right">Total Ghati</span>
                </div>
                <div className="grid grid-cols-2 text-sm text-gray-700">
                  <span className="font-bold">{totalReturnKg ? `${totalReturnKg} Kg` : "—"}</span>
                  <span className="text-right font-bold">{totalGhati || "—"}</span>
                </div>
              </div>

              {/* Remaining Kg */}
              <div className="mt-2 pt-2 border-t border-gray-200 flex items-center justify-between">
                <span className="text-xs text-gray-400">Remaining</span>
                <span className={`text-sm font-bold ${isFullyReturned ? "text-green-600" : "text-red-500"}`}>
                  {isFullyReturned ? "Fully Returned" : `${remainingKg} Kg`}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex flex-wrap items-center gap-3">
        <StatusDropdown value={jw.status} onChange={(v) => onStatusChange(jw, v)} disabled={isCompleted} />
        <TypeDropdown   value={jw.jobWorkType} onChange={(v) => onTypeChange(jw, v)} />
        <button type="button" onClick={onReturnRecord}
          className="inline-flex items-center gap-2 px-5 py-1.5 rounded-md bg-[#b9d8e9] text-black text-sm font-medium hover:bg-[#a6cde3] transition">
          Return Record <CircleCheck className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const JobWork = () => {
  const location = useLocation();
  const navigate  = useNavigate();

  // The order row passed from OrderManagement (if coming from eye icon)
  const orderRow = location.state?.orderRow || null;

  const [jobWorks,     setJobWorks]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [searchTerm,   setSearchTerm]   = useState("");
  const [typeFilter,   setTypeFilter]   = useState("");
  const [returnTarget, setReturnTarget] = useState(null); // jw object for return dialog
  const [editingReturn, setEditingReturn] = useState(null); // specific return record being edited (null = new)
  const [deleteTarget, setDeleteTarget] = useState(null); // jw object for confirm delete
  const [deleting,     setDeleting]     = useState(false);
  const [deleteReturnTarget, setDeleteReturnTarget] = useState(null); // { jw, ret } for deleting a specific return
  const [deletingReturn, setDeletingReturn] = useState(false);

  // ── Fetch job works ───────────────────────────────────────────────────────
  const loadJobWorks = useCallback(async () => {
    setLoading(true);
    try {
      if (orderRow?.id) {
        // Load job works for a specific order item
        const res  = await jobWorkApi.getAllJobWorks(Number(orderRow.id), undefined, 0, 200);
        const data = res.data;
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        // Attach orderItemId to each jw so return dialog can use it
        setJobWorks(list.map(jw => ({ ...jw, orderItemId: Number(orderRow.id) })));
      } else {
        // No specific order — fetch across all order items via the parties/orders endpoint
        // then fan out per order-item. We use a lightweight approach: fetch all orders and collect job works.
        const ordersRes = await axiosInstance.get(`/api/v1/parties/orders?page=0&size=500`);
        const ordersData = ordersRes.data?.data || [];
        const allJws = [];
        for (const partyResp of ordersData) {
          for (const order of (partyResp.orders || [])) {
            for (const item of (order.orderItems || [])) {
              try {
                const jwRes  = await jobWorkApi.getAllJobWorks(Number(item.id), undefined, 0, 200);
                const jwData = jwRes.data;
                const jwList = Array.isArray(jwData?.data) ? jwData.data : Array.isArray(jwData) ? jwData : [];
                jwList.forEach(jw => allJws.push({ ...jw, orderItemId: Number(item.id) }));
              } catch { /* skip items with no job works */ }
            }
          }
        }
        setJobWorks(allJws);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load job works");
    } finally {
      setLoading(false);
    }
  }, [orderRow]);

  useEffect(() => { loadJobWorks(); }, [loadJobWorks]);

  // ── Status update ─────────────────────────────────────────────────────────
  const handleStatusChange = async (jw, newStatus) => {
    try {
      await jobWorkApi.updateJobWorkStatus(jw.orderItemId, jw.id, { status: newStatus });
      toast.success("Status updated!");
      setJobWorks(prev => prev.map(j => j.id === jw.id ? { ...j, status: newStatus } : j));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update status");
    }
  };

  // ── Type update ───────────────────────────────────────────────────────────
  const handleTypeChange = async (jw, newType) => {
    try {
      await jobWorkApi.updateJobWorkType(jw.orderItemId, jw.id, { jobWorkType: newType });
      toast.success("Type updated!");
      setJobWorks(prev => prev.map(j => j.id === jw.id ? { ...j, jobWorkType: newType } : j));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update type");
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await jobWorkApi.deleteJobWork(deleteTarget.orderItemId, deleteTarget.id);
      toast.success("Job work deleted!");
      setJobWorks(prev => prev.filter(j => j.id !== deleteTarget.id));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // ── Auto-complete after return saved ─────────────────────────────────────
  const handleReturnSaved = async () => {
    await loadJobWorks();
    // After reload, we need to check the fresh data — but loadJobWorks sets state async.
    // So we do the check using the returnTarget (the jw we just saved a return for).
    // Re-fetch this specific job work to get updated returns.
    if (returnTarget) {
      try {
        const res = await jobWorkApi.getJobWorkById(returnTarget.orderItemId, returnTarget.id);
        const freshJw = res.data;
        const returns = freshJw?.jobWorkReturns || [];
        const totalReturned = Math.round(returns.reduce((sum, r) => sum + (r.returnKg || 0), 0) * 1000) / 1000;
        const sentKg = freshJw?.qtyKg || 0;
        if (sentKg > 0 && totalReturned >= sentKg && freshJw?.status !== "COMPLETE") {
          await jobWorkApi.updateJobWorkStatus(returnTarget.orderItemId, returnTarget.id, { status: "COMPLETE" });
          toast.success("All Kg returned — Job work auto-marked as Complete!");
          loadJobWorks();
        }
      } catch { /* ignore — main data already reloaded */ }
    }
  };

  // ── Delete Return ────────────────────────────────────────────────────────
  const handleDeleteReturn = async () => {
    if (!deleteReturnTarget) return;
    const { jw: targetJw, ret: targetRet } = deleteReturnTarget;
    setDeletingReturn(true);
    try {
      await jobWorkReturnApi.deleteJobWorkReturn(targetJw.orderItemId, targetJw.id, targetRet.id);
      toast.success("Return record deleted!");
      loadJobWorks();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete return");
    } finally {
      setDeletingReturn(false);
      setDeleteReturnTarget(null);
    }
  };

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let filteredList = jobWorks;
    
    // Apply type filter
    if (typeFilter) {
      filteredList = filteredList.filter(jw => {
        if (typeFilter === "IN_HOUSE") {
          return jw.jobWorkType === "INHOUSE";
        } else if (typeFilter === "JOB_WORK") {
          return jw.jobWorkType === "JOB_WORK";
        }
        return true;
      });
    }
    
    // Apply search filter
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      filteredList = filteredList.filter(jw => {
        const sizeLabel = [jw.size?.sizeInInch, jw.size?.sizeInMm].filter(Boolean).join(" ").toLowerCase();
        return (
          (jw.party?.name || "").toLowerCase().includes(q) ||
          (jw.finish || "").toLowerCase().includes(q) ||
          sizeLabel.includes(q) ||
          String(jw.id).includes(q)
        );
      });
    }
    
    return filteredList;
  }, [jobWorks, searchTerm, typeFilter]);

  // ── Header context info ───────────────────────────────────────────────────
  const contextBanner = orderRow ? (
    <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-4 flex flex-wrap items-center gap-4 text-sm">
      <div><span className="text-gray-400 mr-1">Party:</span><span className="font-bold text-black">{orderRow.partyName}</span></div>
      <div><span className="text-gray-400 mr-1">Size:</span><span className="font-bold text-black">{orderRow.size}</span></div>
      <div><span className="text-gray-400 mr-1">Plating:</span><span className="font-bold text-black">{orderRow.plating}</span></div>
      <div><span className="text-gray-400 mr-1">Qty Pc:</span><span className="font-bold text-black">{orderRow.qtyPc}</span></div>
      <div><span className="text-gray-400 mr-1">Order Item ID:</span><span className="font-bold text-black">#{orderRow.id}</span></div>
    </div>
  ) : null;

  return (
    <SidebarLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-3">
          <button
            type="button"
            onClick={() => navigate("/order")}
            className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-black transition"
            aria-label="Back to Order List"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Order List</span>
          </button>
        </div>

        {/* Context banner (when coming from a specific order row) */}
        {contextBanner}

        {/* Search and Filter */}
        <div className="mb-6">
          <SearchFilter
            searchQuery={searchTerm}
            setSearchQuery={setSearchTerm}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            filterOptions={["IN_HOUSE", "JOB_WORK"]}
            filterPlaceholder="Type"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-48 text-sm text-gray-400">
            Loading job works…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-500">
            <p className="text-sm">No job work records found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(jw => (
              <JobWorkCardItem
                key={jw.id}
                jw={jw}
                onStatusChange={handleStatusChange}
                onTypeChange={handleTypeChange}
                onReturnRecord={() => { setReturnTarget(jw); setEditingReturn(null); }}
                onEditReturn={(ret) => { setReturnTarget(jw); setEditingReturn(ret); }}
                onDeleteReturn={(ret) => setDeleteReturnTarget({ jw, ret })}
                onEdit={() => navigate("/job-work/move", { state: { mode: "edit", jobWorkId: jw.id, orderItemId: jw.orderItemId, prefillOrderRow: orderRow } })}
                onDelete={() => setDeleteTarget(jw)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Return Record Dialog */}
      <ReturnDialog
        isOpen={Boolean(returnTarget)}
        jobWork={returnTarget}
        editingReturn={editingReturn}
        onClose={() => { setReturnTarget(null); setEditingReturn(null); }}
        onSaved={handleReturnSaved}
      />

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Job Work"
        message={`Are you sure you want to delete job work JW-${deleteTarget?.id}?`}
        confirmText={deleting ? "Deleting…" : "Delete"}
        cancelText="Cancel"
        isDangerous
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      {/* Delete Return Confirmation */}
      <ConfirmationDialog
        isOpen={Boolean(deleteReturnTarget)}
        title="Delete Return Record"
        message={`Are you sure you want to delete this return record (${deleteReturnTarget?.ret?.returnKg ?? 0} Kg)?`}
        confirmText={deletingReturn ? "Deleting…" : "Delete"}
        cancelText="Cancel"
        isDangerous
        onCancel={() => setDeleteReturnTarget(null)}
        onConfirm={handleDeleteReturn}
      />
    </SidebarLayout>
  );
};

export default JobWork;
