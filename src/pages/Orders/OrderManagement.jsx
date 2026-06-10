import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, SquarePen, Eye, Trash2, ChevronDown, X, ChevronLeft, ChevronRight, BriefcaseBusiness, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SidebarLayout from "../../components/SidebarLayout";
import SearchFilter from "../../components/SearchFilter";
import StatsCard from "../../components/StatsCard";
import PageHeader from "../../components/PageHeader";
import PrimaryActionButton from "../../components/PrimaryActionButton";
import ConfirmationDialog from "../../components/ConfirmationDialog";
import toast from "react-hot-toast";
import { axiosInstance, partyApi, orderDispatchApi } from "../../services/apiService";
import Loader from "../../components/Loader";
import {
  normalizeJobWorkLabel,
  readOrderJobOverrides,
  upsertOrderJobOverride,
} from "../../utils/orderJobWorkSync";

// ─── Flatten API response into table rows ───────────────────────────────────
const flattenOrders = (apiData) => {
  if (!Array.isArray(apiData)) return [];
  return apiData.flatMap((partyResp) =>
    (partyResp.orders || []).flatMap((order) =>
      (order.orderItems || []).map((item) => ({
        // identifiers
        id:       item.id,
        orderId:  order.id,
        partyId:  partyResp.party?.id,
        sizeId:   item.itemSize?.id,
        _createdAt: item.createdAt || null,
        _updatedAt: item.lastUpdatedAt || null,
        // display fields
        partyName:    partyResp.party?.name || "—",
        date:         order.orderDate || "—",
        size:         [item.itemSize?.sizeInInch, item.itemSize?.sizeInMm ? `(${item.itemSize.sizeInMm})` : ""].filter(Boolean).join(" ") || "—",
        plating:      item.plating      ?? "_",
        qtyPc:        item.qtyPc        ?? "—",
        qtyKg:        item.qtyKg        ?? "—",
        boxPc:        item.pcPerBox     ?? "—",
        cartoon:      item.boxPerCartoon ?? "—",
        pcCartoon:    item.pcPerCartoon  ?? "—",
        stickerQty:   item.stickerQty   ?? "—",
        dispatchDate: item.lastDispatchDate ?? null,
        dispatchPcs:  item.totalDispatchedPc != null
          ? item.totalDispatchedPc
          : (item.qtyPc != null && item.pendingPc != null ? item.qtyPc - item.pendingPc : null),
        pendingPc:    item.pendingPc    ?? "—",
        jobWork:      item.platingType  ?? null,
        platingStatus:item.jobActionDone ?? false,
        jobWorkNo:    item.jobWorkNo    ?? "—",
      }))
    )
  );
};

