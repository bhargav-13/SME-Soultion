import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Printer,
  SquarePen,
  Trash2,
  CircleCheck,
  ChevronDown,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Languages,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import SidebarLayout from "../components/SidebarLayout";
import PageHeader from "../components/PageHeader";
import SearchFilter from "../components/SearchFilter";
import ConfirmationDialog from "../components/ConfirmationDialog";
import StatsCard from "../components/StatsCard";
import { jobWorkApi, jobWorkReturnApi, axiosInstance, exportApi } from "../services/apiService";
import toast from "react-hot-toast";
import Loader from "../components/Loader";
import { normalizeJobWorkLabel, removeOrderJobOverride, upsertOrderJobOverride } from "../utils/orderJobWorkSync";
import { printJobWorkChitthi } from "../utils/jobWorkChitthi";
import JobWorkStatusDropdownShared from "../components/JobWork/JobWorkStatusDropdown";
import JobWorkTypeDropdownShared from "../components/JobWork/JobWorkTypeDropdown";
import JobWorkReturnRecordDialogShared from "../components/JobWork/JobWorkReturnRecordDialog";
import DownloadStatementModal from "../components/DownloadStatementModal";
import TranslationDialog from "../components/JobWork/TranslationDialog";


const fmt = (v) => (v == null || v === '' ? '—' : v);
const fmtNumber = (value, decimals) => {
  if (value == null || value === '') return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  if (typeof decimals === 'number') return num.toFixed(decimals);
  return String(Math.round(num));
};
const fmtDate = (s) => {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('en-IN'); } catch { return s; }
};

const ReturnDialog = (props) => <JobWorkReturnRecordDialogShared {...props} />;
const StatusDropdown = (props) => <JobWorkStatusDropdownShared {...props} />;
const TypeDropdown = (props) => <JobWorkTypeDropdownShared {...props} />;

