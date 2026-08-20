import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BriefcaseBusiness,
  ChevronDown,
  Eye,
  Merge,
  Package,
  Plus,
  SquarePen,
  Trash2,
  Truck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import SidebarLayout from '@/components/SidebarLayout';
import { PageBody, PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { EmptyState, PageLoader } from '@/components/states';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { ViewDialog } from '@/components/form-dialog';
import { Field, ReadOnlyField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import MergeOrdersDialog from '@/components/Order/MergeOrdersDialog';
import { axiosInstance, partyApi, orderDispatchApi, orderApi, orderScrapApi, orderMergeApi } from '@/services/apiService';
import {
  normalizeJobWorkLabel,
  readOrderJobOverrides,
  upsertOrderJobOverride,
} from '@/utils/orderJobWorkSync';
import { normalizeSearch } from '@/utils/search';

// ─── Flatten API response into table rows ───────────────────────────────────
const flattenOrders = (apiData) => {
  if (!Array.isArray(apiData)) return [];
  return apiData.flatMap((partyResp) =>
    (partyResp.orders || []).flatMap((order) =>
      (order.orderItems || []).map((item) => ({
        // identifiers
        id: item.id,
        orderId: order.id,
        partyId: partyResp.party?.id,
        sizeId: item.itemSize?.id,
        _createdAt: item.createdAt || null,
        _updatedAt: item.lastUpdatedAt || null,
        // display fields
        partyName: partyResp.party?.name || '—',
        date: order.orderDate || '—',
        // One figure for the whole order, so every line of it carries the same number.
        scrap: order.scrap ?? null,
        // Derived by the server from the works, not stored — see OrderStatus.
        status: order.status ?? null,
        // The orders folded into this one, each keeping its own P/O date. Empty for an ordinary
        // order, which is why the Date cell usually shows a single date.
        mergedFrom: order.mergedFrom ?? [],
        // Set only on a line that genuinely sums two or more; a line that rode across a merge
        // untouched has none, so the marker lands on the items that were actually added together.
        mergedFromItemIds: item.mergedFromItemIds ?? [],
        size:
          [item.itemSize?.sizeInInch, item.itemSize?.sizeInMm ? `(${item.itemSize.sizeInMm})` : '']
            .filter(Boolean)
            .join(' ') || '—',
        // The item master calls this column "Doz."; the order sheet follows the same wording so a
        // line can be matched back to the stock master by eye.
        itemName: item.itemSize?.itemName || '—',
        dozenWeight: item.itemSize?.dozenWeight ?? null,
        plating: item.plating ?? '_',
        qtyPc: item.qtyPc ?? '—',
        // Fall back to the item's own master data (weight/pc, pcs-per-box, etc.) whenever the
        // order item itself never captured these — otherwise most rows show "—" even though the
        // Item Master already has everything needed to compute them.
        qtyKg:
          item.qtyKg ??
          (item.qtyPc != null && item.itemSize?.pcsWeight != null
            ? Number((item.qtyPc * item.itemSize.pcsWeight).toFixed(3))
            : '—'),
        boxPc: item.pcPerBox ?? item.itemSize?.pcsPerBox ?? '—',
        cartoon: item.boxPerCartoon ?? item.itemSize?.boxPerCarton ?? '—',
        pcCartoon: item.pcPerCartoon ?? item.itemSize?.pcsPerCarton ?? '—',
        stickerQty:
          item.stickerQty ??
          (item.qtyPc != null && item.itemSize?.pcsPerBox
            ? Math.ceil(item.qtyPc / item.itemSize.pcsPerBox)
            : '—'),
        dispatchDate: item.lastDispatchDate ?? null,
        dispatchPcs:
          item.totalDispatchedPc != null
            ? item.totalDispatchedPc
            : item.qtyPc != null && item.pendingPc != null
              ? item.qtyPc - item.pendingPc
              : null,
        pendingPc: item.pendingPc ?? '—',
        jobWork: item.platingType ?? null,
        platingStatus: item.jobActionDone ?? false,
        jobWorkNo: item.jobWorkNo ?? '—',
      })),
    ),
  );
};

const toNumeric = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const splitHeaderLabel = (label, maxChars = 14) => {
  const raw = String(label || '')
    .trim()
    .split(/\s+/);
  const tokens = [];
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '/' && tokens.length > 0) {
      tokens[tokens.length - 1] += ' /';
    } else {
      tokens.push(raw[i]);
    }
  }

  const lines = [];
  let current = '';

  tokens.forEach((token) => {
    if (!current) {
      current = token;
      return;
    }
    const next = `${current} ${token}`;
    if (next.length <= maxChars) {
      current = next;
    } else {
      lines.push(current);
      current = token;
    }
  });

  if (current) lines.push(current);
  return lines.length ? lines : [String(label || '')];
};

const renderHeaderLabel = (label, keyPrefix = 'header') => (
  <span className="inline-flex flex-col items-center leading-tight">
    {splitHeaderLabel(label).map((line, idx) => (
      <span key={`${keyPrefix}-${idx}`}>{line}</span>
    ))}
  </span>
);

const splitSizeDisplay = (value) => {
  const text = String(value ?? '—').trim();
  const match = text.match(/^(.*?)(\s*\([^()]+\))$/);
  if (!match) return { main: text, sub: '' };
  return { main: match[1].trim(), sub: match[2].trim() };
};

const TH = 'px-3 py-2.5 text-center text-[11.5px] font-semibold tracking-[0.02em] text-ink-3 uppercase border-r border-line-2 whitespace-nowrap';
const TD = 'px-3 py-3 text-[13px] text-ink-2 border-r border-line-2 whitespace-nowrap';

