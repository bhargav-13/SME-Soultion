import { useEffect, useMemo, useState } from 'react';
import { Download, Inbox } from 'lucide-react';
import toast from 'react-hot-toast';
import SidebarLayout from '@/components/SidebarLayout';
import { PageBody, PageHeader } from '@/components/page-header';
import { EmptyState, ListSkeleton } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { clientPortalClientApi, clientPortalInvoicesApi } from '@/services/apiService';
import {
  ORDER_STATUS,
  ORDER_STATUS_TABS,
  STAGE_BUCKETS,
  formatStageQty,
  hasQtyAt,
  stageFieldFor,
  stageQty,
  sumStage,
} from '@/utils/clientShop';

const PAGE_SIZE = 10;
const ORDER_REQUESTS_PAGE_SIZE = 100;
const INVOICES_PAGE_SIZE = 10;

const TABS = [
  { key: 'ALL', label: 'All' },
  ...ORDER_STATUS_TABS.map((key) => ({ key, label: ORDER_STATUS[key].label })),
];

/** Tabs that select whole requests by their approval state rather than by quantity. */
const REQUEST_STATE_TABS = new Set(['PENDING_APPROVAL', 'REJECTED']);

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '-');

const HEAD_CLASS = 'px-4 py-2.5 text-center text-[11.5px] font-semibold tracking-[0.03em] text-ink-3 uppercase whitespace-nowrap';
const CELL_CLASS = 'px-4 py-2.5 text-center text-[13px] text-ink-2';

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [orderRequests, setOrderRequests] = useState([]);
  const [tab, setTab] = useState('ALL');

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
      console.error('Error fetching orders:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch orders');
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
      console.error('Error fetching order requests:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch order requests');
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
      console.error('Error fetching invoices:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch invoices');
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
      orderRequests.map((req) => req.orderId).filter((id) => id != null),
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
        requestStatus: 'APPROVED',
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
    if (tab === 'ALL') return allOrders;

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
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoice.invoiceNo || `invoice-${invoice.id}`}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error(error.response?.data?.message || 'Failed to download invoice');
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  const orderCount = totalElements + orderRequests.length;

  return (
    <SidebarLayout>
      <PageHeader
        title="My orders"
        subtitle={`You have ${orderCount} order${orderCount === 1 ? '' : 's'}.`}
      />

      <PageBody className="space-y-6">
        {/* Stage filter tabs */}
        <div className="-mx-1 overflow-x-auto px-1">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList variant="line" className="w-max">
              {TABS.map((t) => (
                <TabsTrigger key={t.key} value={t.key}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {stageField && (
          <p className="text-[12.5px] text-ink-3">
            Showing the quantity of each order that is currently{' '}
            <span className="font-medium text-ink-2">{ORDER_STATUS[tab].label.toLowerCase()}</span>. An
            order can appear under more than one tab while different parts of it are at different
            stages.
          </p>
        )}

        {loading ? (
          <ListSkeleton rows={4} className="h-28" />
        ) : visibleOrders.length === 0 ? (
          <EmptyState icon={Inbox} title="No orders found" description="Orders you place will appear here." />
        ) : (
          <div className="space-y-4">
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
          <div className="flex items-center justify-between">
            <p className="text-[12.5px] text-ink-3">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
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

        {/* Invoices */}
        <div className="space-y-4 pt-6">
          <div>
            <h2 className="font-heading text-[15px] font-semibold text-ink">My invoices</h2>
            <p className="text-[12.5px] text-ink-3">Download invoices issued to your account.</p>
          </div>

          {invoicesLoading ? (
            <ListSkeleton rows={3} className="h-12" />
          ) : invoices.length === 0 ? (
            <EmptyState icon={Inbox} title="No invoices found" />
          ) : (
            <Card className="gap-0 overflow-hidden py-0">
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className={`${HEAD_CLASS} text-left`}>Invoice no</TableHead>
                      <TableHead className={HEAD_CLASS}>Date</TableHead>
                      <TableHead className={HEAD_CLASS}>Type</TableHead>
                      <TableHead className={HEAD_CLASS}>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id} className="border-line-2">
                        <TableCell className="px-4 py-2.5 text-left text-[13px] font-medium text-ink">
                          {invoice.invoiceNo || '-'}
                        </TableCell>
                        <TableCell className={CELL_CLASS}>{formatDate(invoice.invoiceDate)}</TableCell>
                        <TableCell className={CELL_CLASS}>{invoice.invoiceType || '-'}</TableCell>
                        <TableCell className="px-4 py-2.5 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadInvoice(invoice)}
                            disabled={downloadingInvoiceId === invoice.id}
                          >
                            <Download className="size-4" />
                            {downloadingInvoiceId === invoice.id ? 'Downloading…' : 'Download'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}

          {invoiceTotalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-[12.5px] text-ink-3">
                Page {invoicePage + 1} of {invoiceTotalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInvoicePage((p) => Math.max(0, p - 1))}
                  disabled={invoicePage === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInvoicePage((p) => Math.min(invoiceTotalPages - 1, p + 1))}
                  disabled={invoicePage >= invoiceTotalPages - 1}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </PageBody>
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
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <p className="text-[13.5px] font-semibold text-ink">{order.label}</p>
          {stageField ? (
            <Badge variant="accent">
              {stageLabel} · {formatStageQty(cardTotal)}
            </Badge>
          ) : (
            <span
              className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11.5px] font-medium whitespace-nowrap ${
                ORDER_STATUS[order.requestStatus]?.className || 'bg-surface-2 text-ink-3'
              }`}
            >
              {ORDER_STATUS[order.requestStatus]?.label || order.requestStatus}
            </span>
          )}
        </div>
        <p className="text-[12.5px] text-ink-3">{formatDate(order.orderDate)}</p>
      </div>

      <div className="w-full overflow-x-auto">
        {stageField ? (
          <StageTable items={order.items} field={stageField} stageLabel={stageLabel} />
        ) : (
          <BreakdownTable items={order.items} showStages={order.hasStages} />
        )}
      </div>
    </Card>
  );
};

/** A single stage tab: one row per line, one quantity column. */
const StageTable = ({ items, field, stageLabel }) => (
  <Table>
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className={HEAD_CLASS}>Item</TableHead>
        <TableHead className={HEAD_CLASS}>Size (Inch)</TableHead>
        <TableHead className={HEAD_CLASS}>Size (mm)</TableHead>
        <TableHead className={HEAD_CLASS}>Plating</TableHead>
        <TableHead className={HEAD_CLASS}>{stageLabel}</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {items.map((item) => (
        <TableRow key={item.id} className="border-line-2">
          <TableCell className={CELL_CLASS}>{item.itemName || '-'}</TableCell>
          <TableCell className={CELL_CLASS}>{item.sizeInInch || '-'}</TableCell>
          <TableCell className={CELL_CLASS}>{item.sizeInMm || '-'}</TableCell>
          <TableCell className={CELL_CLASS}>{item.plating || '-'}</TableCell>
          <TableCell className="px-4 py-2.5 text-center font-mono text-[13px] font-semibold whitespace-nowrap text-ink">
            {formatStageQty(stageQty(item, field))}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

/** The All tab: every line with its quantity across all four stages side by side. */
const BreakdownTable = ({ items, showStages }) => (
  <Table>
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className={HEAD_CLASS}>Item</TableHead>
        <TableHead className={HEAD_CLASS}>Size (Inch)</TableHead>
        <TableHead className={HEAD_CLASS}>Size (mm)</TableHead>
        <TableHead className={HEAD_CLASS}>Plating</TableHead>
        <TableHead className={HEAD_CLASS}>Ordered</TableHead>
        {showStages &&
          STAGE_BUCKETS.map((bucket) => (
            <TableHead key={bucket.key} className={HEAD_CLASS}>
              {ORDER_STATUS[bucket.key].label}
            </TableHead>
          ))}
      </TableRow>
    </TableHeader>
    <TableBody>
      {items.map((item) => (
        <TableRow key={item.id} className="border-line-2">
          <TableCell className={CELL_CLASS}>{item.itemName || '-'}</TableCell>
          <TableCell className={CELL_CLASS}>{item.sizeInInch || '-'}</TableCell>
          <TableCell className={CELL_CLASS}>{item.sizeInMm || '-'}</TableCell>
          <TableCell className={CELL_CLASS}>{item.plating || '-'}</TableCell>
          <TableCell className="px-4 py-2.5 text-center font-mono text-[13px] whitespace-nowrap text-ink-2">
            {showStages
              ? formatStageQty(stageQty(item, 'ordered'))
              : item.qtyPc != null
                ? `${item.qtyPc} pc`
                : '-'}
          </TableCell>
          {showStages &&
            STAGE_BUCKETS.map((bucket) => (
              <TableCell
                key={bucket.key}
                className={`px-4 py-2.5 text-center font-mono text-[13px] whitespace-nowrap ${
                  hasQtyAt(item, bucket.field) ? 'font-semibold text-ink' : 'text-ink-3/50'
                }`}
              >
                {hasQtyAt(item, bucket.field) ? formatStageQty(stageQty(item, bucket.field)) : '—'}
              </TableCell>
            ))}
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

export default MyOrders;
