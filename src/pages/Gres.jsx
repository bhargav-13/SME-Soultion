import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Plus, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SidebarLayout from "../components/SidebarLayout";
import SearchFilter from "../components/SearchFilter";
import ConfirmationDialog from "../components/ConfirmationDialog";
import Loader from "../components/Loader";
import StatsCard from "../components/StatsCard";
import toast from "react-hot-toast";
import GresCard from "../components/Gres/GresCard";
import GresReturnDialog from "../components/Gres/GresReturnDialog";
import { gresFillingApi, gresFillingReturnApi, exportApi } from "../services/apiService";
import { printGresFillingPng } from "../utils/gresFillingPrint";
import PrimaryActionButton from "../components/PrimaryActionButton";
import DownloadStatementModal from "../components/DownloadStatementModal";

const round3 = (n) => Math.round(n * 1000) / 1000;

const normalizeGresRecord = (apiRecord) => ({
  id: apiRecord.id,
  chithiNo: apiRecord.chitthiNo || "",
  vendorName: apiRecord.party?.name || "",
  vendorId: apiRecord.party?.id,
  date: apiRecord.chitthiDate || "",
  time: apiRecord.orderTime || "",
  status: apiRecord.status || "PENDING",
  gresType: "INHOUSE",
  items: (apiRecord.items || []).map((item) => ({
    id: item.id,
    itemName: item.size ? (item.size.sizeInInch || item.size.sizeInMm || "") : "",
    size: item.size?.sizeInInch || item.size?.sizeInMm || "",
    qtyPc: item.unitKg != null ? String(item.unitKg) : "",
    qtyKg: item.netWeight != null ? String(item.netWeight) : "",
    unitType: item.unitType || "Kgs",
    element: item.elementCount != null ? String(item.elementCount) : "",
    elementType: item.elementType || "PETI",
    elementWeightGm: "900",
    ratePerKg: item.ratePerKg != null ? String(item.ratePerKg) : "",
    totalAmount: item.totalAmount != null ? String(item.totalAmount) : "",
  })),
  qtyKg: apiRecord.items?.[0]?.netWeight,
  returns: (apiRecord.returns || []).map((ret) => ({
    id: ret.id,
    returnElement: ret.returnElementCount != null ? String(ret.returnElementCount) : "",
    returnType: ret.elementType || "PETI",
    returnKg: ret.returnKg != null ? ret.returnKg : 0,
    netKg: ret.returnKg != null && ret.ghati != null ? round3(ret.returnKg - ret.ghati) : 0,
    ghati: ret.ghati != null ? ret.ghati : 0,
    returnDate: ret.returnDate || ret.createdAt || "",
    rsKg: "",
  })),
  createdAt: apiRecord.createdAt || "",
});

const buildUpdatePayload = (gres, statusOverride) => ({
  partyId: Number(gres.vendorId),
  chitthiDate: gres.date || new Date().toISOString().slice(0, 10),
  orderTime: gres.time || undefined,
  status: statusOverride || gres.status,
  items: (gres.items || []).map((item) => ({
    unitKg: item.qtyPc ? Number(item.qtyPc) || undefined : undefined,
    unitType: item.unitType || "Kgs",
    elementCount: item.element ? Number(item.element) || undefined : undefined,
    elementType: item.elementType,
    netWeight: item.qtyKg ? Number(item.qtyKg) || undefined : undefined,
    ratePerKg: item.ratePerKg ? Number(item.ratePerKg) || undefined : undefined,
    totalAmount: item.totalAmount ? Number(item.totalAmount) || undefined : undefined,
  })),
});