// ─── Component ──────────────────────────────────────────────────────────────
const OrderManagement = () => {
  const navigate = useNavigate();

  // ── Filters ──────────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortByFields, setSortByFields] = useState('createdAt');
  const [direction, setDirection] = useState('DESC');

  // ── Pagination ────────────────────────────────────────────────────────────
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  // ── Data ──────────────────────────────────────────────────────────────────
  const [orders, setOrders] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [orderJobOverrides, setOrderJobOverrides] = useState(() => readOrderJobOverrides());

  // ── Dialogs ───────────────────────────────────────────────────────────────
  const [viewOrder, setViewOrder] = useState(null);
  const [editOrder, setEditOrder] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [moveToJobWorkRow, setMoveToJobWorkRow] = useState(null);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [selectedMoveType, setSelectedMoveType] = useState('OUTSIDE');

  // ── Parties + Dispatch ────────────────────────────────────────────────────
  const [parties, setParties] = useState([]);

  // ── Selected party (orders are shown one party at a time, like Client Management) ──
  const [selectedParty, setSelectedParty] = useState(null);
  const [dispatchDialog, setDispatchDialog] = useState(null);
  const [scrapDialog, setScrapDialog] = useState(null);
  const [merging, setMerging] = useState(false);
  const [unmergeTarget, setUnmergeTarget] = useState(null);
  const [unmerging, setUnmerging] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // ── Debounce search ───────────────────────────────────────────────────────
  const searchDebounceRef = useRef(null);
  const debouncedSearch = useRef('');

  const partyOptions = useMemo(
    () => parties.map((p) => ({ value: String(p.id), label: p.name })),
    [parties],
  );

  const handleSearchChange = (val) => {
    setSearchTerm(val);
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      debouncedSearch.current = val;
      setPage(0);
      triggerFetch(val, 0);
    }, 400);
  };

  // ── Fetch ─────────────────────────────────────────────────────────────────
  // Orders are shown one party at a time (newest-first by create time). Nothing loads
  // until a party is picked — mirrors the "select client first" flow in Client Management.
  const triggerFetch = useCallback(
    async (search = debouncedSearch.current, pageNum = page) => {
      if (!selectedParty?.id) {
        setOrders([]);
        setTotalPages(0);
        setTotalElements(0);
        return;
      }
      setLoading(true);
      try {
        // When searching, pull a larger batch and filter on the client (space-insensitively) instead
        // of passing the term to the backend — the server's search is exact, so "6x1.1/2x5/32" would
        // never match a size stored as "6 x 1.1/2 x 5/32". Client-side normalizeSearch handles that.
        const searching = Boolean(search);
        const res = await orderApi.getAllOrders(
          selectedParty.id,
          undefined,
          searching ? 0 : pageNum,
          searching ? 200 : PAGE_SIZE,
          sortByFields || 'createdAt',
          direction || 'DESC',
        );
        const body = res.data || {};
        // Per-party endpoint returns { data: { party, orders }, totalPages, ... } — wrap the single
        // party group so the existing row-flattening logic can be reused unchanged.
        const partyOrders = body.data || null;
        setOrders(flattenOrders(partyOrders ? [partyOrders] : []));
        setTotalPages(searching ? 1 : (body.totalPages ?? 0));
        setTotalElements(body.totalElements ?? 0);
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    },
    [page, sortByFields, direction, selectedParty],
  );

  // re-fetch when the selected party / page / sort / direction changes
  useEffect(() => {
    triggerFetch(debouncedSearch.current, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sortByFields, direction, selectedParty]);

  useEffect(() => {
    const reloadOverrides = () => setOrderJobOverrides(readOrderJobOverrides());
    window.addEventListener('focus', reloadOverrides);
    window.addEventListener('storage', reloadOverrides);
    return () => {
      window.removeEventListener('focus', reloadOverrides);
      window.removeEventListener('storage', reloadOverrides);
    };
  }, []);

  useEffect(() => {
    partyApi
      .getAllParties()
      .then((res) => setParties(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, []);

  // Pick a party to view its orders (resets to the first page).
  const handleSelectParty = (p) => {
    setSelectedParty(p);
    setPage(0);
  };

  // ── Client-side search + type filter ──────────────────────────────────────
  const filteredOrders = useMemo(() => {
    let result = orders;

    // Space-insensitive search: strip whitespace from both the query and the row so a size typed
    // as "6x1.1/2x5/32" matches one stored as "6 x 1.1/2 x 5/32". The end user shouldn't have to
    // reproduce the exact spacing.
    const q = normalizeSearch(searchTerm);
    if (q) {
      result = result.filter((order) => {
        const haystack = normalizeSearch(
          [
            order.partyName,
            order.size,
            order.plating,
            order.qtyPc,
            order.qtyKg,
            normalizeJobWorkLabel(order.jobWork),
            order.date,
            order.id,
          ].join(' '),
        );
        return haystack.includes(q);
      });
    }

    // Type filter
    if (typeFilter) {
      result = result.filter((order) =>
        normalizeJobWorkLabel(order.jobWork).toLowerCase().includes(typeFilter.toLowerCase()),
      );
    }

    return result;
  }, [orders, searchTerm, typeFilter]);

  // ── Group by orderId ──────────────────────────────────────────────────────
  const groupedFilteredOrders = useMemo(() => {
    const groups = new Map();
    filteredOrders.forEach((order) => {
      const key = order.orderId ?? order.id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(order);
    });
    return Array.from(groups.values());
  }, [filteredOrders]);

  const totalFilteredOrders = useMemo(() => {
    const orderIds = new Set(filteredOrders.map((o) => o.orderId ?? o.id));
    return orderIds.size;
  }, [filteredOrders]);

  const totalPendingOrders = useMemo(
    () => filteredOrders.filter((o) => toNumeric(o.pendingPc) > 0).length,
    [filteredOrders],
  );

  const totalPice = useMemo(
    () => filteredOrders.reduce((sum, o) => sum + toNumeric(o.qtyPc), 0),
    [filteredOrders],
  );

  // ── Actions ───────────────────────────────────────────────────────────────
  const requestDelete = (order) => setDeleteTarget(order);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      // Delete just this order item. The backend removes the parent order only if it was the
      // last item on it.
      await axiosInstance.delete(
        `/api/v1/parties/${deleteTarget.partyId}/orders/${deleteTarget.orderId}/items/${deleteTarget.id}`,
      );
      toast.success('Order item deleted');
      triggerFetch(debouncedSearch.current, page);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete order item');
    } finally {
      setDeleteTarget(null);
    }
  };

  const toggleGroupExpand = (groupKey) => {
    setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const getRowOverride = (row) => {
    if (!row) return null;
    return orderJobOverrides[`item-${row.id}`] || orderJobOverrides[`order-${row.orderId}`] || null;
  };

  /**
   * The rows the merge dialog may offer, with the local "already sent" markers applied.
   *
   * Drawn from every loaded line rather than the filtered view: merging is a decision about the
   * party's whole book, and a search term typed to find one line should not quietly hide the
   * other line it could be merged with.
   */
  const mergeCandidates = useMemo(
    () =>
      orders.map((row) => {
        const override = orderJobOverrides[`item-${row.id}`] || orderJobOverrides[`order-${row.orderId}`] || null;
        return { ...row, platingStatus: override?.platingStatus ?? row.platingStatus };
      }),
    [orders, orderJobOverrides],
  );

  /**
   * Folds the chosen orders into one.
   *
   * The server creates a NEW order carrying the combined lines and leaves the originals untouched
   * behind it — so this only has to reload, and un-merging later needs nothing but the merged
   * order id.
   */
  const handleMerge = async (orderIds, scrap) => {
    if (!orderIds || orderIds.length < 2) return;
    setMerging(true);
    try {
      await orderMergeApi.merge(orderIds, scrap);
      setMergeOpen(false);
      toast.success(`Merged ${orderIds.length} orders`);
      triggerFetch(debouncedSearch.current, page);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to merge orders');
    } finally {
      setMerging(false);
    }
  };

  const handleUnmerge = async () => {
    const orderId = unmergeTarget?.orderId;
    if (!orderId) return;
    setUnmerging(true);
    try {
      await orderMergeApi.unmerge(orderId);
      setUnmergeTarget(null);
      toast.success('Orders un-merged');
      triggerFetch(debouncedSearch.current, page);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to un-merge');
    } finally {
      setUnmerging(false);
    }
  };

  const toggleJobUpdateStatus = (row) => {
    if (!row) return;
    const override = getRowOverride(row);
    const currentJobWork = normalizeJobWorkLabel(override?.jobWork ?? row.jobWork);
    setMoveToJobWorkRow(row);
    setSelectedMoveType(currentJobWork === 'In-House' ? 'INHOUSE' : 'OUTSIDE');
  };

  const handleMoveToJobWorkSave = () => {
    if (!moveToJobWorkRow) return;
    if (selectedMoveType === 'MANUAL') {
      // Manual job work is not tied to this order — open the blank manual form.
      navigate('/job-work/move', { state: { mode: 'create', jobWorkMode: 'MANUAL' } });
      setMoveToJobWorkRow(null);
      return;
    }
    const selectedLabel = selectedMoveType === 'INHOUSE' ? 'In-House' : 'Outside';
    navigate('/job-work/move', {
      state: {
        mode: 'create',
        prefillOrderRow: { ...moveToJobWorkRow, jobWork: selectedLabel },
      },
    });
    setMoveToJobWorkRow(null);
  };

  const normalizeToISO = (dateStr) => {
    if (!dateStr || dateStr === '—') return null;
    if (dateStr.includes('/')) {
      const [d, m, y] = dateStr.split('/');
      return `${y}-${m}-${d}`;
    }
    return dateStr;
  };

  const handleEditOrderSave = async () => {
    if (!editOrder) return;
    setSavingEdit(true);
    try {
      // Fetch full order to preserve all items
      const orderRes = await axiosInstance.get(
        `/api/v1/parties/${editOrder.partyId}/orders/${editOrder.orderId}`,
      );
      const fullOrder = orderRes.data;
      const updatedItems = (fullOrder.orderItems || []).map((item) => {
        const isTarget = item.id === editOrder.id;
        return {
          itemSizeId: item.itemSize?.id,
          plating: isTarget ? editOrder.plating : item.plating,
          qtyPc: isTarget ? parseFloat(editOrder.qtyPc) || 0 : item.qtyPc,
          qtyKg: isTarget ? parseFloat(editOrder.qtyKg) || null : item.qtyKg,
          pcPerBox: isTarget ? parseFloat(editOrder.boxPc) || null : item.pcPerBox,
          boxPerCartoon: isTarget ? parseFloat(editOrder.cartoon) || null : item.boxPerCartoon,
          pcPerCartoon: isTarget ? parseFloat(editOrder.pcCartoon) || null : item.pcPerCartoon,
          stickerQty: isTarget ? parseFloat(editOrder.stickerQty) || null : item.stickerQty,
          pendingPc: isTarget ? parseFloat(editOrder.pendingPc) || null : item.pendingPc,
          jobActionDone: isTarget ? editOrder.platingStatus : item.jobActionDone,
          platingType: item.platingType,
        };
      });

      await axiosInstance.put(`/api/v1/parties/${editOrder.partyId}/orders/${editOrder.orderId}`, {
        orderDate: normalizeToISO(editOrder.date) || fullOrder.orderDate,
        items: updatedItems,
      });

      // Update local state + overrides
      const existingOverride = getRowOverride(editOrder);
      const currentJobWork = normalizeJobWorkLabel(existingOverride?.jobWork ?? editOrder.jobWork);
      const overridePatch = { platingStatus: editOrder.platingStatus, jobWorkNo: editOrder.jobWorkNo };
      if (currentJobWork !== '—') overridePatch.jobWork = currentJobWork;

      setOrders((prev) => prev.map((row) => (row.id === editOrder.id ? { ...row, ...editOrder } : row)));
      setOrderJobOverrides(
        upsertOrderJobOverride({ orderItemId: editOrder.id, orderId: editOrder.orderId, ...overridePatch }),
      );
      setEditOrder(null);
      toast.success('Order updated');
      triggerFetch(debouncedSearch.current, page);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update order');
    } finally {
      setSavingEdit(false);
    }
  };

  // ── Dispatch ──────────────────────────────────────────────────────────────
  const fetchDispatches = async (row) => {
    const res = await orderDispatchApi.getAllOrderDispatches(
      row.partyId,
      row.orderId,
      row.id,
      undefined,
      0,
      100,
    );
    return res.data?.data || [];
  };

  const openDispatchDialog = async (row) => {
    setDispatchDialog({ row, dispatches: [], loading: true, newDate: '', newPcs: '', saving: false });
    try {
      const dispatches = await fetchDispatches(row);
      setDispatchDialog((prev) => ({ ...prev, dispatches, loading: false }));
    } catch {
      toast.error('Failed to load dispatches');
      setDispatchDialog(null);
    }
  };

  const handleAddDispatch = async () => {
    const { row, newDate, newPcs } = dispatchDialog;
    if (!newDate) {
      toast.error('Enter dispatch date');
      return;
    }
    if (!newPcs || parseFloat(newPcs) <= 0) {
      toast.error('Enter valid pcs');
      return;
    }
    setDispatchDialog((prev) => ({ ...prev, saving: true }));
    try {
      await orderDispatchApi.createOrderDispatch(row.partyId, row.orderId, row.id, {
        dispatchDate: newDate,
        dispatchPcs: parseFloat(newPcs),
      });
      const dispatches = await fetchDispatches(row);
      setDispatchDialog((prev) => ({ ...prev, dispatches, newDate: '', newPcs: '', saving: false }));
      toast.success('Dispatch added');
      triggerFetch(debouncedSearch.current, page);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add dispatch');
      setDispatchDialog((prev) => ({ ...prev, saving: false }));
    }
  };

  const handleDeleteDispatch = async (dispatchId) => {
    const { row } = dispatchDialog;
    try {
      await orderDispatchApi.deleteOrderDispatch(row.partyId, row.orderId, row.id, dispatchId);
      setDispatchDialog((prev) => ({
        ...prev,
        dispatches: prev.dispatches.filter((d) => d.id !== dispatchId),
      }));
      toast.success('Dispatch deleted');
      triggerFetch(debouncedSearch.current, page);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete dispatch');
    }
  };

  // ── Scrap ─────────────────────────────────────────────────────────────────
  // Settled once with the party for the whole order, so it is edited against the order rather
  // than the line the user happened to click, and every row of that order moves with it.
  const openScrapDialog = (row) => {
    setScrapDialog({
      orderId: row.orderId,
      partyName: row.partyName,
      value: row.scrap == null ? '' : String(row.scrap),
      saving: false,
    });
  };

  const handleSaveScrap = async () => {
    const { orderId, value } = scrapDialog;
    const trimmed = String(value).trim();
    // Cleared means "not agreed yet" again, which is not the same as agreed at zero.
    const scrap = trimmed === '' ? null : Number(trimmed);
    if (scrap != null && !Number.isFinite(scrap)) {
      toast.error('Scrap must be a number');
      return;
    }

    setScrapDialog((prev) => ({ ...prev, saving: true }));
    try {
      await orderScrapApi.update(orderId, scrap);
      setOrders((prev) => prev.map((r) => (r.orderId === orderId ? { ...r, scrap } : r)));
      setScrapDialog(null);
      toast.success('Scrap saved');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save scrap');
      setScrapDialog((prev) => ({ ...prev, saving: false }));
    }
  };

  const MoveOption = ({ value, label, description }) => {
    const isSelected = selectedMoveType === value;
    return (
      <button
        type="button"
        onClick={() => setSelectedMoveType(value)}
        aria-pressed={isSelected}
        className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
          isSelected
            ? 'border-primary bg-primary-soft ring-1 ring-primary/40'
            : 'border-line bg-surface hover:border-primary/40 hover:bg-surface-2'
        }`}
      >
        <span
          className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
            isSelected ? 'border-primary' : 'border-line'
          }`}
        >
          {isSelected ? <span className="size-2.5 rounded-full bg-primary" /> : null}
        </span>
        <span className="flex flex-col">
          <span className={`text-[13.5px] font-semibold ${isSelected ? 'text-primary' : 'text-ink'}`}>
            {label}
          </span>
          <span className="mt-0.5 text-[12px] text-ink-3">{description}</span>
        </span>
      </button>
    );
  };

  const convertToDateInput = (dateString) => {
    if (!dateString || dateString === '—') return '';
    const parts = dateString.split('/');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return dateString;
  };

  const renderOrderDetails = (order, isEditable = false) => {
    const fields = [
      ['Party Name', 'partyName'],
      ['Date', 'date'],
      ['Scrap', 'scrap'],
      ['Size', 'size'],
      ['Plating', 'plating'],
      ['Qty Pc', 'qtyPc'],
      ['Qty Kg', 'qtyKg'],
      ['Pc/Box', 'boxPc'],
      ['Cartoon', 'cartoon'],
      ['Pc/Cartoon', 'pcCartoon'],
      ['Sticker Qty.', 'stickerQty'],
      ['Dispatch Date', 'dispatchDate'],
      ['Dispatch Pcs', 'dispatchPcs'],
      ['Pending Pc', 'pendingPc'],
      ['Job Action', 'jobWork'],
      ['Job Work No', 'jobWorkNo'],
      ['Plating Status', 'platingStatus'],
    ];

    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {fields.map(([label, key]) => {
          if (!isEditable) {
            return (
              <ReadOnlyField
                key={key}
                label={label}
                value={key === 'platingStatus' ? (order?.[key] ? 'Enabled' : 'Disabled') : order?.[key]}
              />
            );
          }

          if (key === 'partyName') {
            return (
              <Field key={key} label={label}>
                <SearchableSelect
                  ariaLabel="Party"
                  placeholder="Select party"
                  searchPlaceholder="Search party…"
                  options={partyOptions}
                  value={editOrder?.partyId != null ? String(editOrder.partyId) : undefined}
                  onChange={(v) => {
                    const p = parties.find((x) => String(x.id) === v);
                    if (p) setEditOrder((prev) => ({ ...prev, partyName: p.name, partyId: p.id }));
                  }}
                />
              </Field>
            );
          }

          if (key === 'platingStatus') {
            return (
              <Field key={key} label={label}>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditOrder((prev) => ({ ...prev, [key]: !prev[key] }))}
                    className={`relative h-6 w-10 rounded-full transition ${editOrder?.[key] ? 'bg-success' : 'bg-line'}`}
                  >
                    <span
                      className={`absolute top-1 size-4 rounded-full bg-white transition ${editOrder?.[key] ? 'right-1' : 'left-1'}`}
                    />
                  </button>
                  <span className="text-[13px] text-ink-2">{editOrder?.[key] ? 'Enabled' : 'Disabled'}</span>
                </div>
              </Field>
            );
          }

          if (key === 'date') {
            return (
              <Field key={key} label={label}>
                <Input
                  type="date"
                  value={convertToDateInput(editOrder?.[key] ?? '')}
                  onChange={(e) => setEditOrder((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              </Field>
            );
          }

          if (key === 'dispatchDate' || key === 'dispatchPcs') {
            return (
              <Field key={key} label={label}>
                <p className="rounded-md border border-line bg-surface-2 px-3 py-2 text-[13px] text-ink-3 italic">
                  Manage via Dispatch button in table
                </p>
              </Field>
            );
          }

          // Editing an order resends every line; the scrap is one number for the whole order and
          // is set from the Date column, so it is not offered a second, line-shaped way in here.
          if (key === 'scrap') {
            return (
              <Field key={key} label={label}>
                <p className="rounded-md border border-line bg-surface-2 px-3 py-2 text-[13px] text-ink-3 italic">
                  Manage via Scrap under the order&apos;s date
                </p>
              </Field>
            );
          }

          return (
            <Field key={key} label={label}>
              <Input
                value={editOrder?.[key] ?? ''}
                onChange={(e) => setEditOrder((prev) => ({ ...prev, [key]: e.target.value }))}
              />
            </Field>
          );
        })}
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SidebarLayout>
      <PageHeader
        title="Order management"
        subtitle="Simplifying order processing from start to delivery"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setMergeOpen(true)}>
              <Merge className="size-4" />
              <span className="hidden md:inline">Merge orders</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/job-work')}>
              <BriefcaseBusiness className="size-4" />
              <span className="hidden md:inline">All job works</span>
            </Button>
            <Button size="sm" onClick={() => navigate('/order/select')}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">Add order</span>
            </Button>
          </>
        }
      />

      <PageBody className="space-y-5">
        {/* Party picker — choose a party to view its orders (newest first by create time) */}
        <div className="max-w-md">
          <label className="mb-1.5 block text-[12.5px] font-medium text-ink-2">Party</label>
          <SearchableSelect
            ariaLabel="Party"
            placeholder="Select a party to view its orders"
            searchPlaceholder="Search party…"
            options={partyOptions}
            value={selectedParty?.id != null ? String(selectedParty.id) : undefined}
            onChange={(v) => {
              const p = parties.find((x) => String(x.id) === v);
              if (p) handleSelectParty(p);
            }}
          />
        </div>

        {!selectedParty ? (
          <EmptyState
            icon={Package}
            title="Select a party"
            description="Choose a party above to view its orders."
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard label="Total orders" value={totalFilteredOrders} tone="primary" />
              <StatCard label="Total pending orders" value={totalPendingOrders} tone="warning" />
              <StatCard label="Total pieces" value={totalPice.toLocaleString()} tone="info" />
            </div>

            {/* Toolbar */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative w-full sm:max-w-sm sm:flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
                <Input
                  type="search"
                  placeholder="Search orders…"
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="bg-surface pl-9"
                />
              </div>
              <Select value={typeFilter || 'ALL'} onValueChange={(v) => setTypeFilter(v === 'ALL' ? '' : v)}>
                <SelectTrigger className="w-full bg-surface sm:w-44">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All types</SelectItem>
                  <SelectItem value="Outside">Outside</SelectItem>
                  <SelectItem value="In-House">In-House</SelectItem>
                  <SelectItem value="Job Work">Job Work</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card className="gap-0 overflow-hidden py-0">
              <div className="max-h-[560px] w-full overflow-auto scrollbar-thin">
                <table className="w-max min-w-full table-auto border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-line bg-surface-2">
                      <th rowSpan={2} className={TH}>
                        {renderHeaderLabel('Party Name', 'party-name')}
                      </th>
                      <th rowSpan={2} className={TH}>
                        <button
                          type="button"
                          onClick={() => {
                            setSortByFields('createdAt');
                            setDirection((d) => (d === 'ASC' ? 'DESC' : 'ASC'));
                            setPage(0);
                          }}
                          className="mx-auto flex items-center gap-1"
                        >
                          {renderHeaderLabel('Date', 'date')}
                          <ChevronDown
                            className={`size-3 transition-transform ${sortByFields === 'createdAt' && direction === 'ASC' ? 'rotate-180' : ''}`}
                          />
                        </button>
                      </th>
                      <th rowSpan={2} className={TH}>
                        {renderHeaderLabel('Doz.', 'item-name')}
                      </th>
                      <th rowSpan={2} className={TH}>
                        {renderHeaderLabel('Size', 'size')}
                      </th>
                      <th rowSpan={2} className={TH}>
                        {renderHeaderLabel('Plating', 'plating')}
                      </th>
                      <th rowSpan={2} className={TH}>
                        {renderHeaderLabel('Qty. Pc', 'qty-pc')}
                      </th>
                      <th rowSpan={2} className={TH}>
                        {renderHeaderLabel('Qty Kg', 'qty-kg')}
                      </th>
                      <th rowSpan={2} className={TH}>
                        {renderHeaderLabel('Pc/Box.', 'pc-box')}
                      </th>
                      <th rowSpan={2} className={TH}>
                        {renderHeaderLabel('Box/Cartoon.', 'box-cartoon')}
                      </th>
                      <th rowSpan={2} className={TH}>
                        {renderHeaderLabel('Pc/Cartoon', 'pc-cartoon')}
                      </th>
                      <th rowSpan={2} className={TH}>
                        {renderHeaderLabel('Sticker Qty.', 'sticker-qty')}
                      </th>
                      <th colSpan={2} className={`${TH} py-2`}>
                        {renderHeaderLabel('Dispatch', 'dispatch')}
                      </th>
                      <th rowSpan={2} className={TH}>
                        {renderHeaderLabel('Pending Pc.', 'pending-pc')}
                      </th>
                      <th rowSpan={2} className={TH}>
                        {renderHeaderLabel('Job Update', 'job-update')}
                      </th>
                      <th rowSpan={2} className={`${TH} border-r-0`}>
                        {renderHeaderLabel('Action', 'action')}
                      </th>
                    </tr>
                    <tr className="border-b border-line bg-surface-2">
                      <th className={`${TH} py-2`}>{renderHeaderLabel('Date', 'dispatch-date')}</th>
                      <th className={`${TH} py-2`}>{renderHeaderLabel('Pcs.', 'dispatch-pcs')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={16}>
                          <PageLoader text="Loading orders…" />
                        </td>
                      </tr>
                    ) : groupedFilteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={16} className="px-3 py-8 text-center text-[13px] text-ink-3">
                          No orders found.
                        </td>
                      </tr>
                    ) : (
                      groupedFilteredOrders.flatMap((group) => {
                        const groupKey = group[0]?.orderId ?? group[0]?.id;
                        const isExpanded = Boolean(expandedGroups[groupKey]);
                        const visibleRows = group.length > 1 && !isExpanded ? [group[0]] : group;

                        return visibleRows.map((row, rowIndex) => {
                          const showGroupedColumns = rowIndex === 0;
                          const groupRowSpan = visibleRows.length;
                          const isMultiItem = group.length > 1;
                          const sizeParts = splitSizeDisplay(row.size);
                          const rowOverride = getRowOverride(row);
                          const effectivePlatingStatus = rowOverride?.platingStatus ?? row.platingStatus;
                          const effectiveJobWork = normalizeJobWorkLabel(rowOverride?.jobWork ?? row.jobWork);
                          const effectiveJobWorkNo = rowOverride?.jobWorkNo ?? row.jobWorkNo;
                          const effectiveStickerQty = row.stickerQty ?? '—';
                          const effectiveJobWorkKey = String(effectiveJobWork || '')
                            .toLowerCase()
                            .replace(/[\s-]/g, '');

                          return (
                            <tr
                              key={row.id}
                              onDoubleClick={() => setViewOrder(row)}
                              className={`cursor-pointer border-b border-line-2 ${
                                row._updatedAt && row._createdAt && row._updatedAt !== row._createdAt
                                  ? 'bg-warning-soft'
                                  : 'hover:bg-surface-2'
                              }`}
                            >
                              {showGroupedColumns && (
                                <td rowSpan={groupRowSpan} className={`${TD} align-top text-ink`}>
                                  <div className="inline-flex cursor-pointer items-center gap-1">
                                    <span>{row.partyName}</span>
                                    {(row.mergedFrom || []).length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => setUnmergeTarget(row)}
                                        title={`Merged from ${row.mergedFrom.length} orders — click to un-merge`}
                                        className="rounded-full bg-primary-soft px-1.5 py-0.5 text-[10.5px] font-semibold text-primary"
                                      >
                                        Merged
                                      </button>
                                    )}
                                    {isMultiItem ? (
                                      <button
                                        type="button"
                                        onClick={() => toggleGroupExpand(groupKey)}
                                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                                      >
                                        <ChevronDown
                                          className={`size-3.5 text-ink-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                        />
                                      </button>
                                    ) : null}
                                  </div>
                                </td>
                              )}
                              {showGroupedColumns && (
                                <td rowSpan={groupRowSpan} className={`${TD} align-top`}>
                                  <div className="flex flex-col items-center gap-0.5">
                                    {/* A merged order keeps every source P/O date — that is a fact
                                        about the party's purchase order and cannot be averaged
                                        into one. */}
                                    {(row.mergedFrom || []).length > 0 ? (
                                      (row.mergedFrom || []).map((source) => (
                                        <span key={source.orderId} className="whitespace-nowrap">
                                          {source.orderDate}
                                        </span>
                                      ))
                                    ) : (
                                      <span>{row.date}</span>
                                    )}
                                    {/* The scrap belongs to the order, and so does this cell — it
                                        already spans the order's lines. */}
                                    <button
                                      type="button"
                                      onClick={() => openScrapDialog(row)}
                                      title={row.scrap == null ? 'Add scrap' : 'Edit scrap'}
                                      className="text-[12px] hover:text-ink"
                                    >
                                      {row.scrap == null ? (
                                        <span className="inline-flex items-center gap-0.5 text-ink-3">
                                          <Plus className="size-3" />
                                          Scrap
                                        </span>
                                      ) : (
                                        <span className="font-mono font-medium text-ink-2">
                                          <span className="text-[11px] text-ink-3">Scrap </span>
                                          {row.scrap}
                                        </span>
                                      )}
                                    </button>
                                  </div>
                                </td>
                              )}
                              <td className={`${TD} text-ink`}>
                                {row.itemName}
                                {/* Only lines that genuinely sum two or more; a line that rode
                                    across the merge untouched is not marked. */}
                                {(row.mergedFromItemIds || []).length > 1 && (
                                  <span
                                    title={`Sums ${row.mergedFromItemIds.length} order lines`}
                                    className="ml-1.5 rounded-full bg-primary-soft px-1.5 py-0.5 text-[10.5px] font-semibold text-primary"
                                  >
                                    Merged
                                  </span>
                                )}
                              </td>
                              <td className={`${TD} whitespace-normal`}>
                                <span className="inline-flex flex-col leading-tight">
                                  <span className="whitespace-nowrap">{sizeParts.main}</span>
                                  {sizeParts.sub ? (
                                    <span className="text-center whitespace-nowrap">{sizeParts.sub}</span>
                                  ) : null}
                                </span>
                              </td>
                              <td className={`${TD} text-center`}>{row.plating}</td>
                              <td className={`${TD} text-center font-mono text-ink`}>{row.qtyPc}</td>
                              <td className={`${TD} text-center font-mono`}>{row.qtyKg}</td>
                              <td className={`${TD} text-center font-mono`}>{row.boxPc}</td>
                              <td className={`${TD} text-center font-mono`}>{row.cartoon}</td>
                              <td className={`${TD} text-center font-mono`}>{row.pcCartoon}</td>
                              <td className={`${TD} text-center font-mono`}>{effectiveStickerQty}</td>
                              <td className={`${TD} text-center`}>
                                <button
                                  type="button"
                                  onClick={() => openDispatchDialog(row)}
                                  className="group inline-flex flex-col items-center gap-0.5"
                                  title="Manage dispatches"
                                >
                                  <Truck className="size-3.5 text-ink-3 group-hover:text-ink" />
                                  <span className="text-[12px] text-ink-2">
                                    {row.dispatchDate ?? <span className="text-ink-3">+ Add</span>}
                                  </span>
                                </button>
                              </td>
                              <td className={`${TD} text-center`}>
                                <button
                                  type="button"
                                  onClick={() => openDispatchDialog(row)}
                                  className="font-mono hover:text-ink"
                                >
                                  {row.dispatchPcs != null ? (
                                    <span className="font-medium text-ink">
                                      {row.dispatchPcs}{' '}
                                      <span className="text-[11px] text-ink-3">/ {row.qtyPc}</span>
                                    </span>
                                  ) : (
                                    <span className="text-[12px] text-ink-3">+ Add</span>
                                  )}
                                </button>
                              </td>
                              <td className={`${TD} text-center font-mono`}>{row.pendingPc}</td>

                              <td className={`${TD}`}>
                                <div className="flex flex-col items-center gap-1.5">
                                  <span className="font-mono text-[12px] text-ink-2">{effectiveJobWorkNo}</span>
                                  <button
                                    type="button"
                                    onClick={() => toggleJobUpdateStatus(row)}
                                    aria-label="Open job update"
                                    title="Open job update"
                                    className={`relative inline-flex h-4 w-7 items-center rounded-full ${effectivePlatingStatus ? 'bg-success' : 'bg-line'} cursor-pointer`}
                                  >
                                    <span
                                      className={`absolute top-0.5 size-3 rounded-full bg-white ${effectivePlatingStatus ? 'right-0.5' : 'left-0.5'}`}
                                    />
                                  </button>
                                  <span
                                    className={`text-[12px] ${
                                      effectiveJobWorkKey === 'outside'
                                        ? 'text-danger'
                                        : effectiveJobWorkKey === 'inhouse'
                                          ? 'text-success'
                                          : 'text-ink-2'
                                    }`}
                                  >
                                    {effectiveJobWork}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => navigate('/job-work', { state: { orderRow: row } })}
                                    aria-label="Open job work"
                                  >
                                    <BriefcaseBusiness className="size-4 text-ink-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => setEditOrder({ ...row })}
                                    aria-label="Edit order"
                                  >
                                    <SquarePen className="size-4 text-ink-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => setViewOrder(row)}
                                    aria-label="View order"
                                  >
                                    <Eye className="size-4 text-ink-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => requestDelete(row)}
                                    aria-label="Delete order"
                                    className="text-danger hover:text-danger"
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-line px-4 py-3">
                  <p className="text-[12.5px] text-ink-3">
                    Page {page + 1} of {totalPages} · {totalElements} orders
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </>
        )}
      </PageBody>

      {/* View dialog */}
      <ViewDialog
        open={Boolean(viewOrder)}
        onOpenChange={(open) => !open && setViewOrder(null)}
        title="View order"
        size="lg"
      >
        {viewOrder && renderOrderDetails(viewOrder, false)}
      </ViewDialog>

      {/* Edit dialog */}
      <Dialog open={Boolean(editOrder)} onOpenChange={(open) => !open && !savingEdit && setEditOrder(null)}>
        <DialogContent className="max-h-[calc(100dvh-1.5rem)] gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-line px-4 py-3.5 text-left sm:px-6">
            <DialogTitle className="text-[15px] font-semibold text-ink sm:text-[17px]">Edit order</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            {editOrder && renderOrderDetails(editOrder, true)}
          </div>
          <DialogFooter className="border-t border-line bg-surface-2 px-4 py-3 sm:px-6">
            <Button variant="outline" onClick={() => setEditOrder(null)} disabled={savingEdit}>
              Cancel
            </Button>
            <Button onClick={handleEditOrderSave} disabled={savingEdit}>
              {savingEdit ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete order item"
        description={`Delete this item${deleteTarget?.size ? ` (${deleteTarget.size})` : ''} from ${deleteTarget?.partyName || 'this party'}'s order? If it's the only item, the whole order is removed.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
      />

      {/* Dispatch dialog */}
      <Dialog open={Boolean(dispatchDialog)} onOpenChange={(open) => !open && setDispatchDialog(null)}>
        <DialogContent className="max-h-[calc(100dvh-1.5rem)] gap-0 overflow-hidden p-0 sm:max-w-lg">
          {dispatchDialog && (
            <>
              <DialogHeader className="border-b border-line px-4 py-3.5 text-left sm:px-6">
                <DialogTitle className="text-[15px] font-semibold text-ink">Dispatch</DialogTitle>
                <DialogDescription className="text-[12px] text-ink-3">
                  {dispatchDialog.row.partyName} · {dispatchDialog.row.size} · Qty{' '}
                  {dispatchDialog.row.qtyPc} pc
                </DialogDescription>
              </DialogHeader>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
                {dispatchDialog.loading ? (
                  <PageLoader text="Loading dispatches…" />
                ) : dispatchDialog.dispatches.length === 0 ? (
                  <p className="py-4 text-center text-[13px] text-ink-3">No dispatches yet</p>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-line">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="border-b border-line bg-surface-2">
                          <th className="px-4 py-2 text-left text-[11.5px] font-semibold text-ink-3 uppercase">#</th>
                          <th className="px-4 py-2 text-left text-[11.5px] font-semibold text-ink-3 uppercase">Date</th>
                          <th className="px-4 py-2 text-right text-[11.5px] font-semibold text-ink-3 uppercase">Pcs</th>
                          <th className="w-8 px-4 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {dispatchDialog.dispatches.map((d, i) => (
                          <tr key={d.id} className="border-b border-line-2 last:border-0">
                            <td className="px-4 py-2 text-ink-3">{i + 1}</td>
                            <td className="px-4 py-2 text-ink-2">{d.dispatchDate}</td>
                            <td className="px-4 py-2 text-right font-mono font-medium text-ink">{d.dispatchPcs}</td>
                            <td className="px-4 py-2">
                              <button
                                type="button"
                                onClick={() => handleDeleteDispatch(d.id)}
                                className="text-ink-3 hover:text-danger"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-line bg-surface-2">
                          <td colSpan={2} className="px-4 py-2 text-[11.5px] font-semibold text-ink-3 uppercase">
                            Total dispatched
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-[13px] font-semibold text-ink">
                            {dispatchDialog.dispatches.reduce((s, d) => s + (parseFloat(d.dispatchPcs) || 0), 0)}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {/* Add new dispatch */}
                <div className="space-y-3 rounded-lg border border-line p-4">
                  <p className="text-[11.5px] font-semibold tracking-[0.04em] text-ink-3 uppercase">Add dispatch</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Date">
                      <Input
                        type="date"
                        value={dispatchDialog.newDate}
                        onChange={(e) => setDispatchDialog((prev) => ({ ...prev, newDate: e.target.value }))}
                      />
                    </Field>
                    <Field label="Pcs">
                      <Input
                        type="number"
                        min="1"
                        placeholder="e.g. 50"
                        value={dispatchDialog.newPcs}
                        onChange={(e) => setDispatchDialog((prev) => ({ ...prev, newPcs: e.target.value }))}
                      />
                    </Field>
                  </div>
                  <Button className="w-full" onClick={handleAddDispatch} disabled={dispatchDialog.saving}>
                    {dispatchDialog.saving ? 'Adding…' : 'Add dispatch'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Move to job work dialog */}
      <Dialog open={Boolean(moveToJobWorkRow)} onOpenChange={(open) => !open && setMoveToJobWorkRow(null)}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="border-b border-line px-6 py-4 text-left">
            <DialogTitle className="text-[16px] font-semibold text-ink">Move to job work</DialogTitle>
            <DialogDescription className="text-[13px] text-ink-3">
              Choose how this item goes for finishing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 px-6 py-5">
            <MoveOption value="OUTSIDE" label="Out-Side Job Work" description="Sent to an outside vendor you select." />
            <MoveOption
              value="INHOUSE"
              label="In-Side Job Work"
              description="Finished in-house — party auto-filled from the order."
            />
            <MoveOption
              value="MANUAL"
              label="Manual Job Work"
              description="Not tied to this order — enter party & item yourself."
            />
          </div>
          <DialogFooter className="border-t border-line bg-surface-2 px-6 py-4">
            <Button variant="outline" onClick={() => setMoveToJobWorkRow(null)}>
              Cancel
            </Button>
            <Button onClick={handleMoveToJobWorkSave}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scrap */}
      <Dialog open={Boolean(scrapDialog)} onOpenChange={(open) => !open && setScrapDialog(null)}>
        <DialogContent className="sm:max-w-[26rem]">
          <DialogHeader>
            <DialogTitle>Scrap</DialogTitle>
            <DialogDescription>
              The scrap agreed with {scrapDialog?.partyName || 'the party'} for this order. One
              figure for the whole order, so it shows against every line on it. Leave it blank if it
              has not been agreed yet.
            </DialogDescription>
          </DialogHeader>

          <Field label="Amount">
            <Input
              type="number"
              step="any"
              min="0"
              inputMode="decimal"
              autoFocus
              value={scrapDialog?.value ?? ''}
              placeholder="Not set"
              onChange={(e) => setScrapDialog((prev) => ({ ...prev, value: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveScrap();
              }}
              className="font-mono"
            />
          </Field>

          <DialogFooter>
            <Button variant="outline" onClick={() => setScrapDialog(null)} disabled={scrapDialog?.saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveScrap} disabled={scrapDialog?.saving}>
              {scrapDialog?.saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Un-merge. Only offered while the merged order is still Created — after that its lines
          carry chitthis and dispatches belonging to the combined quantity, and there is no honest
          way to divide that history back across the orders it came from. */}
      <ConfirmDialog
        open={Boolean(unmergeTarget)}
        onOpenChange={(open) => !open && setUnmergeTarget(null)}
        title="Un-merge this order?"
        description={
          <>
            The {unmergeTarget?.mergedFrom?.length ?? 0} orders this was made from come back exactly
            as they were — they were never altered. The merged order itself is removed.
          </>
        }
        confirmLabel="Un-merge"
        busyLabel="Un-merging…"
        isPending={unmerging}
        onConfirm={handleUnmerge}
      />

      <MergeOrdersDialog
        isOpen={mergeOpen}
        onClose={() => setMergeOpen(false)}
        rows={mergeCandidates}
        onMerge={handleMerge}
        isMerging={merging}
      />
    </SidebarLayout>
  );
};

export default OrderManagement;
