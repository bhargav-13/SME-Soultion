import React, { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import SidebarLayout from "../../components/SidebarLayout";
import PageHeader from "../../components/PageHeader";
import OrderStatusBadge from "../../components/ClientPortal/OrderStatusBadge";
import { clientPortalClientApi, clientPortalInvoicesApi } from "../../services/apiService";
import { deriveErpOrderStatus, ORDER_STATUS } from "../../utils/clientShop";
import toast from "react-hot-toast";

const PAGE_SIZE = 10;
const ORDER_REQUESTS_PAGE_SIZE = 100;
const INVOICES_PAGE_SIZE = 10;

const TABS = [
  { key: "ALL", label: "All" },
  ...Object.entries(ORDER_STATUS).map(([key, cfg]) => ({ key, label: cfg.label })),
];

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [orderRequests, setOrderRequests] = useState([]);
  const [tab, setTab] = useState("ALL");

  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [invoicePage, setInvoicePage] = useState(0);
  const [invoiceTotalPages, setInvoiceTotalPages] = useState(0);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);

  const fetchOrders = async (pageNum = 0) => {
    try {
      setLoading(true);
      const response = await clientPortalClientApi.getMyOrders(pageNum, PAGE_SIZE);
      const result = response.data;
      setOrders(result?.data || []);
      setTotalPages(result?.totalPages || 0);
      setTotalElements(result?.totalElements || 0);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error(error.response?.data?.message || "Failed to fetch orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderRequests = async () => {
    try {
      const response = await clientPortalClientApi.getMyOrderRequests(0, ORDER_REQUESTS_PAGE_SIZE);
      setOrderRequests(response.data?.data || []);
    } catch (error) {
      console.error("Error fetching order requests:", error);
      toast.error(error.response?.data?.message || "Failed to fetch order requests");
      setOrderRequests([]);
    }
  };

  const fetchInvoices = async (pageNum = 0) => {
    try {
      setInvoicesLoading(true);
      const response = await clientPortalInvoicesApi.getMyInvoices(pageNum, INVOICES_PAGE_SIZE);
      const result = response.data;
      setInvoices(result?.data || []);
      setInvoiceTotalPages(result?.totalPages || 0);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error(error.response?.data?.message || "Failed to fetch invoices");
      setInvoices([]);
    } finally {
      setInvoicesLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(page);
  }, [page]);

  useEffect(() => {
    fetchOrderRequests();
  }, []);

  useEffect(() => {
    fetchInvoices(invoicePage);
  }, [invoicePage]);

  // Combine ERP orders with the client's own order requests into a single display list.
  const combinedOrders = useMemo(() => {
    const ordersById = new Map(orders.map((order) => [order.id, order]));
    const linkedOrderIds = new Set(
      orderRequests.map((req) => req.orderId).filter((id) => id != null)
    );

    // Once a request is approved and an order is created in Order Management
    // (req.orderId set), keep showing the request card under its familiar
    // "Request N" label, but reflect the live job-work/dispatch status of
    // the order it spawned instead of the static "Approved" status.
    const requests = orderRequests.map((req) => {
      const linkedOrder = req.orderId != null ? ordersById.get(req.orderId) : null;
      const derived = linkedOrder ? deriveErpOrderStatus(linkedOrder) : null;
      return {
        key: `req-${req.id}`,
        id: req.id,
        label: `Request ${req.id}`,
        orderDate: req.orderDate,
        status: derived ? derived.status : req.status,
        dispatchedPc: derived?.dispatchedPc,
        totalPc: derived?.totalPc,
        items: req.items || [],
        isRequest: true,
      };
    });

    // Orders already represented above via their linked request card don't
    // need a separate "Order #X" card.
    const erpOrders = orders
      .filter((order) => !linkedOrderIds.has(order.id))
      .map((order) => {
        const derived = deriveErpOrderStatus(order);
        return {
          key: `erp-${order.id}`,
          id: order.id,
          label: `Order #${order.id}`,
          orderDate: order.orderDate,
          status: derived.status,
          dispatchedPc: derived.dispatchedPc,
          totalPc: derived.totalPc,
          items: order.items || [],
          isRequest: false,
        };
      });

    const combined = [...requests, ...erpOrders];
    if (tab === "ALL") return combined;
    return combined.filter((o) => o.status === tab);
  }, [orders, orderRequests, tab]);

  const handleDownloadInvoice = async (invoice) => {
    try {
      setDownloadingInvoiceId(invoice.id);
      const response = await clientPortalInvoicesApi.getMyInvoicePdf(invoice.id, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${invoice.invoiceNo || `invoice-${invoice.id}`}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading invoice:", error);
      toast.error(error.response?.data?.message || "Failed to download invoice");
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  return (
    <SidebarLayout>
      <div className="mx-auto">
        <div className="mb-8">
          <PageHeader
            title="My Orders"
            description={`You have ${totalElements + orderRequests.length} order${
              totalElements + orderRequests.length === 1 ? "" : "s"
            }.`}
          />
        </div>

        {/* Status filter tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                tab === t.key
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-10">Loading...</div>
        ) : combinedOrders.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-10 text-center text-gray-500">
            No orders found
          </div>
        ) : (
          <div className="space-y-6">
            {combinedOrders.map((order) => (
              <div key={order.key} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-gray-100 border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-gray-900">{order.label}</p>
                    <OrderStatusBadge
                      status={order.status}
                      dispatchedPc={order.dispatchedPc}
                      totalPc={order.totalPc}
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-500">
                      {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : "-"}
                    </p>
                  </div>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {order.isRequest && (
                        <th className="px-6 py-3 text-center text-sm font-[550] text-black">
                          Item
                        </th>
                      )}
                      <th className="px-6 py-3 text-center text-sm font-[550] text-black">
                        Size (Inch)
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-[550] text-black">
                        Size (mm)
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-[550] text-black">
                        Plating
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-[550] text-black">
                        Qty (Pc)
                      </th>
                      {!order.isRequest && (
                        <>
                          <th className="px-6 py-3 text-center text-sm font-[550] text-black">
                            Qty (Kg)
                          </th>
                          <th className="px-6 py-3 text-center text-sm font-[550] text-black">
                            Pending (Pc)
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {(order.items || []).map((item) => (
                      <tr key={item.id} className="border-b border-gray-100 last:border-0">
                        {order.isRequest && (
                          <td className="px-6 py-3 text-sm text-gray-700 text-center">
                            {item.itemName || "-"}
                          </td>
                        )}
                        <td className="px-6 py-3 text-sm text-gray-700 text-center">
                          {item.sizeInInch || "-"}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-700 text-center">
                          {item.sizeInMm || "-"}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-700 text-center">
                          {item.plating || "-"}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-700 text-center">
                          {item.qtyPc ?? "-"}
                        </td>
                        {!order.isRequest && (
                          <>
                            <td className="px-6 py-3 text-sm text-gray-700 text-center">
                              {item.qtyKg ?? "-"}
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-700 text-center">
                              {item.pendingPc ?? "-"}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
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

        {/* Invoices */}
        <div className="mt-12">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">My Invoices</h2>
            <p className="text-sm text-gray-500">Download invoices issued to your account.</p>
          </div>

          {invoicesLoading ? (
            <div className="text-center text-gray-500 py-10">Loading...</div>
          ) : invoices.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-10 text-center text-gray-500">
              No invoices found
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left text-sm font-[550] text-black">Invoice No</th>
                    <th className="px-6 py-3 text-center text-sm font-[550] text-black">Date</th>
                    <th className="px-6 py-3 text-center text-sm font-[550] text-black">Type</th>
                    <th className="px-6 py-3 text-center text-sm font-[550] text-black">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-6 py-3 text-sm text-gray-700">{invoice.invoiceNo || "-"}</td>
                      <td className="px-6 py-3 text-sm text-gray-700 text-center">
                        {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-700 text-center">
                        {invoice.invoiceType || "-"}
                      </td>
                      <td className="px-6 py-3 text-sm text-center">
                        <button
                          onClick={() => handleDownloadInvoice(invoice)}
                          disabled={downloadingInvoiceId === invoice.id}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition disabled:opacity-50"
                          title="Download Invoice"
                        >
                          <Download className="w-4 h-4" />
                          {downloadingInvoiceId === invoice.id ? "Downloading..." : "Download"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {invoiceTotalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-500">
                Page {invoicePage + 1} of {invoiceTotalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setInvoicePage((p) => Math.max(0, p - 1))}
                  disabled={invoicePage === 0}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setInvoicePage((p) => Math.min(invoiceTotalPages - 1, p + 1))}
                  disabled={invoicePage >= invoiceTotalPages - 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
};

export default MyOrders;
