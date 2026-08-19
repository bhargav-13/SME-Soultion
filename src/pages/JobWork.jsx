import { useCallback, useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, CheckCircle2, Clock, Download, Languages, PackageCheck, Plus } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import SidebarLayout from '@/components/SidebarLayout';
import JobWorkCard from '@/components/JobWork/JobWorkCard';
import JobWorkReturnRecordDialog from '@/components/JobWork/JobWorkReturnRecordDialog';
import TranslationDialog from '@/components/JobWork/TranslationDialog';
import DownloadStatementModal from '@/components/DownloadStatementModal';
import { ConfirmDialog, ConfirmName } from '@/components/confirm-dialog';
import { ListToolbar } from '@/components/list-toolbar';
import { Notice } from '@/components/notice';
import { PageBody, PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { StatCard } from '@/components/stat-card';
import { EmptyState, ListSkeleton } from '@/components/states';
import { Button } from '@/components/ui/button';
import { FILTER_ALL, matchesSearch } from '@/hooks/use-list-filters';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { fmtNumber } from '@/lib/format';
import {
  jobWorkApi,
  jobWorkReturnApi,
  axiosInstance,
  exportApi,
  appSettingsApi,
  jobWorkBajaarApi,
  FIXED_BAJAAR_KEY,
} from '@/services/apiService';
import { normalizeJobWorkLabel, removeOrderJobOverride, upsertOrderJobOverride } from '@/utils/orderJobWorkSync';

const PAGE_SIZE = 10;

const RETURN_STATES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'PARTIALLY_RETURNED', label: 'Partially returned' },
  { value: 'FULLY_RETURNED', label: 'Fully returned' },
];

const round3 = (n) => Math.round(n * 1000) / 1000;

/**
 * Which of the three buckets a chitthi is in, using the same arithmetic the card prints: what came
 * back is the net returned kg plus the ghati, measured against what went out.
 *
 * Mirrors `JobWorkReturnState` on the server so the order-scoped view (filtered on the client) and
 * the global view (filtered in SQL) agree.
 */
const returnStateOf = (jw) => {
  const returned = round3(
    (jw.jobWorkReturns || []).reduce((sum, r) => sum + (r.returnKg || 0) + (r.ghati || 0), 0),
  );
  if (returned <= 0) return 'PENDING';
  return returned >= (jw.qtyKg || 0) ? 'FULLY_RETURNED' : 'PARTIALLY_RETURNED';
};