const toNumeric = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const splitHeaderLabel = (label, maxChars = 8) => {
  const tokens = String(label || "")
    .replace(/\//g, " / ")
    .trim()
    .split(/\s+/)
    .filter((token) => token !== "/");

  const lines = [];
  let current = "";

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
  return lines.length ? lines : [String(label || "")];
};

const renderHeaderLabel = (label, keyPrefix = "header") => (
  <span className="inline-flex flex-col items-center leading-tight">
    {splitHeaderLabel(label).map((line, idx) => (
      <span key={`${keyPrefix}-${idx}`}>{line}</span>
    ))}
  </span>
);

const splitSizeDisplay = (value) => {
  const text = String(value ?? "—").trim();
  const match = text.match(/^(.*?)(\s*\([^()]+\))$/);
  if (!match) return { main: text, sub: "" };
  return { main: match[1].trim(), sub: match[2].trim() };
};

// ─── Component ──────────────────────────────────────────────────────────────
const OrderManagement = () => {
  const navigate = useNavigate();

  // ── Filters ──────────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm]   = useState("");
  const [typeFilter, setTypeFilter]   = useState("");
  const [sortByFields, setSortByFields] = useState("createdAt");
  const [direction, setDirection]     = useState("DESC");

  // ── Pagination ────────────────────────────────────────────────────────────
  const [page, setPage]               = useState(0);
  const PAGE_SIZE                     = 20;

  // ── Data ──────────────────────────────────────────────────────────────────
  const [orders, setOrders]           = useState([]);
  const [totalPages, setTotalPages]   = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading]         = useState(false);
  const [orderJobOverrides, setOrderJobOverrides] = useState(() => readOrderJobOverrides());

  // ── Dialogs ───────────────────────────────────────────────────────────────
  const [viewOrder, setViewOrder]     = useState(null);
  const [editOrder, setEditOrder]     = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [moveToJobWorkRow, setMoveToJobWorkRow] = useState(null);
  const [selectedMoveType, setSelectedMoveType] = useState("OUTSIDE");

  // ── Parties + Dispatch ────────────────────────────────────────────────────
  const [parties, setParties]         = useState([]);
  const [partySearch, setPartySearch] = useState("");
  const [partyDropOpen, setPartyDropOpen] = useState(false);
  const partyDropRef                  = useRef(null);
  const [dispatchDialog, setDispatchDialog] = useState(null);
  const [savingEdit, setSavingEdit]   = useState(false);

  // ── Debounce search ───────────────────────────────────────────────────────
  const searchDebounceRef = useRef(null);
  const debouncedSearch   = useRef("");

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
  const triggerFetch = useCallback(
    async (search = debouncedSearch.current, pageNum = page) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search)        params.set("search", search);
        if (sortByFields)  params.set("sortByFields", sortByFields);
        if (direction)     params.set("direction", direction);
        // When searching, fetch a larger batch so client-side filter has enough data
        const fetchSize = search ? 200 : PAGE_SIZE;
        params.set("page", search ? 0 : pageNum);
        params.set("size", fetchSize);

        const res = await axiosInstance.get(`/api/v1/parties/orders?${params.toString()}`);
        const data = res.data;
        setOrders(flattenOrders(data.data || []));
        setTotalPages(search ? 1 : (data.totalPages ?? 0));
        setTotalElements(data.totalElements ?? 0);
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to load orders");
      } finally {
        setLoading(false);
      }
    },
    [page, sortByFields, direction]
  );

  // re-fetch when page / sort / direction changes
  useEffect(() => {
    triggerFetch(debouncedSearch.current, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sortByFields, direction]);

  useEffect(() => {
    const reloadOverrides = () => setOrderJobOverrides(readOrderJobOverrides());
    window.addEventListener("focus", reloadOverrides);
    window.addEventListener("storage", reloadOverrides);
    return () => {
      window.removeEventListener("focus", reloadOverrides);
      window.removeEventListener("storage", reloadOverrides);
    };
  }, []);

  useEffect(() => {
    partyApi.getAllParties()
      .then((res) => setParties(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!partyDropOpen) return;
    const handler = (e) => {
      if (partyDropRef.current && !partyDropRef.current.contains(e.target)) {
        setPartyDropOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [partyDropOpen]);

  // ── Client-side search + type filter ──────────────────────────────────────
  const filteredOrders = useMemo(() => {
    let result = orders;

    // Client-side search across key fields (supplements server-side search)
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      result = result.filter((order) =>
        (order.partyName || "").toLowerCase().includes(q) ||
        (order.size || "").toLowerCase().includes(q) ||
        (order.plating || "").toLowerCase().includes(q) ||
        String(order.qtyPc ?? "").includes(q) ||
        String(order.qtyKg ?? "").includes(q) ||
        normalizeJobWorkLabel(order.jobWork).toLowerCase().includes(q) ||
        (order.date || "").includes(q) ||
        String(order.id ?? "").includes(q)
      );
    }

    // Type filter
    if (typeFilter) {
      result = result.filter((order) =>
        normalizeJobWorkLabel(order.jobWork).toLowerCase().includes(typeFilter.toLowerCase())
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
    [filteredOrders]
  );

  const totalPice = useMemo(
    () => filteredOrders.reduce((sum, o) => sum + toNumeric(o.qtyPc), 0),
    [filteredOrders]
  );


  // ── Actions ───────────────────────────────────────────────────────────────
  const requestDelete = (order) => setDeleteTarget(order);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await axiosInstance.delete(
        `/api/v1/parties/${deleteTarget.partyId}/orders/${deleteTarget.orderId}`
      );
      toast.success("Order deleted");
      triggerFetch(debouncedSearch.current, page);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete order");
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

  const toggleJobUpdateStatus = (row) => {
    if (!row) return;
    const override = getRowOverride(row);
    const currentJobWork = normalizeJobWorkLabel(override?.jobWork ?? row.jobWork);
    setMoveToJobWorkRow(row);
    setSelectedMoveType(currentJobWork === "In-House" ? "INHOUSE" : "OUTSIDE");
  };

  const handleMoveToJobWorkSave = () => {
    if (!moveToJobWorkRow) return;
    const selectedLabel = selectedMoveType === "INHOUSE" ? "In-House" : "Outside";
    navigate("/job-work/move", {
      state: {
        mode: "create",
        prefillOrderRow: { ...moveToJobWorkRow, jobWork: selectedLabel },
      },
    });
    setMoveToJobWorkRow(null);
  };

  const normalizeToISO = (dateStr) => {
    if (!dateStr || dateStr === "—") return null;
    if (dateStr.includes("/")) {
      const [d, m, y] = dateStr.split("/");
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
        `/api/v1/parties/${editOrder.partyId}/orders/${editOrder.orderId}`
      );
      const fullOrder = orderRes.data;
      const updatedItems = (fullOrder.orderItems || []).map((item) => {
        const isTarget = item.id === editOrder.id;
        return {
          itemSizeId:    item.itemSize?.id,
          plating:       isTarget ? editOrder.plating        : item.plating,
          qtyPc:         isTarget ? (parseFloat(editOrder.qtyPc)       || 0) : item.qtyPc,
          qtyKg:         isTarget ? (parseFloat(editOrder.qtyKg)       || null) : item.qtyKg,
          pcPerBox:      isTarget ? (parseFloat(editOrder.boxPc)       || null) : item.pcPerBox,
          boxPerCartoon: isTarget ? (parseFloat(editOrder.cartoon)     || null) : item.boxPerCartoon,
          pcPerCartoon:  isTarget ? (parseFloat(editOrder.pcCartoon)   || null) : item.pcPerCartoon,
          stickerQty:    isTarget ? (parseFloat(editOrder.stickerQty)  || null) : item.stickerQty,
          pendingPc:     isTarget ? (parseFloat(editOrder.pendingPc)   || null) : item.pendingPc,
          jobActionDone: isTarget ? editOrder.platingStatus : item.jobActionDone,
          platingType:   item.platingType,
        };
      });

      await axiosInstance.put(
        `/api/v1/parties/${editOrder.partyId}/orders/${editOrder.orderId}`,
        { orderDate: normalizeToISO(editOrder.date) || fullOrder.orderDate, items: updatedItems }
      );

      // Update local state + overrides
      const existingOverride = getRowOverride(editOrder);
      const currentJobWork = normalizeJobWorkLabel(existingOverride?.jobWork ?? editOrder.jobWork);
      const overridePatch = { platingStatus: editOrder.platingStatus, jobWorkNo: editOrder.jobWorkNo };
      if (currentJobWork !== "—") overridePatch.jobWork = currentJobWork;

      setOrders((prev) => prev.map((row) => (row.id === editOrder.id ? { ...row, ...editOrder } : row)));
      setOrderJobOverrides(upsertOrderJobOverride({ orderItemId: editOrder.id, orderId: editOrder.orderId, ...overridePatch }));
      setEditOrder(null);
      toast.success("Order updated");
      triggerFetch(debouncedSearch.current, page);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update order");
    } finally {
      setSavingEdit(false);
    }
  };

  // ── Dispatch ──────────────────────────────────────────────────────────────
  const fetchDispatches = async (row) => {
    const res = await orderDispatchApi.getAllOrderDispatches(row.partyId, row.orderId, row.id, undefined, 0, 100);
    return res.data?.data || [];
  };

  const openDispatchDialog = async (row) => {
    setDispatchDialog({ row, dispatches: [], loading: true, newDate: "", newPcs: "", saving: false });
    try {
      const dispatches = await fetchDispatches(row);
      setDispatchDialog((prev) => ({ ...prev, dispatches, loading: false }));
    } catch {
      toast.error("Failed to load dispatches");
      setDispatchDialog(null);
    }
  };

  const handleAddDispatch = async () => {
    const { row, newDate, newPcs } = dispatchDialog;
    if (!newDate) { toast.error("Enter dispatch date"); return; }
    if (!newPcs || parseFloat(newPcs) <= 0) { toast.error("Enter valid pcs"); return; }
    setDispatchDialog((prev) => ({ ...prev, saving: true }));
    try {
      await orderDispatchApi.createOrderDispatch(row.partyId, row.orderId, row.id, {
        dispatchDate: newDate,
        dispatchPcs: parseFloat(newPcs),
      });
      const dispatches = await fetchDispatches(row);
      setDispatchDialog((prev) => ({ ...prev, dispatches, newDate: "", newPcs: "", saving: false }));
      toast.success("Dispatch added");
      triggerFetch(debouncedSearch.current, page);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to add dispatch");
      setDispatchDialog((prev) => ({ ...prev, saving: false }));
    }
  };

  const handleDeleteDispatch = async (dispatchId) => {
    const { row } = dispatchDialog;
    try {
      await orderDispatchApi.deleteOrderDispatch(row.partyId, row.orderId, row.id, dispatchId);
      setDispatchDialog((prev) => ({ ...prev, dispatches: prev.dispatches.filter((d) => d.id !== dispatchId) }));
      toast.success("Dispatch deleted");
      triggerFetch(debouncedSearch.current, page);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete dispatch");
    }
  };

  const renderMoveOption = (value, label) => {
    const isSelected = selectedMoveType === value;

    return (
      <button
        type="button"
        onClick={() => setSelectedMoveType(value)}
        aria-pressed={isSelected}
        className={`w-full rounded-md border px-4 py-3 text-sm transition flex items-center gap-3 text-left ${
          isSelected
            ? "border-gray-900 bg-gray-50 text-gray-900 ring-1 ring-gray-900"
            : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50"
        }`}
      >
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full border ${
            isSelected ? "border-gray-900" : "border-gray-400"
          }`}
        >
          {isSelected ? <span className="h-2.5 w-2.5 rounded-full bg-black" /> : null}
        </span>
        <span className="font-medium">{label}</span>
      </button>
    );
  };

  const convertToDateInput = (dateString) => {
    if (!dateString || dateString === "—") return "";
    const parts = dateString.split("/");
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return dateString;
  };

  const convertFromDateInput = (val) => {
    if (!val) return "";
    const [year, month, day] = val.split("-");
    return `${day}/${month}/${year}`;
  };

  const renderOrderDetails = (order, isEditable = false) => {
    const fields = [
      ["Party Name", "partyName"],
      ["Date", "date"],
      ["Size", "size"],
      ["Plating", "plating"],
      ["Qty Pc", "qtyPc"],
      ["Qty Kg", "qtyKg"],
      ["Pc/Box", "boxPc"],
      ["Cartoon", "cartoon"],
      ["Pc/Cartoon", "pcCartoon"],
      ["Sticker Qty.", "stickerQty"],
      ["Dispatch Date", "dispatchDate"],
      ["Dispatch Pcs", "dispatchPcs"],
      ["Pending Pc", "pendingPc"],
      ["Job Action", "jobWork"],
      ["Job Work No", "jobWorkNo"],
      ["Plating Status", "platingStatus"],
    ];

    const filteredParties = parties.filter((p) =>
      (p.name || "").toLowerCase().includes(partySearch.toLowerCase())
    );

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map(([label, key]) => (
          <div key={key}>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            {isEditable ? (
              key === "partyName" ? (
                <div ref={partyDropRef} className="relative">
                  <div
                    className={`flex items-center border rounded-md overflow-hidden transition ${partyDropOpen ? "ring-1 ring-gray-400 border-gray-400" : "border-gray-300"}`}
                  >
                    <input
                      type="text"
                      value={partyDropOpen ? partySearch : (editOrder?.partyName ?? "")}
                      onChange={(e) => setPartySearch(e.target.value)}
                      onClick={() => { setPartySearch(""); setPartyDropOpen(true); }}
                      placeholder="Search party…"
                      className="flex-1 px-3 py-2 text-sm focus:outline-none bg-transparent"
                    />
                    <ChevronDown
                      onClick={() => { setPartySearch(""); setPartyDropOpen((o) => !o); }}
                      className={`w-4 h-4 text-gray-400 mr-2 cursor-pointer transition-transform ${partyDropOpen ? "rotate-180" : ""}`}
                    />
                  </div>
                  {partyDropOpen && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {filteredParties.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-400">No parties found</div>
                      ) : (
                        filteredParties.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setEditOrder((prev) => ({ ...prev, partyName: p.name, partyId: p.id }));
                              setPartyDropOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${editOrder?.partyId === p.id ? "font-medium" : "text-gray-700"}`}
                          >
                            {p.name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : key === "platingStatus" ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditOrder((prev) => ({ ...prev, [key]: !prev[key] }))}
                    className={`w-10 h-6 rounded-full relative transition ${editOrder?.[key] ? "bg-emerald-600" : "bg-gray-300"}`}
                  >
                    <span className={`w-4 h-4 bg-white rounded-full absolute top-1 transition ${editOrder?.[key] ? "right-1" : "left-1"}`} />
                  </button>
                  <span className="text-sm text-gray-600">{editOrder?.[key] ? "Enabled" : "Disabled"}</span>
                </div>
              ) : key === "date" ? (
                <input
                  type="date"
                  value={convertToDateInput(editOrder?.[key] ?? "")}
                  onChange={(e) => setEditOrder((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              ) : key === "dispatchDate" || key === "dispatchPcs" ? (
                <p className="text-sm text-gray-500 border border-gray-200 rounded-md px-3 py-2 bg-gray-50 italic">
                  Manage via Dispatch button in table
                </p>
              ) : (
                <input
                  value={editOrder?.[key] ?? ""}
                  onChange={(e) => setEditOrder((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              )
            ) : key === "platingStatus" ? (
              <p className="text-sm text-gray-800 border border-gray-200 rounded-md px-3 py-2 bg-gray-50">
                {order?.[key] ? "Enabled" : "Disabled"}
              </p>
            ) : (
              <p className="text-sm text-gray-800 border border-gray-200 rounded-md px-3 py-2 bg-gray-50">
                {order?.[key] ?? "—"}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SidebarLayout>
      <div className="mx-auto">
        <div className="mb-8">
          <PageHeader
            title="Order Management"
            description="Simplifying Order Processing from Start to Delivery"
            action={
              <div className="flex items-center gap-2">
                
                <PrimaryActionButton onClick={() => navigate("/job-work")} icon={BriefcaseBusiness}>
                  All Job Works
                </PrimaryActionButton>
                <PrimaryActionButton onClick={() => navigate("/order/select")} icon={Plus}>
                  Add Order
                </PrimaryActionButton>
              </div>
            }
          />
        </div>

        <div className="grid grid-cols-3 gap-6 mb-8">
          <StatsCard label="Total Order" value={totalFilteredOrders} className="h-[90px] rounded-md" />
          <StatsCard label="Total Pending Order" value={totalPendingOrders} className="h-[90px] rounded-md" />
          <StatsCard label="Total Pice" value={totalPice} className="h-[90px] rounded-md" />
        </div>

        <SearchFilter
          searchQuery={searchTerm}
          setSearchQuery={handleSearchChange}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          filterOptions={["Type", "Outside", "In-House", "Job Work"]}
          filterPlaceholder="Type"
        />

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="max-h-[520px] overflow-auto scrollbar-thin">
            <table className="w-max min-w-full table-auto">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th rowSpan={2} className="px-3 py-3 text-center text-sm font-[550] border-r border-gray-200 whitespace-normal">{renderHeaderLabel("Party Name", "party-name")}</th>
                  <th rowSpan={2} className="px-3 py-3 text-center text-sm font-[550] border-r border-gray-200 whitespace-normal">
                    <button
                      type="button"
                      onClick={() => {
                        setSortByFields("createdAt");
                        setDirection((d) => d === "ASC" ? "DESC" : "ASC");
                        setPage(0);
                      }}
                      className="flex items-center gap-1 mx-auto"
                    >
                      {renderHeaderLabel("Date", "date")}
                      <ChevronDown className={`w-3 h-3 transition-transform ${sortByFields === "createdAt" && direction === "ASC" ? "rotate-180" : ""}`} />
                    </button>
                  </th>
                  <th rowSpan={2} className="px-3 py-3 text-center text-sm font-[550] border-r border-gray-200 whitespace-normal">{renderHeaderLabel("Size", "size")}</th>
                  <th rowSpan={2} className="px-3 py-3 text-center text-sm font-[550] border-r border-gray-200 whitespace-normal">{renderHeaderLabel("Plating", "plating")}</th>
                  <th rowSpan={2} className="px-3 py-3 text-center text-sm font-[550] border-r border-gray-200 whitespace-normal">{renderHeaderLabel("Qty. Pc", "qty-pc")}</th>
                  <th rowSpan={2} className="px-3 py-3 text-center text-sm font-[550] border-r border-gray-200 whitespace-normal">{renderHeaderLabel("Qty Kg", "qty-kg")}</th>
                  <th rowSpan={2} className="px-3 py-3 text-center text-sm font-[550] border-r border-gray-200 whitespace-normal">{renderHeaderLabel("Pc/Box.", "pc-box")}</th>
                  <th rowSpan={2} className="px-3 py-3 text-center text-sm font-[550] border-r border-gray-200 whitespace-normal">{renderHeaderLabel("Box/Cartoon.", "box-cartoon")}</th>
                  <th rowSpan={2} className="px-3 py-3 text-center text-sm font-[550] border-r border-gray-200 whitespace-normal">{renderHeaderLabel("Pc/Cartoon", "pc-cartoon")}</th>
                  <th rowSpan={2} className="px-3 py-3 text-center text-sm font-[550] border-r border-gray-200 whitespace-normal">{renderHeaderLabel("Sticker Qty.", "sticker-qty")}</th>
                  <th colSpan={2} className="px-3 py-2 text-center text-sm font-[550] border-r border-gray-200 whitespace-normal">{renderHeaderLabel("Dispatch", "dispatch")}</th>
                  <th rowSpan={2} className="px-3 py-3 text-center text-sm font-[550] border-r border-gray-200 whitespace-normal">{renderHeaderLabel("Pending Pc.", "pending-pc")}</th>
                  <th rowSpan={2} className="px-3 py-3 text-center text-sm font-[550] border-r border-gray-200 whitespace-normal">{renderHeaderLabel("Job Update", "job-update")}</th>
                  <th rowSpan={2} className="px-3 py-3 text-center text-sm font-[550] whitespace-normal">{renderHeaderLabel("Action", "action")}</th>
                </tr>
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th className="px-3 py-2 text-center text-sm font-[550] border-r border-gray-200 whitespace-normal">{renderHeaderLabel("Date", "dispatch-date")}</th>
                  <th className="px-3 py-2 text-center text-sm font-[550] border-r border-gray-200 whitespace-normal">{renderHeaderLabel("Pcs.", "dispatch-pcs")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={15}>
                      <Loader text="Loading orders..." />
                    </td>
                  </tr>
                ) : groupedFilteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="px-3 py-6 text-sm text-center text-gray-500">
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
                      const effectiveStickerQty = row.stickerQty ?? "—";
                      const effectiveJobWorkKey = String(effectiveJobWork || "").toLowerCase().replace(/[\s-]/g, "");

                      return (
                        <tr
                          key={row.id}
                          className={`border-b border-gray-200 ${
                            row._updatedAt && row._createdAt && row._updatedAt !== row._createdAt
                              ? "bg-yellow-50"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          {showGroupedColumns && (
                            <td rowSpan={groupRowSpan} className="px-3 py-4 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap align-top">
                              <div className="inline-flex items-center gap-1 cursor-pointer">
                                <span>{row.partyName}</span>
                                {isMultiItem ? (
                                  <button
                                    type="button"
                                    onClick={() => toggleGroupExpand(groupKey)}
                                    aria-label={isExpanded ? "Collapse" : "Expand"}
                                  >
                                    <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          )}
                          {showGroupedColumns && (
                            <td rowSpan={groupRowSpan} className="px-3 py-4 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap align-top">
                              {row.date}
                            </td>
                          )}
                          <td className="px-3 py-4 text-sm text-gray-700 border-r border-gray-200 whitespace-normal">
                            <span className="inline-flex flex-col leading-tight">
                              <span className="whitespace-nowrap">{sizeParts.main}</span>
                              {sizeParts.sub ? <span className="whitespace-nowrap text-center">{sizeParts.sub}</span> : null}
                            </span>
                          </td>
                          <td className="px-3 py-4 text-sm text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">{row.plating}</td>
                          <td className="px-3 py-4 text-sm text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">{row.qtyPc}</td>
                          <td className="px-3 py-4 text-sm text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">{row.qtyKg}</td>
                          <td className="px-3 py-4 text-sm text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">{row.boxPc}</td>
                          <td className="px-3 py-4 text-sm text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">{row.cartoon}</td>
                          <td className="px-3 py-4 text-sm text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">{row.pcCartoon}</td>
                          <td className="px-3 py-4 text-sm text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">{effectiveStickerQty}</td>
                          <td className="px-3 py-4 text-sm text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => openDispatchDialog(row)}
                              className="inline-flex flex-col items-center gap-0.5 group"
                              title="Manage dispatches"
                            >
                              <Truck className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-700" />
                              <span className="text-xs text-gray-600">
                                {row.dispatchDate ?? <span className="text-gray-400">+ Add</span>}
                              </span>
                            </button>
                          </td>
                          <td className="px-3 py-4 text-sm text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">
                            <button type="button" onClick={() => openDispatchDialog(row)} className="hover:text-gray-900">
                              {row.dispatchPcs != null
                                ? <span className="font-medium">{row.dispatchPcs} <span className="text-gray-400 text-xs">/ {row.qtyPc}</span></span>
                                : <span className="text-gray-400 text-xs">+ Add</span>}
                            </button>
                          </td>
                          <td className="px-3 py-4 text-sm text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">{row.pendingPc}</td>
                        
                          <td className="px-3 py-4 border-r border-gray-200 whitespace-nowrap">
                            <div className="flex flex-col items-center gap-1.5">
                              <span className="text-xs text-gray-700">{effectiveJobWorkNo}</span>
                              <button
                                type="button"
                                onClick={() => toggleJobUpdateStatus(row)}
                                aria-label="Open job update"
                                title="Open job update"
                                className={`w-7 h-4 rounded-full relative inline-flex items-center ${effectivePlatingStatus ? "bg-emerald-600" : "bg-gray-300"} cursor-pointer`}
                              >
                                <span className={`w-3 h-3 bg-white rounded-full absolute top-0.5 ${effectivePlatingStatus ? "right-0.5" : "left-0.5"}`} />
                              </button>
                              <span
                                className={`text-xs ${
                                  effectiveJobWorkKey === "outside"
                                    ? "text-red-500"
                                    : effectiveJobWorkKey === "inhouse"
                                      ? "text-emerald-700"
                                      : "text-gray-700"
                                }`}
                              >
                                {effectiveJobWork}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button type="button" onClick={() => navigate("/job-work", { state: { orderRow: row } })} aria-label="Open job work">
                                <BriefcaseBusiness className="w-4 h-4 text-gray-500 cursor-pointer" />
                              </button>
                              <button type="button" onClick={() => setEditOrder({ ...row })} aria-label="Edit order">
                                <SquarePen className="w-4 h-4 text-gray-500 cursor-pointer" />
                              </button>
                              <button type="button" onClick={() => setViewOrder(row)} aria-label="View order">
                                <Eye className="w-4 h-4 text-gray-500 cursor-pointer" />
                              </button>
                              <button type="button" onClick={() => requestDelete(row)} aria-label="Delete order">
                                <Trash2 className="w-4 h-4 text-red-500 cursor-pointer" />
                              </button>
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
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Page {page + 1} of {totalPages} &nbsp;·&nbsp; {totalElements} orders
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* View dialog */}
      {viewOrder && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl border border-gray-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-lg font-medium text-gray-900">View Order</h2>
              <button type="button" onClick={() => setViewOrder(null)} aria-label="Close">
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">{renderOrderDetails(viewOrder, false)}</div>
          </div>
        </div>
      )}

      {/* Edit dialog */}
      {editOrder && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl border border-gray-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-lg font-medium text-gray-900">Edit Order</h2>
              <button type="button" onClick={() => setEditOrder(null)} aria-label="Close">
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">{renderOrderDetails(editOrder, true)}</div>
            <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-center gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={handleEditOrderSave}
                disabled={savingEdit}
                className="px-8 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm disabled:opacity-60"
              >
                {savingEdit ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setEditOrder(null)}
                disabled={savingEdit}
                className="px-8 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Order"
        message={`Are you sure you want to delete this order for ${deleteTarget?.partyName || "this party"}?`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      {/* Dispatch dialog */}
      {dispatchDialog && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-lg border border-gray-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
              <div>
                <h2 className="text-base font-medium text-gray-900">Dispatch</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {dispatchDialog.row.partyName} · {dispatchDialog.row.size} · Qty {dispatchDialog.row.qtyPc} pc
                </p>
              </div>
              <button type="button" onClick={() => setDispatchDialog(null)}>
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Existing dispatches */}
              {dispatchDialog.loading ? (
                <Loader text="Loading dispatches…" />
              ) : dispatchDialog.dispatches.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No dispatches yet</p>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">#</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Pcs</th>
                        <th className="px-4 py-2 w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {dispatchDialog.dispatches.map((d, i) => (
                        <tr key={d.id} className="border-b border-gray-100 last:border-0">
                          <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                          <td className="px-4 py-2 text-gray-700">{d.dispatchDate}</td>
                          <td className="px-4 py-2 text-right text-gray-700 font-medium">{d.dispatchPcs}</td>
                          <td className="px-4 py-2">
                            <button type="button" onClick={() => handleDeleteDispatch(d.id)} className="text-red-400 hover:text-red-600">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 border-t border-gray-200">
                        <td colSpan={2} className="px-4 py-2 text-xs font-medium text-gray-500">Total dispatched</td>
                        <td className="px-4 py-2 text-right text-sm font-semibold text-gray-800">
                          {dispatchDialog.dispatches.reduce((s, d) => s + (parseFloat(d.dispatchPcs) || 0), 0)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Add new dispatch */}
              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Add Dispatch</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Date</label>
                    <input
                      type="date"
                      value={dispatchDialog.newDate}
                      onChange={(e) => setDispatchDialog((prev) => ({ ...prev, newDate: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Pcs</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 50"
                      value={dispatchDialog.newPcs}
                      onChange={(e) => setDispatchDialog((prev) => ({ ...prev, newPcs: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddDispatch}
                  disabled={dispatchDialog.saving}
                  className="w-full py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 transition disabled:opacity-60"
                >
                  {dispatchDialog.saving ? "Adding…" : "Add Dispatch"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {moveToJobWorkRow && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-5">
            <h3 className="text-base font-medium text-gray-900 text-center">Move to Job Work</h3>
            <div className="mt-5 space-y-3">
              {renderMoveOption("OUTSIDE", "Outside Job Work")}
              {renderMoveOption("INHOUSE", "In-House Job Work")}
            </div>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleMoveToJobWorkSave}
                className="px-8 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition text-sm"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setMoveToJobWorkRow(null)}
                className="px-8 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
};

export default OrderManagement;