const Gres = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [returnTarget, setReturnTarget] = useState(null);
  const [editingReturn, setEditingReturn] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteReturnTarget, setDeleteReturnTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deletingReturn, setDeletingReturn] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);

  const refreshRecords = async () => {
    setLoading(true);
    try {
      const res = await gresFillingApi.getAllGresFillings(undefined, 0, 100);
      const data = res.data?.data || [];
      setRecords(data.map(normalizeGresRecord));
    } catch {
      toast.error("Failed to load gres records");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshRecords();
  }, []);

  const handleStatusChange = async (gres, newStatus) => {
    try {
      const payload = buildUpdatePayload(gres, newStatus);
      await gresFillingApi.updateGresFilling(gres.id, payload);
      setRecords((prev) => prev.map((item) => (item.id === gres.id ? { ...item, status: newStatus } : item)));
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleTypeChange = (gres, newType) => {
    setRecords((prev) => prev.map((item) => (item.id === gres.id ? { ...item, gresType: newType } : item)));
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await gresFillingApi.deleteGresFilling(deleteTarget.id);
      setRecords((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      toast.success("Gres record deleted!");
    } catch {
      toast.error("Failed to delete gres record");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleReturnSaved = async (payload) => {
    if (!returnTarget) return;
    const apiPayload = {
      returnKg: payload.returnKg,
      ghati: payload.ghati,
      returnElementCount: payload.returnElement ? Number(payload.returnElement) || undefined : undefined,
      elementType: payload.returnType,
      returnDate: new Date().toISOString().slice(0, 10),
    };
    try {
      if (editingReturn?.id) {
        await gresFillingReturnApi.updateGresFillingReturn(returnTarget.id, editingReturn.id, apiPayload);
      } else {
        await gresFillingReturnApi.createGresFillingReturn(returnTarget.id, apiPayload);
      }
      toast.success("Return saved!");
      setReturnTarget(null);
      setEditingReturn(null);
      await refreshRecords();
    } catch {
      toast.error("Failed to save return");
    }
  };

  const handleDeleteReturn = async () => {
    if (!deleteReturnTarget) return;
    setDeletingReturn(true);
    try {
      await gresFillingReturnApi.deleteGresFillingReturn(deleteReturnTarget.gres.id, deleteReturnTarget.ret.id);
      toast.success("Return record deleted!");
      setDeleteReturnTarget(null);
      await refreshRecords();
    } catch {
      toast.error("Failed to delete return record");
    } finally {
      setDeletingReturn(false);
    }
  };

  const filtered = useMemo(() => {
    let list = records;
    if (typeFilter) {
      list = list.filter((item) => item.gresType === typeFilter);
    }

    const q = searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter((item) => {
        const primary = item.items?.[0] || {};
        return (
          String(item.chithiNo || "").toLowerCase().includes(q) ||
          String(item.vendorName || "").toLowerCase().includes(q) ||
          String(primary.itemName || "").toLowerCase().includes(q) ||
          String(primary.size || "").toLowerCase().includes(q) ||
          String(item.id).includes(q)
        );
      });
    }

    return list;
  }, [records, searchTerm, typeFilter]);

  const stats = useMemo(
    () => ({
      total: filtered.length,
      complete: filtered.filter((item) => item.status === "COMPLETE").length,
      pending: filtered.filter((item) => item.status === "PENDING").length,
    }),
    [filtered]
  );

  return (
    <SidebarLayout>
      <div className="mx-auto">
        <div className="mb-3 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate("/order")}
            className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-black transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Order List</span>
          </button>
          <PrimaryActionButton
            onClick={() => navigate("/gres/move")}
            icon={Plus}
          >
            Add Gres
          </PrimaryActionButton>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatsCard label="Total Gres" value={stats.total} className="h-[90px] rounded-md" />
          <StatsCard label="Completed" value={stats.complete} className="h-[90px] rounded-md" />
          <StatsCard label="Pending" value={stats.pending} className="h-[90px] rounded-md" />
        </div>

        <div className="mb-6">
          <SearchFilter
            searchQuery={searchTerm}
            setSearchQuery={setSearchTerm}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            filterOptions={["INHOUSE", "OUTSIDE"]}
            filterPlaceholder="Type"
            extraButton={
              <button
                type="button"
                onClick={() => setStatementOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 hover:bg-gray-50 transition whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                Download Statement
              </button>
            }
          />
        </div>

        <DownloadStatementModal
          isOpen={statementOpen}
          onClose={() => setStatementOpen(false)}
          title="Download Gres Statement"
          fileName="gres_statement"
          onDownload={(partyId, startDate, endDate) =>
            exportApi.getGresFillingReportPdf(partyId, startDate, endDate, { responseType: "blob" })
          }
        />

        {loading ? (
          <Loader text="Loading gres records..." />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-500">
            <p className="text-sm">No gres records found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((gres) => (
              <GresCard
                key={gres.id}
                gres={gres}
                onStatusChange={handleStatusChange}
                onTypeChange={handleTypeChange}
                onReturnRecord={() => {
                  setReturnTarget(gres);
                  setEditingReturn(null);
                }}
                onEditReturn={(ret) => {
                  setReturnTarget(gres);
                  setEditingReturn(ret);
                }}
                onDeleteReturn={(ret) => setDeleteReturnTarget({ gres, ret })}
                onEdit={() => navigate("/gres/move", { state: { mode: "edit", gresId: gres.id } })}
                onDelete={() => setDeleteTarget(gres)}
                onPrint={(id, formType, setLoadingKey) => printGresFillingPng(id, formType, setLoadingKey)}
              />
            ))}
          </div>
        )}
      </div>

      <GresReturnDialog
        isOpen={Boolean(returnTarget)}
        gres={returnTarget}
        editingReturn={editingReturn}
        onClose={() => {
          setReturnTarget(null);
          setEditingReturn(null);
        }}
        onSave={handleReturnSaved}
      />

      <ConfirmationDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Gres"
        message={`Are you sure you want to delete gres ${deleteTarget?.chithiNo || deleteTarget?.id}?`}
        confirmText={deleting ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        isDangerous
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      <ConfirmationDialog
        isOpen={Boolean(deleteReturnTarget)}
        title="Delete Return Record"
        message={`Are you sure you want to delete this return record (${deleteReturnTarget?.ret?.returnKg ?? 0} Kg)?`}
        confirmText={deletingReturn ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        isDangerous
        onCancel={() => setDeleteReturnTarget(null)}
        onConfirm={handleDeleteReturn}
      />
    </SidebarLayout>
  );
};

export default Gres;