const JobWork = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // The order row passed from OrderManagement (if coming from eye icon)
  const orderRow = location.state?.orderRow || null;
  const savedJobWork = location.state?.savedJobWork || null;

  const [jobWorks, setJobWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState(FILTER_ALL);
  // How much of the chitthi is back: nothing / some / all. Derived from the return records, not
  // from the status column — status only ever says "a return exists", which cannot tell 10 Kg of
  // 300 back from a finished job.
  const [returnFilter, setReturnFilter] = useState(FILTER_ALL);
  const [returnTarget, setReturnTarget] = useState(null); // jw object for return dialog
  const [editingReturn, setEditingReturn] = useState(null); // specific return record being edited (null = new)
  const [deleteTarget, setDeleteTarget] = useState(null); // jw object for confirm delete
  const [deleting, setDeleting] = useState(false);
  const [deleteReturnTarget, setDeleteReturnTarget] = useState(null); // { jw, ret } for deleting a specific return
  const [deletingReturn, setDeletingReturn] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);
  // The single house rate every FIXED-bajaar chitthi is priced at. Read once here rather than per
  // card, since it is the same number on all of them.
  const [fixedBajaar, setFixedBajaar] = useState(null);
  const [translationOpen, setTranslationOpen] = useState(false);

  // ── Server-side pagination (global view only) ───────────────────────────────
  const isGlobal = !orderRow?.id;
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [serverStats, setServerStats] = useState({
    total: 0,
    pending: 0,
    partiallyReturned: 0,
    fullyReturned: 0,
  });

  // Map the UI type filter to the backend JobWorkType enum (ALL = no narrowing).
  const typeParam = typeFilter === 'IN_HOUSE' ? 'INHOUSE' : typeFilter === 'JOB_WORK' ? 'JOB_WORK' : '';
  const returnParam = returnFilter === FILTER_ALL ? '' : returnFilter;

  // Debounce the search box so we don't hit the server on every keystroke.
  const debouncedSearchRaw = useDebouncedValue(searchTerm, 350);
  const debouncedSearch = debouncedSearchRaw.trim();

  const hasActiveFilters =
    debouncedSearch !== '' || typeFilter !== FILTER_ALL || returnFilter !== FILTER_ALL;

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter(FILTER_ALL);
    setReturnFilter(FILTER_ALL);
  };

  /** Clicking the card that is already selected clears it, so the cards act as a toggle group. */
  const toggleReturnFilter = (state) =>
    setReturnFilter((prev) => (prev === state ? FILTER_ALL : state));

  // Any filter change resets to the first page (global view is server-paginated).
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, typeParam, returnParam, isGlobal]);

  const mergeSavedJobWork = useCallback(
    (list) => {
      if (!savedJobWork?.job) return list;

      const { mode, job } = savedJobWork;
      const normalizedJob = {
        ...job,
        jobDate: job.jobDate || job.date || job.jobDateInput || job.dateInput,
        date: job.date || job.jobDate || job.jobDateInput || job.dateInput,
      };

      const targetId = normalizedJob.apiId ?? normalizedJob.id;
      if (targetId == null) {
        return mode === 'create' ? [normalizedJob, ...list] : list;
      }

      const found = list.some((item) => String(item.id ?? item.apiId) === String(targetId));
      if (mode === 'edit' || found) {
        return list.map((item) =>
          String(item.id ?? item.apiId) === String(targetId) ? { ...item, ...normalizedJob } : item,
        );
      }

      return [normalizedJob, ...list];
    },
    [savedJobWork],
  );

  // ── Fetch job works ─────────────────────────────────────────────────────────
  const loadJobWorks = useCallback(async () => {
    setLoading(true);
    try {
      if (orderRow?.id) {
        // Load job works for a specific order item
        const res = await jobWorkApi.getAllJobWorks(Number(orderRow.id), undefined, 0, 200);
        const data = res.data;
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        // Attach orderItemId to each jw so return dialog can use it
        setJobWorks(mergeSavedJobWork(list.map((jw) => ({ ...jw, orderItemId: Number(orderRow.id) }))));
      } else {
        // No specific order — fetch a single page across all order items via the global listing
        // endpoint. Search + type filter + pagination all run DB-side (Specification + LIMIT/OFFSET);
        // the response carries orderItemId (null for manual jobs) plus embedded returns, party and
        // size, so no per-order-item fan-out is needed. The stat cards come from a separate counts
        // endpoint so they reflect the whole (filtered) dataset, not just this page.
        // The stat cards are how the return state is picked, so they deliberately ignore
        // `returnState` — otherwise choosing "Partially returned" would zero the other two cards
        // and there would be no way back.
        const filterParams = {
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
          ...(typeParam ? { jobWorkType: typeParam } : {}),
        };
        const [listRes, statsRes] = await Promise.all([
          axiosInstance.get(`/api/v1/job-works`, {
            params: {
              ...filterParams,
              ...(returnParam ? { returnState: returnParam } : {}),
              page,
              size: PAGE_SIZE,
            },
          }),
          axiosInstance.get(`/api/v1/job-works/stats`, { params: filterParams }),
        ]);
        const data = listRes.data;
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setJobWorks(mergeSavedJobWork(list.map((jw) => ({ ...jw, orderItemId: jw.orderItemId ?? null }))));
        setTotalPages(data?.totalPages ?? 0);
        setTotalElements(data?.totalElements ?? list.length);
        setServerStats(
          statsRes.data || { total: 0, pending: 0, partiallyReturned: 0, fullyReturned: 0 },
        );
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load job works');
    } finally {
      setLoading(false);
    }
  }, [orderRow, mergeSavedJobWork, page, debouncedSearch, typeParam, returnParam]);

  useEffect(() => {
    loadJobWorks();
  }, [loadJobWorks]);

  useEffect(() => {
    // Best effort: a card with no fixed rate to show simply prints a dash.
    appSettingsApi
      .getAll()
      .then((res) => setFixedBajaar(res.data?.[FIXED_BAJAAR_KEY] ?? null))
      .catch(() => setFixedBajaar(null));
  }, []);

  // ── Status update ───────────────────────────────────────────────────────────
  const handleStatusChange = async (jw, newStatus) => {
    try {
      await jobWorkApi.updateJobWorkStatus(jw.orderItemId ?? 0, jw.id, { status: newStatus });
      toast.success('Status updated!');
      setJobWorks((prev) => prev.map((j) => (j.id === jw.id ? { ...j, status: newStatus } : j)));
      if (isGlobal) loadJobWorks(); // resync server-side stat cards (completed/pending)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update status');
    }
  };

  // ── Type update ─────────────────────────────────────────────────────────────
  const handleTypeChange = async (jw, newType) => {
    try {
      await jobWorkApi.updateJobWorkType(jw.orderItemId ?? 0, jw.id, { jobWorkType: newType });
      toast.success('Type updated!');
      setJobWorks((prev) => prev.map((j) => (j.id === jw.id ? { ...j, jobWorkType: newType } : j)));
      upsertOrderJobOverride({
        orderItemId: jw.orderItemId,
        jobWork: normalizeJobWorkLabel(newType),
        platingStatus: true,
      });
      if (isGlobal && typeParam) loadJobWorks(); // resync when a type filter is active
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update type');
    }
  };

  // ── Bajaar (market rate) ────────────────────────────────────────────────────
  const handleBajaarChange = async (jw, bajaarType, bajaarValue) => {
    // Optimistic: the dropdown and its amount box are a single control to the user, and waiting
    // for a round trip between choosing "Rojnu" and being able to type in the box reads as broken.
    const previous = { bajaarType: jw.bajaarType, bajaarValue: jw.bajaarValue };
    setJobWorks((prev) =>
      prev.map((j) => (j.id === jw.id ? { ...j, bajaarType, bajaarValue } : j)),
    );
    try {
      const res = await jobWorkBajaarApi.update(jw.id, { bajaarType, bajaarValue });
      const saved = res.data || {};
      setJobWorks((prev) =>
        prev.map((j) =>
          j.id === jw.id
            ? { ...j, bajaarType: saved.bajaarType ?? bajaarType, bajaarValue: saved.bajaarValue ?? null }
            : j,
        ),
      );
    } catch (err) {
      setJobWorks((prev) => prev.map((j) => (j.id === jw.id ? { ...j, ...previous } : j)));
      toast.error(err?.response?.data?.message || 'Failed to update bajaar');
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await jobWorkApi.deleteJobWork(deleteTarget.orderItemId ?? 0, deleteTarget.id);
      toast.success('Job work deleted!');
      setJobWorks((prev) => prev.filter((j) => j.id !== deleteTarget.id));
      removeOrderJobOverride({ orderItemId: deleteTarget.orderItemId });
      if (isGlobal) loadJobWorks(); // resync totals + pull the next row onto this page
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleReturnSaved = async () => {
    // The server marks the job work Complete as soon as a return exists (and back to Pending when
    // the last one is deleted), so a plain reload already carries the right status.
    await loadJobWorks();
  };

  // ── Delete Return ───────────────────────────────────────────────────────────
  const handleDeleteReturn = async () => {
    if (!deleteReturnTarget) return;
    const { jw: targetJw, ret: targetRet } = deleteReturnTarget;
    setDeletingReturn(true);
    try {
      await jobWorkReturnApi.deleteJobWorkReturn(targetJw.orderItemId ?? 0, targetJw.id, targetRet.id);
      toast.success('Return record deleted!');
      loadJobWorks();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete return');
    } finally {
      setDeletingReturn(false);
      setDeleteReturnTarget(null);
    }
  };

  // ── Filter ──────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    // Global view is filtered + paginated server-side, so the current page is shown as-is.
    if (isGlobal) return jobWorks;

    // Order-scoped view holds the full (small) list for that order item — filter on the client.
    let filteredList = jobWorks;

    if (typeFilter !== FILTER_ALL) {
      filteredList = filteredList.filter((jw) => {
        if (typeFilter === 'IN_HOUSE') return jw.jobWorkType === 'INHOUSE';
        if (typeFilter === 'JOB_WORK') return jw.jobWorkType === 'JOB_WORK';
        return true;
      });
    }

    if (returnFilter !== FILTER_ALL) {
      filteredList = filteredList.filter((jw) => returnStateOf(jw) === returnFilter);
    }

    return filteredList.filter((jw) =>
      matchesSearch(jw, debouncedSearch, [
        (r) => r.party?.name,
        'finish',
        'chitthiNo',
        'jobWorkLabel',
        (r) => r.size?.itemName,
        (r) => r.size?.category,
        (r) => [r.size?.sizeInInch, r.size?.sizeInMm].filter(Boolean).join(' '),
        'id',
      ]),
    );
  }, [jobWorks, debouncedSearch, typeFilter, returnFilter, isGlobal]);

  // Global view: counts come from the server (whole filtered dataset). Order-scoped view: count the
  // small client-held list.
  const stats = useMemo(() => {
    if (isGlobal) {
      return {
        total: serverStats.total,
        pending: serverStats.pending,
        partiallyReturned: serverStats.partiallyReturned,
        fullyReturned: serverStats.fullyReturned,
      };
    }
    // Order-scoped view holds the whole (small) list, so the buckets are counted here. They are
    // counted before the return filter is applied, for the same reason the server ignores it.
    const byState = jobWorks.map(returnStateOf);
    return {
      total: jobWorks.length,
      pending: byState.filter((st) => st === 'PENDING').length,
      partiallyReturned: byState.filter((st) => st === 'PARTIALLY_RETURNED').length,
      fullyReturned: byState.filter((st) => st === 'FULLY_RETURNED').length,
    };
  }, [jobWorks, isGlobal, serverStats]);

  const fields = useMemo(
    () => [
      {
        key: 'type',
        label: 'Type',
        allLabel: 'All types',
        options: [
          { value: 'IN_HOUSE', label: 'In-house' },
          { value: 'JOB_WORK', label: 'Job work' },
        ],
      },
      {
        key: 'returnState',
        label: 'Return',
        allLabel: 'All returns',
        options: RETURN_STATES,
      },
    ],
    [],
  );

  return (
    <SidebarLayout>
      <PageHeader
        title="Job work"
        subtitle={orderRow ? `For order item #${orderRow.id}` : 'Chitthis, returns and plating status'}
        backTo="/order"
        backLabel="Orders"
        actions={
          <Button
            size="sm"
            onClick={() => navigate('/job-work/move', { state: { mode: 'create', jobWorkMode: 'MANUAL' } })}
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add job work</span>
          </Button>
        }
      />

      <PageBody>
        {/* Context banner (when coming from a specific order row) */}
        {orderRow && (
          <Notice tone="tip" className="mb-4">
            <div className="flex flex-wrap gap-x-5 gap-y-1">
              <span>
                Party <span className="font-semibold text-ink">{orderRow.partyName}</span>
              </span>
              <span>
                Size <span className="font-semibold text-ink">{orderRow.size}</span>
              </span>
              <span>
                Plating <span className="font-semibold text-ink">{orderRow.plating}</span>
              </span>
              <span>
                Qty Pc <span className="font-mono font-semibold text-ink">{orderRow.qtyPc}</span>
              </span>
              <span>
                Order item <span className="font-mono font-semibold text-ink">#{orderRow.id}</span>
              </span>
            </div>
          </Notice>
        )}

        {/* The cards double as the return-state filter: clicking one narrows the list, clicking it
            again clears it. The counts stay whole so the other buckets remain reachable. */}
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Total job works"
            value={fmtNumber(stats.total)}
            icon={BriefcaseBusiness}
            tone="primary"
            isPending={loading}
            onClick={() => setReturnFilter(FILTER_ALL)}
            className={returnFilter === FILTER_ALL ? 'ring-2 ring-primary/40' : undefined}
          />
          <StatCard
            label="Pending"
            value={fmtNumber(stats.pending)}
            icon={Clock}
            tone="warning"
            isPending={loading}
            onClick={() => toggleReturnFilter('PENDING')}
            className={returnFilter === 'PENDING' ? 'ring-2 ring-primary/40' : undefined}
          />
          <StatCard
            label="Partially returned"
            value={fmtNumber(stats.partiallyReturned)}
            icon={PackageCheck}
            tone="info"
            isPending={loading}
            onClick={() => toggleReturnFilter('PARTIALLY_RETURNED')}
            className={returnFilter === 'PARTIALLY_RETURNED' ? 'ring-2 ring-primary/40' : undefined}
          />
          <StatCard
            label="Fully returned"
            value={fmtNumber(stats.fullyReturned)}
            icon={CheckCircle2}
            tone="success"
            isPending={loading}
            onClick={() => toggleReturnFilter('FULLY_RETURNED')}
            className={returnFilter === 'FULLY_RETURNED' ? 'ring-2 ring-primary/40' : undefined}
          />
        </div>

        <ListToolbar
          search={{ value: searchTerm, onChange: setSearchTerm, placeholder: 'Search party, finish, chitthi…' }}
          fields={fields}
          values={{ type: typeFilter, returnState: returnFilter }}
          onChange={(key, value) => {
            if (key === 'type') setTypeFilter(value);
            if (key === 'returnState') setReturnFilter(value);
          }}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
          actions={
            <>
              <Button variant="outline" size="sm" onClick={() => setStatementOpen(true)}>
                <Download className="size-4" />
                <span className="hidden sm:inline">Statement</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setTranslationOpen(true)}>
                <Languages className="size-4" />
                <span className="hidden sm:inline">Translations</span>
              </Button>
            </>
          }
        />

        {/* Content */}
        {loading ? (
          <ListSkeleton rows={4} className="h-36" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={BriefcaseBusiness}
            title={hasActiveFilters ? 'No job work matches' : 'No job work records yet'}
            description={
              hasActiveFilters
                ? 'Nothing here matches that search, type or return state.'
                : 'Move an order line to job work, or add a manual chitthi.'
            }
            action={
              hasActiveFilters ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => navigate('/job-work/move', { state: { mode: 'create', jobWorkMode: 'MANUAL' } })}
                >
                  <Plus className="size-4" />
                  Add job work
                </Button>
              )
            }
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((jw) => (
              <JobWorkCard
                key={jw.id}
                jw={jw}
                fixedBajaar={fixedBajaar}
                onStatusChange={handleStatusChange}
                onTypeChange={handleTypeChange}
                onBajaarChange={handleBajaarChange}
                onReturnRecord={() => {
                  setReturnTarget(jw);
                  setEditingReturn(null);
                }}
                onEditReturn={(ret) => {
                  setReturnTarget(jw);
                  setEditingReturn(ret);
                }}
                onDeleteReturn={(ret) => setDeleteReturnTarget({ jw, ret })}
                onEdit={() =>
                  navigate('/job-work/move', {
                    state:
                      jw.jobWorkType === 'MANUAL'
                        ? { mode: 'edit', jobWorkId: jw.id, jobWorkMode: 'MANUAL', prefillJobWork: jw }
                        : { mode: 'edit', jobWorkId: jw.id, orderItemId: jw.orderItemId, prefillOrderRow: orderRow },
                  })
                }
                onDelete={() => setDeleteTarget(jw)}
              />
            ))}
          </div>
        )}

        {/* Pagination (global view, server-side) */}
        {isGlobal && !loading && totalPages > 1 && (
          <Pagination
            page={page}
            size={PAGE_SIZE}
            total={totalElements}
            count={filtered.length}
            onPageChange={setPage}
          />
        )}
      </PageBody>

      <DownloadStatementModal
        isOpen={statementOpen}
        onClose={() => setStatementOpen(false)}
        title="Download job work statement"
        fileName="jobwork_statement"
        onDownload={(partyId, startDate, endDate) =>
          exportApi.getJobWorkReportPdf(partyId, startDate, endDate, { responseType: 'blob' })
        }
      />

      <TranslationDialog isOpen={translationOpen} onClose={() => setTranslationOpen(false)} />

      {/* Return Record Dialog */}
      <JobWorkReturnRecordDialog
        isOpen={Boolean(returnTarget)}
        jobWork={returnTarget}
        editingReturn={editingReturn}
        onClose={() => {
          setReturnTarget(null);
          setEditingReturn(null);
        }}
        onSaved={handleReturnSaved}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete this job work?"
        description={
          <>
            <ConfirmName>{deleteTarget?.jobWorkLabel || `JW-${deleteTarget?.id}`}</ConfirmName> and its return records
            will be removed. This cannot be undone.
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
            is the last one, the job work goes back to Pending.
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

export default JobWork;
