import React, { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import SidebarLayout from "../../components/SidebarLayout";
import PageHeader from "../../components/PageHeader";
import { clientPortalClientApi, clientPortalInvoicesApi } from "../../services/apiService";
import {
  ORDER_STATUS,
  ORDER_STATUS_TABS,
  STAGE_BUCKETS,
  formatStageQty,
  hasQtyAt,
  stageFieldFor,
  stageQty,
  sumStage,
} from "../../utils/clientShop";
import toast from "react-hot-toast";

const PAGE_SIZE = 10;
const ORDER_REQUESTS_PAGE_SIZE = 100;
const INVOICES_PAGE_SIZE = 10;

const TABS = [
  { key: "ALL", label: "All" },
  ...ORDER_STATUS_TABS.map((key) => ({ key, label: ORDER_STATUS[key].label })),
];

/** Tabs that select whole requests by their approval state rather than by quantity. */
const REQUEST_STATE_TABS = new Set(["PENDING_APPROVAL", "REJECTED"]);

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : "-");

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
  const allOrders = useMemo(() => {
    const ordersById = new Map(orders.map((order) => [order.id, order]));
    const linkedOrderIds = new Set(
      orderRequests.map((req) => req.orderId).filter((id) => id != null)
    );

    // Once a request is approved an order exists behind it (req.orderId). Keep the familiar
    // "Request N" label, but show the ORDER's lines from then on — those are the ones carrying the
    // live stage split. Until approval the request has no order, so its own frozen lines are all
    // there is and it can only appear under Pending Approval / Rejected.
    const requests = orderRequests.map((req) => {
      const linkedOrder = req.orderId != null ? ordersById.get(req.orderId) : null;
      return {
        key: `req-${req.id}`,
        label: `Request ${req.id}`,
        orderDate: req.orderDate,
        requestStatus: req.status,
        items: (linkedOrder ? linkedOrder.items : req.items) || [],
        hasStages: Boolean(linkedOrder),
      };
    });

    // Orders already represented above via their linked request card don't need a second card.
    const erpOrders = orders
      .filter((order) => !linkedOrderIds.has(order.id))
      .map((order) => ({
        key: `erp-${order.id}`,
        label: `Order #${order.id}`,
        orderDate: order.orderDate,
        requestStatus: "APPROVED",
        items: order.items || [],
        hasStages: true,
      }));

    return [...requests, ...erpOrders];
  }, [orders, orderRequests]);

  /**
   * What the selected tab shows.
   *
   * The four middle tabs are quantity buckets, so an order is included when ANY of its lines has
   * quantity at that stage, and only those lines are listed — the same order legitimately shows
   * under In Plating and Ready to Dispatch at once, each time with its own share.
   */
  const visibleOrders = useMemo(() => {
    if (tab === "ALL") return allOrders;

    if (REQUEST_STATE_TABS.has(tab)) {
      return allOrders.filter((order) => order.requestStatus === tab);
    }

    const field = stageFieldFor(tab);
    if (!field) return allOrders;

    return allOrders
      .filter((order) => order.hasStages)
      .map((order) => ({ ...order, items: order.items.filter((item) => hasQtyAt(item, field)) }))
      .filter((order) => order.items.length > 0);
  }, [allOrders, tab]);

  const stageField = stageFieldFor(tab);

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

  const orderCount = totalElements + orderRequests.length;

  return (
    <SidebarLayout>
      <div className="mx-auto">
        <div className="mb-8">
          <PageHeader
            title="My Orders"
            description={`You have ${orderCount} order${orderCount === 1 ? "" : "s"}.`}
          />
        </div>

        {/* Stage filter tabs */}
        <div className="flex flex-wrap gap-2 mb-4 border-b border-gray-200">
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

        {stageField && (
          <p className="text-sm text-gray-500 mb-6">
            Showing the quantity of each order that is currently{" "}
            <span className="font-medium text-gray-700">{ORDER_STATUS[tab].label.toLowerCase()}</span>. An
            order can appear under more than one tab while different parts of it are at different
            stages.
          </p>
        )}

        {loading ? (
          <div className="text-center text-gray-500 py-10">Loading...</div>
        ) : visibleOrders.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-10 text-center text-gray-500">
            No orders found
          </div>
        ) : (
          <div className="space-y-6">
            {visibleOrders.map((order) => (
              <OrderCard
                key={order.key}
                order={order}
                stageField={stageField}
                stageLabel={stageField ? ORDER_STATUS[tab].label : null}
              />
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
                        {formatDate(invoice.invoiceDate)}
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

/**
 * One order. On a stage tab it lists only the lines with quantity at that stage and shows that one
 * figure; on All / Pending Approval / Rejected it lists every line with the full split, so the
 * client can see where the whole order stands at a glance.
 */
const OrderCard = ({ order, stageField, stageLabel }) => {
  const cardTotal = stageField ? sumStage(order.items, stageField) : null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-100 border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-sm font-semibold text-gray-900">{order.label}</p>
          {stageField ? (
            <span className="px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap bg-gray-900 text-white">
              {stageLabel} · {formatStageQty(cardTotal)}
            </span>
          ) : (
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                ORDER_STATUS[order.requestStatus]?.className || "bg-gray-100 text-gray-700"
              }`}
            >
              {ORDER_STATUS[order.requestStatus]?.label || order.requestStatus}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">{formatDate(order.orderDate)}</p>
      </div>

      <div className="overflow-x-auto">
        {stageField ? (
          <StageTable items={order.items} field={stageField} stageLabel={stageLabel} />
        ) : (
          <BreakdownTable items={order.items} showStages={order.hasStages} />
        )}
      </div>
    </div>
  );
};

/** A single stage tab: one row per line, one quantity column. */
const StageTable = ({ items, field, stageLabel }) => (
  <table className="w-full">
    <thead>
      <tr className="border-b border-gray-200">
        <Th>Item</Th>
        <Th>Size (Inch)</Th>
        <Th>Size (mm)</Th>
        <Th>Plating</Th>
        <Th>{stageLabel}</Th>
      </tr>
    </thead>
    <tbody>
      {items.map((item) => (
        <tr key={item.id} className="border-b border-gray-100 last:border-0">
          <Td>{item.itemName || "-"}</Td>
          <Td>{item.sizeInInch || "-"}</Td>
          <Td>{item.sizeInMm || "-"}</Td>
          <Td>{item.plating || "-"}</Td>
          <td className="px-6 py-3 text-sm font-semibold text-gray-900 text-center whitespace-nowrap">
            {formatStageQty(stageQty(item, field))}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

/** The All tab: every line with its quantity across all four stages side by side. */
const BreakdownTable = ({ items, showStages }) => (
  <table className="w-full">
    <thead>
      <tr className="border-b border-gray-200">
        <Th>Item</Th>
        <Th>Size (Inch)</Th>
        <Th>Size (mm)</Th>
        <Th>Plating</Th>
        <Th>Ordered</Th>
        {showStages &&
          STAGE_BUCKETS.map((bucket) => <Th key={bucket.key}>{ORDER_STATUS[bucket.key].label}</Th>)}
      </tr>
    </thead>
    <tbody>
      {items.map((item) => (
        <tr key={item.id} className="border-b border-gray-100 last:border-0">
          <Td>{item.itemName || "-"}</Td>
          <Td>{item.sizeInInch || "-"}</Td>
          <Td>{item.sizeInMm || "-"}</Td>
          <Td>{item.plating || "-"}</Td>
          <Td>
            {showStages
              ? formatStageQty(stageQty(item, "ordered"))
              : item.qtyPc != null
                ? `${item.qtyPc} pc`
                : "-"}
          </Td>
          {showStages &&
            STAGE_BUCKETS.map((bucket) => (
              <td
                key={bucket.key}
                className={`px-6 py-3 text-sm text-center whitespace-nowrap ${
                  hasQtyAt(item, bucket.field) ? "font-semibold text-gray-900" : "text-gray-300"
                }`}
              >
                {hasQtyAt(item, bucket.field) ? formatStageQty(stageQty(item, bucket.field)) : "—"}
              </td>
            ))}
        </tr>
      ))}
    </tbody>
  </table>
);

const Th = ({ children }) => (
  <th className="px-6 py-3 text-center text-sm font-[550] text-black whitespace-nowrap">{children}</th>
);

const Td = ({ children }) => (
  <td className="px-6 py-3 text-sm text-gray-700 text-center">{children}</td>
);

export default MyOrders;
