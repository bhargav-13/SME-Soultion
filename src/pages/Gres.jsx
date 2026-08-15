import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, Download, Package2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import SidebarLayout from '@/components/SidebarLayout';
import GresCard from '@/components/Gres/GresCard';
import GresReturnDialog from '@/components/Gres/GresReturnDialog';
import DownloadStatementModal from '@/components/DownloadStatementModal';
import { ConfirmDialog, ConfirmName } from '@/components/confirm-dialog';
import { ListToolbar } from '@/components/list-toolbar';
import { PageBody, PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { EmptyState, ListSkeleton } from '@/components/states';
import { Button } from '@/components/ui/button';
import { FILTER_ALL, matchesSearch, useListFilters } from '@/hooks/use-list-filters';
import { fmtNumber } from '@/lib/format';
import { gresFillingApi, gresFillingReturnApi, exportApi } from '@/services/apiService';
import { printGresChitthi } from '@/utils/gresChitthi';

/** Display Ch. No. as the zero-padded monthly serial. Falls back to whatever's in
 *  the legacy chitthiNo column only for pre-migration rows that have no serial. */
const displayChNo = (apiRecord) =>
  apiRecord.chNoSerial != null ? String(apiRecord.chNoSerial).padStart(3, '0') : apiRecord.chitthiNo || '';

const normalizeGresRecord = (apiRecord) => ({
  id: apiRecord.id,
  chithiNo: displayChNo(apiRecord),
  vendorName: apiRecord.party?.name || '',
  vendorId: apiRecord.party?.id,
  date: apiRecord.chitthiDate || '',
  time: apiRecord.orderTime || '',
  status: apiRecord.status || 'PENDING',
  gresType: 'INHOUSE',
  items: (apiRecord.items || []).map((item) => ({
    id: item.id,
    itemName: item.size?.itemName || '',
    size: item.size?.sizeInInch || item.size?.sizeInMm || '',
    qtyPc: item.unitKg != null ? String(item.unitKg) : '',
    qtyKg: item.netWeight != null ? String(item.netWeight) : '',
    unitType: item.unitType || 'Kgs',
    element: item.elementCount != null ? String(item.elementCount) : '',
    elementType: item.elementType || 'PETI',
    petiWeightKg: item.petiWeightKg != null ? String(item.petiWeightKg) : '',
    ratePerKg: item.ratePerKg != null ? String(item.ratePerKg) : '',
    totalAmount: item.totalAmount != null ? String(item.totalAmount) : '',
  })),
  qtyKg: apiRecord.items?.[0]?.netWeight,
  returns: (apiRecord.returns || []).map((ret) => ({
    id: ret.id,
    returnElement: ret.returnElementCount != null ? String(ret.returnElementCount) : '',
    returnType: ret.elementType || 'PETI',
    grossKg: ret.grossKg,
    petiWeightKg: ret.petiWeightKg,
    returnKg: ret.returnKg != null ? ret.returnKg : 0, // this is the NET now
    netKg: ret.returnKg != null ? ret.returnKg : 0, // alias kept for GresCard's Total Net row
    ghati: ret.ghati != null ? ret.ghati : 0,
    returnDate: ret.returnDate || ret.createdAt || '',
  })),
  createdAt: apiRecord.createdAt || '',
});

/** Status-only quick update from the card — items are echoed back untouched (no
 *  size id on the normalized card row, so we DON'T send items here or the backend
 *  would drop them all). Item edits happen on the full Edit page. */
const buildUpdatePayload = (gres, statusOverride) => ({
  partyId: Number(gres.vendorId),
  chitthiDate: gres.date || new Date().toISOString().slice(0, 10),
  orderTime: gres.time || undefined,
  status: statusOverride || gres.status,
});

const Gres = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [returnTarget, setReturnTarget] = useState(null);
  const [editingReturn, setEditingReturn] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteReturnTarget, setDeleteReturnTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deletingReturn, setDeletingReturn] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);

  const { filters, setFilter, search, onSearchChange, debouncedSearch, clearFilters, hasActiveFilters } =
    useListFilters({ defaults: { type: FILTER_ALL, status: FILTER_ALL, sort: 'newest' } });

  const refreshRecords = async () => {
    setLoading(true);
    try {
      const res = await gresFillingApi.getAllGresFillings(undefined, 0, 100);
      const data = res.data?.data || [];
      setRecords(data.map(normalizeGresRecord));
    } catch {
      toast.error('Failed to load gres records');
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
      toast.error('Failed to update status');
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
      toast.success('Gres record deleted!');
    } catch {
      toast.error('Failed to delete gres record');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleReturnSaved = async (payload) => {
    if (!returnTarget) return;
    const apiPayload = {
      grossKg: payload.grossKg,
      petiWeightKg: payload.petiWeightKg,
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
      toast.success('Return saved!');
      setReturnTarget(null);
      setEditingReturn(null);
      // The server marks the record Complete as soon as a return exists (and back to Pending when
      // the last one is deleted), so the reload below already carries the right status.
      await refreshRecords();
    } catch {
      toast.error('Failed to save return');
    }
  };

  const handleDeleteReturn = async () => {
    if (!deleteReturnTarget) return;
    setDeletingReturn(true);
    try {
      await gresFillingReturnApi.deleteGresFillingReturn(deleteReturnTarget.gres.id, deleteReturnTarget.ret.id);
      toast.success('Return record deleted!');
      setDeleteReturnTarget(null);
      await refreshRecords();
    } catch {
      toast.error('Failed to delete return record');
    } finally {
      setDeletingReturn(false);
    }
  };

  const filtered = useMemo(() => {
    let list = records;
    if (filters.type !== FILTER_ALL) {
      list = list.filter((item) => item.gresType === filters.type);
    }
    if (filters.status !== FILTER_ALL) {
      list = list.filter((item) => item.status === filters.status);
    }

    list = list.filter((item) =>
      matchesSearch(item, debouncedSearch, [
        'chithiNo',
        'vendorName',
        'id',
        (r) => r.items?.[0]?.itemName,
        (r) => r.items?.[0]?.size,
      ]),
    );

    // Sorting is explicit here rather than on a table header — this list is cards, not rows.
    const sorted = [...list];
    switch (filters.sort) {
      case 'oldest':
        sorted.sort((a, b) => String(a.date).localeCompare(String(b.date)));
        break;
      case 'vendor':
        sorted.sort((a, b) => a.vendorName.localeCompare(b.vendorName));
        break;
      case 'chitthi':
        sorted.sort((a, b) => String(a.chithiNo).localeCompare(String(b.chithiNo), undefined, { numeric: true }));
        break;
      default:
        sorted.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    }
    return sorted;
  }, [records, debouncedSearch, filters.type, filters.status, filters.sort]);

  const stats = useMemo(
    () => ({
      total: filtered.length,
      complete: filtered.filter((item) => item.status === 'COMPLETE').length,
      pending: filtered.filter((item) => item.status === 'PENDING').length,
    }),
    [filtered],
  );

  const fields = useMemo(
    () => [
      {
        key: 'type',
        label: 'Type',
        allLabel: 'All types',
        options: [
          { value: 'INHOUSE', label: 'In-house' },
          { value: 'OUTSIDE', label: 'Outside' },
        ],
      },
      {
        key: 'status',
        label: 'Status',
        allLabel: 'All statuses',
        options: [
          { value: 'PENDING', label: 'Pending' },
          { value: 'COMPLETE', label: 'Complete' },
        ],
      },
    ],
    [],
  );

  const sortOptions = useMemo(
    () => [
      { value: 'newest', label: 'Newest first' },
      { value: 'oldest', label: 'Oldest first' },
      { value: 'chitthi', label: 'Chitthi no' },
      { value: 'vendor', label: 'Vendor name' },
    ],
    [],
  );

  return (
    <SidebarLayout>
      <PageHeader
        title="Gres"
        subtitle="Gres filling chitthis and their returns"
        backTo="/order"
        backLabel="Orders"
        actions={
          <Button size="sm" onClick={() => navigate('/gres/move')}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add gres</span>
          </Button>
        }
      />

      <PageBody>
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="Total gres" value={fmtNumber(stats.total)} icon={Package2} tone="primary" isPending={loading} />
          <StatCard label="Completed" value={fmtNumber(stats.complete)} icon={CheckCircle2} tone="success" isPending={loading} />
          <StatCard label="Pending" value={fmtNumber(stats.pending)} icon={Clock} tone="warning" isPending={loading} />
        </div>

        <ListToolbar
          search={{ value: search, onChange: onSearchChange, placeholder: 'Search chitthi, vendor or item…' }}
          fields={fields}
          values={filters}
          onChange={setFilter}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
          sort={{ value: filters.sort, onChange: (v) => setFilter('sort', v), options: sortOptions }}
          actions={
            <Button variant="outline" size="sm" onClick={() => setStatementOpen(true)}>
              <Download className="size-4" />
              <span className="hidden sm:inline">Download statement</span>
            </Button>
          }
        />

        {loading ? (
          <ListSkeleton rows={4} className="h-32" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Package2}
            title={hasActiveFilters ? 'No gres records match' : 'No gres records yet'}
            description={
              hasActiveFilters
                ? 'Nothing here matches that search or filter.'
                : 'Move stock to gres to create the first chitthi.'
            }
            action={
              hasActiveFilters ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button size="sm" onClick={() => navigate('/gres/move')}>
                  <Plus className="size-4" />
                  Add gres
                </Button>
              )
            }
          />
        ) : (
          <div className="space-y-3">
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
                onEdit={() => navigate('/gres/move', { state: { mode: 'edit', gresId: gres.id } })}
                onDelete={() => setDeleteTarget(gres)}
                onPrint={(record, formType, size, setLoadingKey) =>
                  printGresChitthi(record, formType, size, setLoadingKey)
                }
              />
            ))}
          </div>
        )}
      </PageBody>

      <DownloadStatementModal
        isOpen={statementOpen}
        onClose={() => setStatementOpen(false)}
        title="Download gres statement"
        fileName="gres_statement"
        onDownload={(partyId, startDate, endDate) =>
          exportApi.getGresFillingReportPdf(partyId, startDate, endDate, { responseType: 'blob' })
        }
      />

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

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete this gres record?"
        description={
          <>
            Gres <ConfirmName>{deleteTarget?.chithiNo || deleteTarget?.id}</ConfirmName> and its return records will
            be removed. This cannot be undone.
          </>
        }
        confirmLabel="Delete"
        busyLabel="Deleting…"
        isPending={deleting}
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={Boolean(deleteReturnTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteReturnTarget(null);
        }}
        title="Delete this return record?"
        description={
          <>
            The <ConfirmName>{deleteReturnTarget?.ret?.returnKg ?? 0} Kg</ConfirmName> return will be removed. If it
            is the last one, the gres record goes back to Pending.
          </>
        }
        confirmLabel="Delete"
        busyLabel="Deleting…"
        isPending={deletingReturn}
        onConfirm={handleDeleteReturn}
      />
    </SidebarLayout>
  );
};

export default Gres;
