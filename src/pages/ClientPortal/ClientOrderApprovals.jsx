import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, X as XIcon, Package, ArrowLeft, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import SidebarLayout from "../../components/SidebarLayout";
import PageHeader from "../../components/PageHeader";
import StatsCard from "../../components/StatsCard";
import ConfirmationDialog from "../../components/ConfirmationDialog";
import OrderStatusBadge from "../../components/ClientPortal/OrderStatusBadge";
import { clientPortalAdminApi } from "../../services/apiService";

const PAGE_SIZE = 20;

const TABS = [
  { key: "ALL", label: "All" },
  { key: "PENDING_APPROVAL", label: "Pending Approval" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
];

const ClientOrderApprovals = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const usernameFilter = searchParams.get("username") || "";
  const partyNameFilter = searchParams.get("partyName") || "";

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [tab, setTab] = useState("ALL");
  const [expandedId, setExpandedId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    id: null,
    action: null,
  });

  const loadRequests = async (pageNum = 0) => {
    try {
      setLoading(true);
      const response = await clientPortalAdminApi.getAllOrderRequests(
        pageNum,
        PAGE_SIZE,
        undefined,
        undefined,
        undefined,
        tab === "ALL" ? undefined : tab,
        partyNameFilter || undefined
      );
      const result = response.data;
      let data = result?.data || [];
      if (usernameFilter) {
        data = data.filter((r) => r.username === usernameFilter);
      }
      setRequests(data);
      setTotalPages(result?.totalPages || 0);
      setTotalElements(result?.totalElements || 0);
    } catch (error) {
      console.error("Error fetching order requests:", error);
      toast.error(error.response?.data?.message || "Failed to fetch order requests");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingCount = async () => {
    try {
      const response = await clientPortalAdminApi.getAllOrderRequests(
        0,
        1,
        undefined,
        undefined,
        undefined,
        "PENDING_APPROVAL",
        partyNameFilter || undefined
      );
      setPendingCount(response.data?.totalElements || 0);
    } catch (error) {
      console.error("Error fetching pending order request count:", error);
    }
  };

  useEffect(() => {
    setPage(0);
  }, [tab, usernameFilter, partyNameFilter]);

  useEffect(() => {
    loadRequests(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, tab, usernameFilter, partyNameFilter]);

  useEffect(() => {
    loadPendingCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usernameFilter, partyNameFilter]);

  const filteredRequests = useMemo(() => requests, [requests]);

  const clearClientFilter = () => setSearchParams({});

  const handleAction = (id, action) => {
    setConfirmDialog({ isOpen: true, id, action });
  };

  const handleConfirm = async () => {
    const { id, action } = confirmDialog;
    const newStatus = action === "approve" ? "APPROVED" : "REJECTED";
    try {
      await clientPortalAdminApi.updateOrderRequestStatus(id, { status: newStatus });
      await loadRequests(page);
      await loadPendingCount();
      toast.success(action === "approve" ? "Order request approved" : "Order request rejected");
    } catch (error) {
      console.error("Error updating order request status:", error);
      toast.error(error.response?.data?.message || "Failed to update order request");
    } finally {
      setConfirmDialog({ isOpen: false, id: null, action: null });
    }
  };

  return (
    <SidebarLayout>
      <div className="mx-auto">
        <div className="mb-4">
          <Link
            to="/client-portal"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Client Portal
          </Link>
        </div>
        <div className="mb-8">
          <PageHeader
            title="Order Approvals"
            description="Review and approve order requests submitted by clients."
          />
        </div>

        {usernameFilter && (
          <div className="mb-6 flex items-center justify-between bg-gray-100 border border-gray-200 rounded-lg px-4 py-2.5">
            <p className="text-sm text-gray-700">
              Showing requests for{" "}
              <span className="font-semibold">{partyNameFilter || usernameFilter}</span>{" "}
              <span className="text-gray-500">({usernameFilter})</span>
            </p>
            <button
              onClick={clearClientFilter}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition"
            >
              <XCircle className="w-4 h-4" />
              Clear filter
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <StatsCard label="Total Requests" value={totalElements} />
          <StatsCard label="Pending Approval" value={pendingCount} />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                tab === t.key
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Requests list */}
        {loading ? (
          <div className="text-center text-gray-500 py-10">Loading...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-10 text-center text-gray-500">
            <Package className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            No order requests found
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((req) => (
              <div key={req.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Request #{req.id} {req.partyName ? `· ${req.partyName}` : ""}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Client: <span className="font-medium text-gray-700">{req.username || "-"}</span>
                      {" · "}
                      {req.orderDate ? new Date(req.orderDate).toLocaleDateString() : "-"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <OrderStatusBadge status={req.status} />
                    <button
                      onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                      className="text-sm font-medium text-gray-600 hover:text-gray-900 transition"
                    >
                      {expandedId === req.id ? "Hide Items" : "View Items"}
                    </button>
                    {req.status === "PENDING_APPROVAL" && (
                      <>
                        <button
                          onClick={() => handleAction(req.id, "approve")}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition"
                        >
                          <Check className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction(req.id, "reject")}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 text-sm font-medium rounded-lg hover:bg-red-100 transition"
                        >
                          <XIcon className="w-4 h-4" />
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {expandedId === req.id && (
                  <table className="w-full border-t border-gray-100">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-6 py-2.5 text-center text-xs font-[550] text-black">Item</th>
                        <th className="px-6 py-2.5 text-center text-xs font-[550] text-black">Size (Inch)</th>
                        <th className="px-6 py-2.5 text-center text-xs font-[550] text-black">Size (mm)</th>
                        <th className="px-6 py-2.5 text-center text-xs font-[550] text-black">Plating</th>
                        <th className="px-6 py-2.5 text-center text-xs font-[550] text-black">Qty (Pc)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(req.items || []).map((item) => (
                        <tr key={item.id} className="border-b border-gray-100 last:border-0">
                          <td className="px-6 py-2.5 text-sm text-gray-700 text-center">{item.itemName || "-"}</td>
                          <td className="px-6 py-2.5 text-sm text-gray-700 text-center">{item.sizeInInch || "-"}</td>
                          <td className="px-6 py-2.5 text-sm text-gray-700 text-center">{item.sizeInMm || "-"}</td>
                          <td className="px-6 py-2.5 text-sm text-gray-700 text-center">{item.plating || "-"}</td>
                          <td className="px-6 py-2.5 text-sm text-gray-700 text-center">{item.qtyPc ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-gray-500">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        <ConfirmationDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.action === "approve" ? "Approve Order Request" : "Reject Order Request"}
          message={
            confirmDialog.action === "approve"
              ? "This will mark the order request as approved and notify the client. Continue?"
              : "This will reject the order request. The client will be notified. Continue?"
          }
          confirmText={confirmDialog.action === "approve" ? "Approve" : "Reject"}
          cancelText="Cancel"
          onConfirm={handleConfirm}
          onCancel={() => setConfirmDialog({ isOpen: false, id: null, action: null })}
          isDangerous={confirmDialog.action === "reject"}
        />
      </div>
    </SidebarLayout>
  );
};

export default ClientOrderApprovals;
