import React, { useEffect, useMemo, useState } from "react";
import { Plus, SquarePen, Eye, Trash2, ChevronDown, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SidebarLayout from "../../components/SidebarLayout";
import SearchFilter from "../../components/SearchFilter";
import StatsCard from "../../components/StatsCard";
import PageHeader from "../../components/PageHeader";
import PrimaryActionButton from "../../components/PrimaryActionButton";
import ConfirmationDialog from "../../components/ConfirmationDialog";
import toast from "react-hot-toast";

const ORDER_STORAGE_KEY = "orderManagement.orders.v1";

const DEFAULT_ORDERS = [
  {
    id: 1,
    partyName: "Eneron Tech",
    date: "25/02/2025",
    size: "6 X 1.1/8 X 5/32 - 3,600",
    qtyPc: "300",
    qtyKg: "135 Kg",
    boxPc: "135",
    cartoon: "13",
    pcCartoon: "23",
    stickerQty: "300",
    dispatchDate: "25/02/2025",
    dispatchPcs: "298",
    pendingPc: "02",
    plating: "S.S + 16",
    platingStatus: true,
    jobWork: "Job Work",
    jobWorkNo: "JW001",
  },
  {
    id: 2,
    partyName: "Eneron Tech",
    date: "25/02/2025",
    size: "6 X 1.1/8 X 5/32 - 3,600",
    qtyPc: "300",
    qtyKg: "135 Kg",
    boxPc: "135",
    cartoon: "13",
    pcCartoon: "23",
    stickerQty: "300",
    dispatchDate: "25/02/2025",
    dispatchPcs: "298",
    pendingPc: "02",
    plating: "S.S + 16",
    platingStatus: true,
    jobWork: "Job Work",
    jobWorkNo: "JW002",
  },
  {
    id: 3,
    partyName: "Eneron Tech",
    date: "25/02/2025",
    size: "6 X 1.1/8 X 5/32 - 3,600",
    qtyPc: "300",
    qtyKg: "135 Kg",
    boxPc: "135",
    cartoon: "13",
    pcCartoon: "23",
    stickerQty: "300",
    dispatchDate: "25/02/2025",
    dispatchPcs: "298",
    pendingPc: "02",
    plating: "S.S + 16",
    platingStatus: true,
    jobWork: "Job Work",
    jobWorkNo: "JW003",
  },
  {
    id: 4,
    partyName: "Eneron Tech",
    date: "25/02/2025",
    size: "6 X 1.1/8 X 5/32 - 3,600",
    qtyPc: "300",
    qtyKg: "135 Kg",
    boxPc: "135",
    cartoon: "13",
    pcCartoon: "23",
    stickerQty: "300",
    dispatchDate: "25/02/2025",
    dispatchPcs: "298",
    pendingPc: "02",
    plating: "S.S + 16",
    platingStatus: true,
    jobWork: "Job Work",
    jobWorkNo: "JW004",
  },
  {
    id: 5,
    partyName: "Eneron Tech",
    date: "25/02/2025",
    size: "6 X 1.1/8 X 5/32 - 3,600",
    qtyPc: "300",
    qtyKg: "135 Kg",
    boxPc: "135",
    cartoon: "13",
    pcCartoon: "23",
    stickerQty: "300",
    dispatchDate: "25/02/2025",
    dispatchPcs: "298",
    pendingPc: "02",
    plating: "S.S + 16",
    platingStatus: true,
    jobWork: "Job Work",
    jobWorkNo: "JW005",
  },
];

const getStoredOrders = () => {
  try {
    const raw = localStorage.getItem(ORDER_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    // Ensure all orders have the new fields
    return Array.isArray(parsed)
      ? parsed.map((order) => ({
          ...order,
          pcCartoon: order.pcCartoon || "23",
          stickerQty: order.stickerQty || "300",
          jobWorkNo: order.jobWorkNo || "JW-" + order.id,
        }))
      : [];
  } catch (error) {
    return [];
  }
};

const toNumeric = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const OrderManagement = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [orders, setOrders] = useState([]);
  const [viewOrder, setViewOrder] = useState(null);
  const [editOrder, setEditOrder] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    const storedOrders = getStoredOrders();
    if (storedOrders.length > 0) {
      setOrders(storedOrders);
      return;
    }
    setOrders(DEFAULT_ORDERS);
  }, []);

  const persistOrders = (nextOrders) => {
    setOrders(nextOrders);
    localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(nextOrders));
  };

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesSearch =
        !normalizedSearch ||
        order.partyName.toLowerCase().includes(normalizedSearch) ||
        order.size.toLowerCase().includes(normalizedSearch);
      const matchesType =
        !typeFilter ||
        order.jobWork.toLowerCase().includes(typeFilter.toLowerCase());
      return matchesSearch && matchesType;
    });
  }, [orders, searchTerm, typeFilter]);

  const groupedFilteredOrders = useMemo(() => {
    const groups = new Map();
    filteredOrders.forEach((order) => {
      const groupKey = order.orderId ?? order.id;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey).push(order);
    });
    return Array.from(groups.values());
  }, [filteredOrders]);

  const totalPendingOrders = useMemo(() => {
    return orders.filter((order) => toNumeric(order.pendingPc) > 0).length;
  }, [orders]);

  const requestDelete = (order) => {
    setDeleteTarget(order);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const nextOrders = orders.filter((order) => order.id !== deleteTarget.id);
    persistOrders(nextOrders);
    setDeleteTarget(null);
    toast.success("Order deleted");
  };

  const handleEditSave = () => {
    if (!editOrder?.partyName?.trim()) {
      toast.error("Party name is required");
      return;
    }
    if (!editOrder?.size?.trim()) {
      toast.error("Size is required");
      return;
    }

    const nextOrders = orders.map((order) => {
      if (order.id === editOrder.id) {
        return {
          ...editOrder,
          // Ensure all fields are preserved
          pcCartoon: editOrder.pcCartoon || order.pcCartoon || "-",
          stickerQty: editOrder.stickerQty || order.stickerQty || "-",
          jobWorkNo: editOrder.jobWorkNo || order.jobWorkNo || "-",
        };
      }
      return order;
    });
    persistOrders(nextOrders);
    setEditOrder(null);
    toast.success("Order updated");
  };

  const togglePlatingStatus = (orderId) => {
    const nextOrders = orders.map((order) =>
      order.id === orderId
        ? {
            ...order,
            platingStatus: !order.platingStatus,
          }
        : order,
    );
    persistOrders(nextOrders);
  };

  const toggleGroupExpand = (groupKey) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const convertToDateInput = (dateString) => {
    if (!dateString) return "";
    const parts = dateString.split("/");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateString;
  };

  const convertFromDateInput = (dateInputValue) => {
    if (!dateInputValue) return "";
    const [year, month, day] = dateInputValue.split("-");
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
                    onClick={() =>
                      setEditOrder((prev) => ({
                        ...prev,
                        [key]: !prev[key],
                      }))
                    }
                    className={`w-10 h-6 rounded-full relative transition ${
                      editOrder?.[key] ? "bg-emerald-600" : "bg-gray-300"
                    }`}
                    aria-label="Toggle plating status"
                  >
                    <span
                      className={`w-4 h-4 bg-white rounded-full absolute top-1 transition ${
                        editOrder?.[key] ? "right-1" : "left-1"
                      }`}
                    />
                  </button>
                  <span className="text-sm text-gray-600">
                    {editOrder?.[key] ? "Enabled" : "Disabled"}
                  </span>
                </div>
              ) : key === "date" || key === "dispatchDate" ? (
                <input
                  type="date"
                  value={convertToDateInput(editOrder?.[key] ?? "")}
                  onChange={(e) =>
                    setEditOrder((prev) => ({
                      ...prev,
                      [key]: convertFromDateInput(e.target.value),
                    }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              ) : (
                <input
                  value={editOrder?.[key] ?? ""}
                  onChange={(e) =>
                    setEditOrder((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              )
            ) : key === "platingStatus" ? (
              <p className="text-sm text-gray-800 border border-gray-200 rounded-md px-3 py-2 bg-gray-50">
                {order?.[key] ? "Enabled" : "Disabled"}
              </p>
            ) : (
              <p className="text-sm text-gray-800 border border-gray-200 rounded-md px-3 py-2 bg-gray-50">
                {order?.[key] || "-"}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <SidebarLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <PageHeader
            title="Order Management"
            description="Simplifying Order Processing from Start to Delivery"
            action={
              <PrimaryActionButton
                onClick={() => navigate("/order/select")}
                icon={Plus}
              >
                Add Order
              </PrimaryActionButton>
            }
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <StatsCard
            label="Total Order"
            value={orders.length}
            className="h-[90px] rounded-md"
          />
          <StatsCard
            label="Total Pending Order"
            value={totalPendingOrders}
            className="h-[90px] rounded-md"
          />
        </div>

        <SearchFilter
          searchQuery={searchTerm}
          setSearchQuery={setSearchTerm}
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
                  <th
                    rowSpan={2}
                    className="px-3 py-4 text-center text-sm font-semibold border-r border-gray-200 whitespace-nowrap"
                  >
                    Party Name
                  </th>
                  <th
                    rowSpan={2}
                    className="px-3 py-4 text-center text-sm font-semibold border-r border-gray-200 whitespace-nowrap"
                  >
                    Date
                  </th>
                  <th
                    rowSpan={2}
                    className="px-3 py-4 text-center text-sm font-semibold border-r border-gray-200 whitespace-nowrap"
                  >
                    Size
                  </th>
                  <th
                    rowSpan={2}
                    className="px-3 py-4 text-center text-sm font-semibold border-r border-gray-200 whitespace-nowrap"
                  >
                    Plating
                  </th>

                  <th
                    rowSpan={2}
                    className="px-3 py-4 text-center text-sm font-semibold border-r border-gray-200 whitespace-nowrap"
                  >
                    Qty. Pc
                  </th>
                  <th
                    rowSpan={2}
                    className="px-3 py-4 text-center text-sm font-semibold border-r border-gray-200 whitespace-nowrap"
                  >
                    Qty Kg
                  </th>
                  <th
                    rowSpan={2}
                    className="px-3 py-4 text-center text-sm font-semibold border-r border-gray-200 whitespace-nowrap"
                  >
                    Pc/Box.
                  </th>
                  <th
                    rowSpan={2}
                    className="px-3 py-4 text-center text-sm font-semibold border-r border-gray-200 whitespace-nowrap"
                  >
                    Box/Cartoon.
                  </th>
                  <th
                    rowSpan={2}
                    className="px-3 py-4 text-center text-sm font-semibold border-r border-gray-200 whitespace-nowrap"
                  >
                    Pc/Cartoon
                  </th>
                   <th
                    rowSpan={2}
                    className="px-3 py-4 text-center text-sm font-semibold border-r border-gray-200 whitespace-nowrap"
                  >
                    Sticker Qty.
                  </th>
                  <th
                    colSpan={2}
                    className="px-3 py-2 text-center text-sm font-semibold border-r border-gray-200 whitespace-nowrap"
                  >
                    Dispatch
                  </th>
                  <th
                    rowSpan={2}
                    className="px-3 py-4 text-center text-sm font-semibold border-r border-gray-200 whitespace-nowrap"
                  >
                    Pending Pc.
                  </th>
                  <th
                    rowSpan={2}
                    className="px-3 py-4 text-center text-sm font-semibold border-r border-gray-200 whitespace-nowrap"
                  >
                    Job Action
                  </th>
                  <th
                    rowSpan={2}
                    className="px-3 py-4 text-center text-sm font-semibold border-r border-gray-200 whitespace-nowrap"
                  >
                    Plating
                  </th>
                    <th
                    rowSpan={2}
                    className="px-3 py-4 text-center text-sm font-semibold border-r border-gray-200 whitespace-nowrap"
                  >
                    Job Work No
                  </th>
                    <th
                    rowSpan={2}
                    className="px-3 py-4 text-center text-sm font-semibold border-r border-gray-200 whitespace-nowrap"
                  >
                  Job Action
                  </th>
                  <th
                    rowSpan={2}
                    className="px-3 py-4 text-center text-sm font-semibold whitespace-nowrap"
                  >
                    Action
                  </th>
                </tr>
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th className="px-3 py-2 text-center text-sm font-semibold border-r border-gray-200 whitespace-nowrap">
                    Date
                  </th>
                  <th className="px-3 py-2 text-center text-sm font-semibold border-r border-gray-200 whitespace-nowrap">
                    Pcs.
                  </th>
                </tr>
              </thead>
              <tbody>
                {groupedFilteredOrders.flatMap((group) => {
                  const groupKey = group[0]?.orderId ?? group[0]?.id;
                  const isExpanded = Boolean(expandedGroups[groupKey]);
                  const visibleRows =
                    group.length > 1 && !isExpanded ? [group[0]] : group;

                  return visibleRows.map((row, rowIndex) => {
                    const showGroupedColumns = rowIndex === 0;
                    const groupRowSpan = visibleRows.length;
                    const isMultiItem = group.length > 1;


                    return (
                      <tr
                        key={row.id}
                        className="border-b border-gray-200 hover:bg-gray-50"
                      >
                        {showGroupedColumns && (
                          <td
                            rowSpan={groupRowSpan}
                            className="px-3 py-4 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap align-top"
                          >
                            <div className="inline-flex items-center gap-1 cursor-pointer">
                              <span>{row.partyName}</span>
                              {isMultiItem ? (
                                <button
                                  type="button"
                                  onClick={() => toggleGroupExpand(groupKey)}
                                  className="inline-flex items-center cursor-pointer"
                                  aria-label={
                                    isExpanded
                                      ? "Collapse items"
                                      : "Expand items"
                                  }
                                >
                                  <ChevronDown
                                    className={`w-3.5 h-3.5 text-gray-500 transition-transform ${
                                      isExpanded ? "rotate-180" : ""
                                    }`}
                                  />
                                </button>
                              ) : null}
                            </div>
                          </td>
                        )}
                        {showGroupedColumns && (
                          <td
                            rowSpan={groupRowSpan}
                            className="px-3 py-4 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap align-top"
                          >
                            {row.date}
                          </td>
                        )}
                        <td className="px-3 py-4 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {row.size}
                        </td>
                          <td className="px-3 py-4 text-sm text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {row.plating}
                        </td>
                        <td className="px-3 py-4 text-sm text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {row.qtyPc}
                        </td>
                        <td className="px-3 py-4 text-sm text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {row.qtyKg}
                        </td>
                        <td className="px-3 py-4 text-sm text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {row.boxPc}
                        </td>
                        <td className="px-3 py-4 text-sm text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {row.cartoon}
                        </td>
                        <td className="px-3 py-4 text-sm text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {row.pcCartoon}
                        </td>
                        <td className="px-3 py-4 text-sm text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {row.stickerQty}
                        </td>
                        <td className="px-3 py-4 text-sm text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {row.dispatchDate}
                        </td>
                        <td className="px-3 py-4 text-sm text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {row.dispatchPcs}
                        </td>
                        <td className="px-3 py-4 text-sm text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {row.pendingPc}
                        </td>
                        <td className="px-3 py-4 text-sm text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          <span className="text-red-500">{row.jobWork}</span>
                        </td>
                        <td className="px-3 py-4 border-r border-gray-200">
                          <div className="flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => togglePlatingStatus(row.id)}
                              className={`w-7 h-4 rounded-full relative transition ${
                                row.platingStatus
                                  ? "bg-emerald-600"
                                  : "bg-gray-300"
                              }`}
                              aria-label="Toggle plating status"
                            >
                              <span
                                className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition ${
                                  row.platingStatus ? "right-0.5" : "left-0.5"
                                }`}
                              />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-sm text-center border-r border-gray-200 whitespace-nowrap">
                          {row.jobWorkNo}
                        </td>
                          <td className="px-3 py-4 text-sm text-center border-r border-gray-200 whitespace-nowrap">
                          <button
                              type="button"
                              aria-label="View order"
                            >
                              <Eye className="w-4 h-4 text-gray-500 cursor-pointer" />
                            </button>
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setEditOrder({
                                  ...row,
                                  pcCartoon: row.pcCartoon || "23",
                                  stickerQty: row.stickerQty || "300",
                                  jobWorkNo: row.jobWorkNo || "JW-" + row.id,
                                })
                              }
                              aria-label="Edit order"
                            >
                              <SquarePen className="w-4 h-4 text-gray-500 cursor-pointer" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setViewOrder(row)}
                              aria-label="View order"
                            >
                              <Eye className="w-4 h-4 text-gray-500 cursor-pointer" />
                            </button>
                            <button
                              type="button"
                              onClick={() => requestDelete(row)}
                              aria-label="Delete order"
                            >
                              <Trash2 className="w-4 h-4 text-red-500 cursor-pointer" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })}
                {groupedFilteredOrders.length === 0 && (
                  <tr>
                    <td
                      colSpan={18}
                      className="px-3 py-6 text-sm text-center text-gray-500"
                    >
                      No orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {viewOrder && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl border border-gray-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-lg font-medium text-gray-900">View Order</h2>
              <button
                type="button"
                onClick={() => setViewOrder(null)}
                aria-label="Close"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">{renderOrderDetails(viewOrder, false)}</div>
          </div>
        </div>
      )}
      {editOrder && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl border border-gray-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-lg font-medium text-gray-900">Edit Order</h2>
              <button
                type="button"
                onClick={() => setEditOrder(null)}
                aria-label="Close"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">{renderOrderDetails(editOrder, true)}</div>
            <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-center gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={handleEditSave}
                className="px-8 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditOrder(null)}
                className="px-8 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
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
        message={`Are you sure you want to delete ${deleteTarget?.partyName || "this order"}?`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </SidebarLayout>
  );
};

export default OrderManagement;
