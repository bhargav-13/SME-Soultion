import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Plus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import SidebarLayout from "../components/SidebarLayout";
import SearchFilter from "../components/SearchFilter";
import ConfirmationDialog from "../components/ConfirmationDialog";
import Loader from "../components/Loader";
import StatsCard from "../components/StatsCard";
import toast from "react-hot-toast";
import GresCard from "../components/Gres/GresCard";
import GresReturnDialog from "../components/Gres/GresReturnDialog";
import { deleteGresRecord, deleteGresReturn, loadGresRecords, upsertGresRecord, upsertGresReturn } from "../utils/gresStorage";
import PrimaryActionButton from "../components/PrimaryActionButton";

const round3 = (n) => Math.round(n * 1000) / 1000;

const Gres = () => {
  const navigate = useNavigate();
  const location = useLocation();
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

  const refreshRecords = () => {
    setRecords(loadGresRecords());
  };

  useEffect(() => {
    setLoading(true);
    try {
      refreshRecords();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = location.state?.savedGres;
    if (!saved?.job) return;

    const { mode, job } = saved;
    const normalized = {
      ...job,
      id: job.id || Date.now(),
      returns: job.returns || [],
      createdAt: job.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setRecords((prev) => {
      const current = prev.length ? prev : loadGresRecords();
      const targetId = String(normalized.id);
      const exists = current.some((item) => String(item.id) === targetId);
      const next = mode === "edit" || exists
        ? current.map((item) => (String(item.id) === targetId ? { ...item, ...normalized } : item))
        : [normalized, ...current];
      upsertGresRecord(normalized);
      return next;
    });
  }, [location.state]);

  const handleStatusChange = (gres, newStatus) => {
    const next = { ...gres, status: newStatus };
    upsertGresRecord(next);
    setRecords((prev) => prev.map((item) => (item.id === gres.id ? next : item)));
  };

  const handleTypeChange = (gres, newType) => {
    const next = { ...gres, gresType: newType };
    upsertGresRecord(next);
    setRecords((prev) => prev.map((item) => (item.id === gres.id ? next : item)));
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      deleteGresRecord(deleteTarget.id);
      setRecords((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      toast.success("Gres record deleted!");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleReturnSaved = (payload) => {
    if (!returnTarget) return;
    const nextReturn = {
      ...payload,
      returnDate: new Date().toISOString(),
    };
    upsertGresReturn(returnTarget.id, nextReturn);
    setRecords(loadGresRecords());
    setReturnTarget(null);
    setEditingReturn(null);

    const fresh = loadGresRecords().find((item) => String(item.id) === String(returnTarget.id));
    const totalReturned = round3((fresh?.returns || []).reduce((sum, item) => sum + (Number(item.returnKg) || 0), 0));
    const sentKg = Number(fresh?.qtyKg) || 0;
    if (sentKg > 0 && totalReturned >= sentKg && fresh?.status !== "COMPLETE") {
      upsertGresRecord({ ...fresh, status: "COMPLETE" });
      setRecords(loadGresRecords());
    }
  };

  const handleDeleteReturn = () => {
    if (!deleteReturnTarget) return;
    setDeletingReturn(true);
    try {
      deleteGresReturn(deleteReturnTarget.gres.id, deleteReturnTarget.ret.id);
      setRecords(loadGresRecords());
      toast.success("Return record deleted!");
    } finally {
      setDeletingReturn(false);
      setDeleteReturnTarget(null);
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
          {/* <button
            type="button"
            onClick={() => navigate("/gres/move")}
            className="px-4 py-2 rounded-md bg-gray-800 text-white text-sm font-medium hover:bg-gray-700 transition"
          >
            Add Gres
          </button> */}
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
          />
        </div>

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