// -- Print button with A6/A8 size choice -------------------------------------
const PrintSizeButton = ({ printing, onPrint }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={!!printing}
        onClick={() => setOpen((p) => !p)}
        className="inline-flex items-center gap-1.5 px-3 py-1 text-sm border border-gray-300 rounded-md text-black hover:bg-gray-100 transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {printing ? (
          <><span className="animate-spin inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full" /> Printingâ€¦</>
        ) : (
          <>Print <Printer className="w-4 h-4" /> <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} /></>
        )}
      </button>
      {open && !printing && (
        <div className="absolute z-20 right-0 mt-1 w-28 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {["A6", "A8"].map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => { setOpen(false); onPrint(size); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
            >
              Print {size}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// -- Job Work Card -----------------------------------------------------------
const JobWorkCardItem = ({ jw, onStatusChange, onTypeChange, onReturnRecord, onEditReturn, onDeleteReturn, onEdit, onDelete }) => {
  const returns = jw.jobWorkReturns || [];
  const [printingKey, setPrintingKey] = useState(null);
  const [returnExpanded, setReturnExpanded] = useState(false);

  const sizeLabel = [
    jw.size?.sizeInInch,
    jw.size?.sizeInMm ? `(${jw.size.sizeInMm})` : null,
  ].filter(Boolean).join(" ") || "â€”";

  const elementLabel = jw.elementCount != null
    ? `${jw.elementCount} ${jw.elementType === "DRUM" ? "Drum" : "Peti"}`
    : "â€”";

  const round3 = (n) => Math.round(n * 1000) / 1000;
  // ret.returnKg is already the net kg (backend computes it from grossKg - element*petiWeight)
  const totalReturnNetKg = round3(returns.reduce((sum, r) => sum + (r.returnKg || 0), 0));
  const totalGhati = round3(returns.reduce((sum, r) => sum + (r.ghati || 0), 0));
  const totalReturnWithGhati = round3(totalReturnNetKg + totalGhati);
  const sentKg = jw.qtyKg || 0;
  const remainingKg = round3(Math.max(0, sentKg - totalReturnWithGhati));
  const isFullyReturned = sentKg > 0 && totalReturnWithGhati >= sentKg;
  const isCompleted = jw.status === "COMPLETE";
  const processLabel = /sartin/i.test(String(jw.finish || "")) ? "Sartin" : "Emrey";

  return (
    <div
      className="border border-gray-200 rounded-xl bg-white p-4 shadow-sm cursor-pointer"
      onDoubleClick={onEdit}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-3 text-black">
            <span className="font-semibold text-sm">{jw.jobWorkLabel || `JW-${jw.id}`}</span>
            <button type="button" onClick={onEdit} aria-label="Edit job work" className="text-gray-500 hover:text-gray-800 transition">
              <SquarePen className="w-4 h-4" />
            </button>
            <button type="button" onClick={onDelete} aria-label="Delete job work" className="text-red-400 hover:text-red-600 transition">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-500">
            <span>{jw.party?.name || "-"}</span>
            {jw.size?.category && (
              <>
                <span className="w-1 h-1 rounded-full bg-gray-400 inline-block" />
                <span>{jw.size.itemName ? `${jw.size.itemName} - ` : ""}{jw.size.category}</span>
              </>
            )}
            <span className="w-1 h-1 rounded-full bg-gray-400 inline-block" />
            <span>Finish: <span className="font-bold text-black">{fmt(jw.finish)}</span></span>
          </div>
        </div>
        <div className="text-right text-sm text-gray-500 flex-shrink-0">
          <p>Date: <span className="font-bold">{fmtDate(jw.jobDate || jw.date)}</span></p>
          <p>Created: <span className="font-bold">{fmtDate(jw.createdAt)}</span></p>
        </div>
      </div>

      {/* Items + Return panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        {/* Items panel */}
        <div className="border border-gray-200 rounded-xl bg-gray-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-black font-semibold">Items</p>
            <PrintSizeButton
              printing={printingKey === "javak"}
              onPrint={(size) => printJobWorkChitthi(jw, "JAVAK", size, setPrintingKey)}
            />
          </div>
          <div className="grid grid-cols-5 text-xs text-gray-400 mb-1">
            <span>Size</span><span className="text-center">Peti</span><span className="text-center">Process</span><span className="text-center">Gross Kg</span><span className="text-right">Net Kg</span>
          </div>
          <div className="grid grid-cols-5 text-sm text-gray-700">
            <span className="font-bold">{sizeLabel}</span>
            <span className="text-center font-bold">{elementLabel}</span>
            <span className="text-center font-bold">{processLabel}</span>
            <span className="text-center font-bold">{fmt(jw.grossKg)} Kg</span>
            <span className="text-right font-bold">{fmt(jw.qtyKg)} Kg</span>
          </div>
          <div className="grid grid-cols-3 text-xs text-gray-400 mt-3 mb-1">
            <span>Total Pcs</span><span className="text-center">Sticker Qty</span><span className="text-right">Total Carton</span>
          </div>
          <div className="grid grid-cols-3 text-sm text-gray-700">
            <span className="font-bold">{fmtNumber(jw.qtyPc)}</span>
            <span className="text-center font-bold">{fmtNumber(jw.stickerQty, 0)}</span>
            <span className="text-right font-bold">{fmtNumber(jw.totalCarton, 2)}</span>
          </div>
          <div className="mt-2 pt-2 border-t border-dashed border-gray-300 flex items-center justify-between text-xs text-gray-500">
            <span>Rate/Kg: <span className="font-bold text-black">{fmt(jw.ratePerKg)}</span></span>
            <span>Total Rate: <span className="font-bold text-black">{fmt(jw.totalRate)}</span></span>
          </div>
        </div>

        {/* Return panel */}
        <div className="border border-gray-200 rounded-xl bg-gray-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <p className="text-black font-semibold">Return</p>
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
              <PrintSizeButton
                printing={printingKey === "aavak"}
                onPrint={(size) => printJobWorkChitthi(jw, "AAVAK", size, setPrintingKey)}
              />
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
                        <span className="text-xs text-gray-400">
                          {ret.jobReturnDate ? <>Return: <span className="font-medium text-gray-600">{fmtDate(ret.jobReturnDate)}</span></> : fmtDate(ret.createdAt)}
                        </span>
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
                      <div className="grid grid-cols-4 text-xs text-gray-400 mb-0.5">
                        <span>Peti</span><span className="text-center">Gross Kg</span><span className="text-center">Net Kg</span><span className="text-right">Ghati</span>
                      </div>
                      <div className="grid grid-cols-4 text-sm text-gray-700">
                        <span className="font-bold">
                          {ret.returnElementCount != null
                            ? `${ret.returnElementCount} ${ret.elementType === "DRUM" ? "Drum" : "Peti"}`
                            : "-"}
                        </span>
                        <span className="text-center font-bold">{fmt(ret.grossKg)} Kg</span>
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
                  <span>Total Net Returned</span><span className="text-right">Total Ghati</span>
                </div>
                <div className="grid grid-cols-2 text-sm text-gray-700">
                  <span className="font-bold">{totalReturnNetKg ? `${totalReturnNetKg} Kg` : "-"}</span>
                  <span className="text-right font-bold">{totalGhati || "-"}</span>
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

// â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const JobWork = () => {
  const location = useLocation();
  const navigate  = useNavigate();

  // The order row passed from OrderManagement (if coming from eye icon)
  const orderRow = location.state?.orderRow || null;
  const savedJobWork = location.state?.savedJobWork || null;

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
  const [statementOpen, setStatementOpen] = useState(false);
  const [translationOpen, setTranslationOpen] = useState(false);

  // â”€â”€ Server-side pagination (global view only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const PAGE_SIZE = 10;
  const isGlobal = !orderRow?.id;
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [serverStats, setServerStats] = useState({ total: 0, completed: 0, pending: 0 });
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Map the UI type filter to the backend JobWorkType enum (empty = all).
  const typeParam = typeFilter === "IN_HOUSE" ? "INHOUSE" : typeFilter === "JOB_WORK" ? "JOB_WORK" : "";

  // Debounce the search box so we don't hit the server on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Any filter change resets to the first page (global view is server-paginated).
  useEffect(() => { setPage(0); }, [debouncedSearch, typeParam, isGlobal]);

  const mergeSavedJobWork = useCallback((list) => {
    if (!savedJobWork?.job) return list;

    const { mode, job } = savedJobWork;
    const normalizedJob = {
      ...job,
      jobDate: job.jobDate || job.date || job.jobDateInput || job.dateInput,
      date: job.date || job.jobDate || job.jobDateInput || job.dateInput,
    };

    const targetId = normalizedJob.apiId ?? normalizedJob.id;
    if (targetId == null) {
      return mode === "create" ? [normalizedJob, ...list] : list;
    }

    const found = list.some((item) => String(item.id ?? item.apiId) === String(targetId));
    if (mode === "edit" || found) {
      return list.map((item) =>
        String(item.id ?? item.apiId) === String(targetId) ? { ...item, ...normalizedJob } : item
      );
    }

    return [normalizedJob, ...list];
  }, [savedJobWork]);

  // â”€â”€ Fetch job works â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const loadJobWorks = useCallback(async () => {
    setLoading(true);
    try {
      if (orderRow?.id) {
        // Load job works for a specific order item
        const res  = await jobWorkApi.getAllJobWorks(Number(orderRow.id), undefined, 0, 200);
        const data = res.data;
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        // Attach orderItemId to each jw so return dialog can use it
        setJobWorks(mergeSavedJobWork(list.map(jw => ({ ...jw, orderItemId: Number(orderRow.id) }))));
      } else {
        // No specific order â€” fetch a single page across all order items via the global listing
        // endpoint. Search + type filter + pagination all run DB-side (Specification + LIMIT/OFFSET);
        // the response carries orderItemId (null for manual jobs) plus embedded returns, party and
        // size, so no per-order-item fan-out is needed. The stat cards come from a separate counts
        // endpoint so they reflect the whole (filtered) dataset, not just this page.
        const filterParams = {
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
          ...(typeParam ? { jobWorkType: typeParam } : {}),
        };
        const [listRes, statsRes] = await Promise.all([
          axiosInstance.get(`/api/v1/job-works`, { params: { ...filterParams, page, size: PAGE_SIZE } }),
          axiosInstance.get(`/api/v1/job-works/stats`, { params: filterParams }),
        ]);
        const data = listRes.data;
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setJobWorks(mergeSavedJobWork(
          list.map(jw => ({ ...jw, orderItemId: jw.orderItemId ?? null }))
        ));
        setTotalPages(data?.totalPages ?? 0);
        setTotalElements(data?.totalElements ?? list.length);
        setServerStats(statsRes.data || { total: 0, completed: 0, pending: 0 });
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load job works");
    } finally {
      setLoading(false);
    }
  }, [orderRow, mergeSavedJobWork, page, debouncedSearch, typeParam]);

  useEffect(() => { loadJobWorks(); }, [loadJobWorks]);

  // â”€â”€ Status update â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleStatusChange = async (jw, newStatus) => {
    try {
      await jobWorkApi.updateJobWorkStatus(jw.orderItemId ?? 0, jw.id, { status: newStatus });
      toast.success("Status updated!");
      setJobWorks(prev => prev.map(j => j.id === jw.id ? { ...j, status: newStatus } : j));
      if (isGlobal) loadJobWorks(); // resync server-side stat cards (completed/pending)
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update status");
    }
  };

  // â”€â”€ Type update â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleTypeChange = async (jw, newType) => {
    try {
      await jobWorkApi.updateJobWorkType(jw.orderItemId ?? 0, jw.id, { jobWorkType: newType });
      toast.success("Type updated!");
      setJobWorks(prev => prev.map(j => j.id === jw.id ? { ...j, jobWorkType: newType } : j));
      upsertOrderJobOverride({
        orderItemId: jw.orderItemId,
        jobWork: normalizeJobWorkLabel(newType),
        platingStatus: true,
      });
      if (isGlobal && typeParam) loadJobWorks(); // resync when a type filter is active
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update type");
    }
  };

  // â”€â”€ Delete â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await jobWorkApi.deleteJobWork(deleteTarget.orderItemId ?? 0, deleteTarget.id);
      toast.success("Job work deleted!");
      setJobWorks(prev => prev.filter(j => j.id !== deleteTarget.id));
      removeOrderJobOverride({ orderItemId: deleteTarget.orderItemId });
      if (isGlobal) loadJobWorks(); // resync totals + pull the next row onto this page
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // â”€â”€ Auto-complete after return saved â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleReturnSaved = async () => {
    await loadJobWorks();
    // After reload, we need to check the fresh data â€” but loadJobWorks sets state async.
    // So we do the check using the returnTarget (the jw we just saved a return for).
    // Re-fetch this specific job work to get updated returns.
    if (returnTarget) {
      try {
        const res = await jobWorkApi.getJobWorkById(returnTarget.orderItemId ?? 0, returnTarget.id);
        const freshJw = res.data;
        const returns = freshJw?.jobWorkReturns || [];
        const totalReturned = Math.round(returns.reduce((sum, r) => sum + (r.returnKg || 0) + (r.ghati || 0), 0) * 1000) / 1000;
        const sentKg = freshJw?.qtyKg || 0;
        if (sentKg > 0 && totalReturned >= sentKg && freshJw?.status !== "COMPLETE") {
          await jobWorkApi.updateJobWorkStatus(returnTarget.orderItemId ?? 0, returnTarget.id, { status: "COMPLETE" });
          toast.success("All Kg returned â€” Job work auto-marked as Complete!");
          loadJobWorks();
        }
      } catch { /* ignore â€” main data already reloaded */ }
    }
  };

  // â”€â”€ Delete Return â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleDeleteReturn = async () => {
    if (!deleteReturnTarget) return;
    const { jw: targetJw, ret: targetRet } = deleteReturnTarget;
    setDeletingReturn(true);
    try {
      await jobWorkReturnApi.deleteJobWorkReturn(targetJw.orderItemId ?? 0, targetJw.id, targetRet.id);
      toast.success("Return record deleted!");
      loadJobWorks();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete return");
    } finally {
      setDeletingReturn(false);
      setDeleteReturnTarget(null);
    }
  };

  // â”€â”€ Filter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const filtered = useMemo(() => {
    // Global view is filtered + paginated server-side, so the current page is shown as-is.
    if (isGlobal) return jobWorks;

    // Order-scoped view holds the full (small) list for that order item — filter on the client.
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
          (jw.chitthiNo || "").toLowerCase().includes(q) ||
          sizeLabel.includes(q) ||
          String(jw.id).includes(q)
        );
      });
    }
    
    return filteredList;
  }, [jobWorks, searchTerm, typeFilter, isGlobal]);

  // Global view: counts come from the server (whole filtered dataset). Order-scoped view: count the
  // small client-held list.
  const stats = useMemo(
    () =>
      isGlobal
        ? {
            totalJobWorks: serverStats.total,
            completedJobWorks: serverStats.completed,
            pendingJobWorks: serverStats.pending,
          }
        : {
            totalJobWorks: filtered.length,
            completedJobWorks: filtered.filter((jw) => jw.status === "COMPLETE").length,
            pendingJobWorks: filtered.filter((jw) => jw.status === "PENDING").length,
          },
    [filtered, isGlobal, serverStats]
  );

  // â”€â”€ Header context info â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      <div className="mx-auto">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatsCard label="Total Job Works" value={stats.totalJobWorks} className="h-[90px] rounded-md" />
          <StatsCard label="Completed Job Works" value={stats.completedJobWorks} className="h-[90px] rounded-md" />
          <StatsCard label="Pending Job Works" value={stats.pendingJobWorks} className="h-[90px] rounded-md" />
        </div>
        {/* Search and Filter */}
        <div className="mb-6">
          <SearchFilter
            searchQuery={searchTerm}
            setSearchQuery={setSearchTerm}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            filterOptions={["IN_HOUSE", "JOB_WORK"]}
            filterPlaceholder="Type"
            extraButton={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/job-work/move", { state: { mode: "create", jobWorkMode: "MANUAL" } })}
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-lg bg-gray-900 text-sm text-white hover:bg-gray-800 transition whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  Add Job Work
                </button>
                <button
                  type="button"
                  onClick={() => setStatementOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 hover:bg-gray-50 transition whitespace-nowrap"
                >
                  <Download className="w-4 h-4" />
                  Download Statement
                </button>
                <button
                  type="button"
                  onClick={() => setTranslationOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 hover:bg-gray-50 transition whitespace-nowrap"
                >
                  <Languages className="w-4 h-4" />
                  Translations
                </button>
              </div>
            }
          />
        </div>

        <DownloadStatementModal
          isOpen={statementOpen}
          onClose={() => setStatementOpen(false)}
          title="Download Job Work Statement"
          fileName="jobwork_statement"
          onDownload={(partyId, startDate, endDate) =>
            exportApi.getJobWorkReportPdf(partyId, startDate, endDate, { responseType: "blob" })
          }
        />

        <TranslationDialog
          isOpen={translationOpen}
          onClose={() => setTranslationOpen(false)}
        />

        {/* Content */}
        {loading ? (
          <Loader text="Loading job works..." />
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
                onEdit={() => navigate("/job-work/move", {
                  state: jw.jobWorkType === "MANUAL"
                    ? { mode: "edit", jobWorkId: jw.id, jobWorkMode: "MANUAL", prefillJobWork: jw }
                    : { mode: "edit", jobWorkId: jw.id, orderItemId: jw.orderItemId, prefillOrderRow: orderRow }
                })}
                onDelete={() => setDeleteTarget(jw)}
              />
            ))}
          </div>
        )}

        {/* Pagination (global view, server-side) */}
        {isGlobal && !loading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 px-1">
            <p className="text-sm text-gray-500">
              Page {page + 1} of {totalPages} &nbsp;·&nbsp; {totalElements} job works
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
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
        message={`Are you sure you want to delete job work ${deleteTarget?.jobWorkLabel || `JW-${deleteTarget?.id}`}?`}
        confirmText={deleting ? "Deletingâ€¦" : "Delete"}
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
        confirmText={deletingReturn ? "Deletingâ€¦" : "Delete"}
        cancelText="Cancel"
        isDangerous
        onCancel={() => setDeleteReturnTarget(null)}
        onConfirm={handleDeleteReturn}
      />
    </SidebarLayout>
  );
};

export default JobWork;




