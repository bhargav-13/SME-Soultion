import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, SquarePen, Eye, Trash2, ChevronDown, X, ChevronLeft, ChevronRight, BriefcaseBusiness } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SidebarLayout from "../../components/SidebarLayout";
import SearchFilter from "../../components/SearchFilter";
import StatsCard from "../../components/StatsCard";
import PageHeader from "../../components/PageHeader";
import PrimaryActionButton from "../../components/PrimaryActionButton";
import ConfirmationDialog from "../../components/ConfirmationDialog";
import JobWorkPopup from "../../components/JobWork/JobWorkPopup";
import toast from "react-hot-toast";
import { axiosInstance } from "../../services/apiService";

const ORDER_JOB_OVERRIDES_KEY = "orderJobWorkOverrides";

const readOrderJobOverrides = () => {
  try {
    const raw = localStorage.getItem(ORDER_JOB_OVERRIDES_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
};

const writeOrderJobOverrides = (value) => {
  try {
    localStorage.setItem(ORDER_JOB_OVERRIDES_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage write failures
  }
};

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
        dispatchDate: item.dispatch?.dispatchDate  ?? "—",
        dispatchPcs:  item.dispatch?.dispatchPcs   ?? "—",
        pendingPc:    item.pendingPc    ?? "—",
        jobWork:      item.platingType  ?? "—",
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
  const [jobWorkPopupRow, setJobWorkPopupRow] = useState(null);

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
        params.set("page", pageNum);
        params.set("size", PAGE_SIZE);

        const res = await axiosInstance.get(`/api/v1/parties/orders?${params.toString()}`);
        const data = res.data;
        setOrders(flattenOrders(data.data || []));
        setTotalPages(data.totalPages ?? 0);
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

  // ── Client-side type filter (API has no platingType filter param) ─────────
  const filteredOrders = useMemo(() => {
    if (!typeFilter) return orders;
    return orders.filter((order) =>
      (order.jobWork || "").toLowerCase().includes(typeFilter.toLowerCase())
    );
  }, [orders, typeFilter]);

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

  const totalPendingOrders = useMemo(
    () => orders.filter((o) => toNumeric(o.pendingPc) > 0).length,
    [orders]
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
    const currentStatus = override?.platingStatus ?? row.platingStatus ?? false;

    // Once job work is done (ON), it cannot be disabled
    if (currentStatus) return;

    // Toggling ON → open the job work popup
    setJobWorkPopupRow(row);
  };

  const handleJobWorkSaved = (savedFormData, apiResponse) => {
    if (jobWorkPopupRow) {
      const row = jobWorkPopupRow;
      // Optimistically update the row with data from the popup + API response
      const jobWorkNo = String(new Date().getDate()).padStart(2, "0");
      const jobWorkType = savedFormData?.jobWorkType || "JOB_WORK";
      const stickerQty = savedFormData?.stickerQty || row.stickerQty;

      setOrders((prev) =>
        prev.map((order) =>
          order.id === row.id
            ? {
                ...order,
                platingStatus: true,
                jobWork: jobWorkType === "INHOUSE" ? "IN_HOUSE" : jobWorkType,
                jobWorkNo: jobWorkNo,
                stickerQty: stickerQty || order.stickerQty,
              }
            : order
        )
      );
      setOrderJobOverrides((prev) => {
        const next = { ...prev };
        const payload = {
          platingStatus: true,
          jobWork: jobWorkType === "INHOUSE" ? "IN_HOUSE" : jobWorkType,
          jobWorkNo: String(jobWorkNo),
        };
        if (row.id) next[`item-${row.id}`] = { ...(next[`item-${row.id}`] || {}), ...payload };
        if (row.orderId) next[`order-${row.orderId}`] = { ...(next[`order-${row.orderId}`] || {}), ...payload };
        writeOrderJobOverrides(next);
        return next;
      });
    }
    // Refresh data from server to get full backend state
    triggerFetch(debouncedSearch.current, page);
  };

  const handlePlatingMove = (row, jobWorkValue = row?.jobWork) => {
    const platingTypeValue = String(jobWorkValue || "").trim().toLowerCase().replace(/[\s-]/g, "");
    if (["outside", "inhouse", "", "-", "—"].includes(platingTypeValue) || jobWorkValue === "—") {
      navigate("/job-work/move", {
        state: { mode: "create", prefillOrderRow: { ...row, jobWork: jobWorkValue } },
      });
    }
  };

  const isPlatingMovable = (jobWorkValue) => {
    const platingTypeValue = String(jobWorkValue || "").trim().toLowerCase().replace(/[\s-]/g, "");
    return ["outside", "inhouse", "", "-", "—"].includes(platingTypeValue) || jobWorkValue === "—";
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

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map(([label, key]) => (
          <div key={key}>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            {isEditable ? (
              key === "platingStatus" ? (
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
              ) : key === "date" || key === "dispatchDate" ? (
                <input
                  type="date"
                  value={convertToDateInput(editOrder?.[key] ?? "")}
                  onChange={(e) => setEditOrder((prev) => ({ ...prev, [key]: convertFromDateInput(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
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
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <PageHeader
            title="Order Management"
            description="Simplifying Order Processing from Start to Delivery"
            action={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/job-work")}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition"
                >
                  <BriefcaseBusiness className="w-4 h-4" />
                  All Job Works
                </button>
                <PrimaryActionButton onClick={() => navigate("/order/select")} icon={Plus}>
                  Add Order
                </PrimaryActionButton>
              </div>
            }
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <StatsCard label="Total Order" value={totalElements} className="h-[90px] rounded-md" />
          <StatsCard label="Total Pending Order" value={totalPendingOrders} className="h-[90px] rounded-md" />
        </div>

        <SearchFilter
          searchQuery={searchTerm}
          setSearchQuery={handleSearchChange}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          filterOptions={["Type", "Job Work"]}
          filterPlaceholder="Type"
        />

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="max-h-[520px] overflow-auto scrollbar-thin">
            <table className="min-w-[1500px] w-full">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th rowSpan={2} className="px-3 py-4 text-center text-sm font-[550] border-r border-gray-200 whitespace-nowrap">Party Name</th>
                  <th rowSpan={2} className="px-3 py-4 text-center text-sm font-[550] border-r border-gray-200 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => {
                        setSortByFields("createdAt");
                        setDirection((d) => d === "ASC" ? "DESC" : "ASC");
                        setPage(0);
                      }}
                      className="flex items-center gap-1 mx-auto"
                    >
                      Date
                      <ChevronDown className={`w-3 h-3 transition-transform ${sortByFields === "createdAt" && direction === "ASC" ? "rotate-180" : ""}`} />
                    </button>
                  </th>
                  <th rowSpan={2} className="px-3 py-4 text-center text-sm font-[550] border-r border-gray-200 whitespace-nowrap">Size</th>
                  <th rowSpan={2} className="px-3 py-4 text-center text-sm font-[550] border-r border-gray-200 whitespace-nowrap">Plating</th>
                  <th rowSpan={2} className="px-3 py-4 text-center text-sm font-[550] border-r border-gray-200 whitespace-nowrap">Qty. Pc</th>
                  <th rowSpan={2} className="px-3 py-4 text-center text-sm font-[550] border-r border-gray-200 whitespace-nowrap">Qty Kg</th>
                  <th rowSpan={2} className="px-3 py-4 text-center text-sm font-[550] border-r border-gray-200 whitespace-nowrap">Pc/Box.</th>
                  <th rowSpan={2} className="px-3 py-4 text-center text-sm font-[550] border-r border-gray-200 whitespace-nowrap">Box/Cartoon.</th>
                  <th rowSpan={2} className="px-3 py-4 text-center text-sm font-[550] border-r border-gray-200 whitespace-nowrap">Pc/Cartoon</th>
                  <th rowSpan={2} className="px-3 py-4 text-center text-sm font-[550] border-r border-gray-200 whitespace-nowrap">Sticker Qty.</th>
                  <th colSpan={2} className="px-3 py-2 text-center text-sm font-[550] border-r border-gray-200 whitespace-nowrap">Dispatch</th>
                  <th rowSpan={2} className="px-3 py-4 text-center text-sm font-[550] border-r border-gray-200 whitespace-nowrap">Pending Pc.</th>
                  <th rowSpan={2} className="px-3 py-4 text-center text-sm font-[550] border-r border-gray-200 whitespace-nowrap">Job Update</th>
                  <th rowSpan={2} className="px-3 py-4 text-center text-sm font-[550] border-r border-gray-200 whitespace-nowrap">Plating</th>
                  <th rowSpan={2} className="px-3 py-4 text-center text-sm font-[550] border-r border-gray-200 whitespace-nowrap">Job Work No</th>
                  <th rowSpan={2} className="px-3 py-4 text-center text-sm font-[550] border-r border-gray-200 whitespace-nowrap">Job Action</th>
                  <th rowSpan={2} className="px-3 py-4 text-center text-sm font-[550] whitespace-nowrap">Action</th>
                </tr>
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th className="px-3 py-2 text-center text-sm font-[550] border-r border-gray-200 whitespace-nowrap">Date</th>
                  <th className="px-3 py-2 text-center text-sm font-[550] border-r border-gray-200 whitespace-nowrap">Pcs.</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={18} className="px-3 py-8 text-sm text-center text-gray-400">
                      Loading orders…
                    </td>
                  </tr>
                ) : groupedFilteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={18} className="px-3 py-6 text-sm text-center text-gray-500">
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
                      const rowOverride = getRowOverride(row);
                      const effectivePlatingStatus = rowOverride?.platingStatus ?? row.platingStatus;
                      const effectiveJobWork = rowOverride?.jobWork ?? row.jobWork;
                      const effectiveJobWorkNo = rowOverride?.jobWorkNo ?? row.jobWorkNo;
                      const effectiveStickerQty = row.stickerQty ?? "—";

                      return (
                        <tr key={row.id} className="border-b border-gray-200 hover:bg-gray-50">
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
                          <td className="px-3 py-4 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">{row.size}</td>
                          <td className="px-3 py-4 text-sm text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">{row.plating}</td>
                          <td className="px-3 py-4 text-sm text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">{row.qtyPc}</td>
                          <td className="px-3 py-4 text-sm text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">{row.qtyKg}</td>
                          <td className="px-3 py-4 text-sm text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">{row.boxPc}</td>
                          <td className="px-3 py-4 text-sm text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">{row.cartoon}</td>
                          <td className="px-3 py-4 text-sm text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">{row.pcCartoon}</td>
                          <td className="px-3 py-4 text-sm text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">{effectiveStickerQty}</td>
                          <td className="px-3 py-4 text-sm text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">{row.dispatchDate}</td>
                          <td className="px-3 py-4 text-sm text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">{row.dispatchPcs}</td>
                          <td className="px-3 py-4 text-sm text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">{row.pendingPc}</td>
                        
                          <td className="px-3 py-4 border-r border-gray-200">
                            <div className="flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => toggleJobUpdateStatus(row)}
                                aria-label={effectivePlatingStatus ? "Job work done (locked)" : "Enable job update"}
                                title={effectivePlatingStatus ? "Job work is done and cannot be undone" : "Click to mark job work as done"}
                                className={`w-7 h-4 rounded-full relative inline-flex items-center ${effectivePlatingStatus ? "bg-emerald-600 cursor-not-allowed" : "bg-gray-300 cursor-pointer"}`}
                              >
                                <span className={`w-3 h-3 bg-white rounded-full absolute top-0.5 ${effectivePlatingStatus ? "right-0.5" : "left-0.5"}`} />
                              </button>
                            </div>
                          </td>
                            <td className="px-3 py-4 text-sm text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handlePlatingMove(row, effectiveJobWork)}
                              disabled={!isPlatingMovable(effectiveJobWork)}
                              className={`${
                                String(effectiveJobWork || "").toLowerCase().replace(/[\s-]/g, "") === "outside"
                                  ? "text-red-500"
                                  : String(effectiveJobWork || "").toLowerCase().replace(/[\s-]/g, "") === "inhouse"
                                    ? "text-emerald-700"
                                    : "text-gray-700"
                              } ${isPlatingMovable(effectiveJobWork) ? "cursor-pointer" : "cursor-default"}`}
                            >
                              {effectiveJobWork}
                            </button>
                          </td>
                          <td className="px-3 py-4 text-sm text-center border-r border-gray-200 whitespace-nowrap">{effectiveJobWorkNo}</td>
                          <td className="px-3 py-4 text-sm text-center border-r border-gray-200 whitespace-nowrap">
                            <button type="button" aria-label="Open job work" onClick={() => navigate("/job-work", { state: { orderRow: row } })}>
                              <Eye className="w-4 h-4 text-gray-700 cursor-pointer" />
                            </button>
                          </td>
                          <td className="px-3 py-4">
                            <div className="flex items-center justify-center gap-2">
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
                onClick={() => { setEditOrder(null); toast.success("Changes noted (read-only view)"); }}
                className="px-8 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm"
              >
                Close
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

      <JobWorkPopup
        isOpen={Boolean(jobWorkPopupRow)}
        orderRow={jobWorkPopupRow}
        onClose={() => setJobWorkPopupRow(null)}
        onSaved={handleJobWorkSaved}
      />
    </SidebarLayout>
  );
};

export default OrderManagement;
