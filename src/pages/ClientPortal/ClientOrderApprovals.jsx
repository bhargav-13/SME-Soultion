import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, ClipboardList, Package, X as XIcon, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import SidebarLayout from '@/components/SidebarLayout';
import { PageBody, PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { EmptyState, ListSkeleton } from '@/components/states';
import { ConfirmDialog, ConfirmName } from '@/components/confirm-dialog';
import OrderStatusBadge from '@/components/ClientPortal/OrderStatusBadge';
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
import { clientPortalAdminApi } from '@/services/apiService';
import { ITEM_STAGE, ORDER_STATUS, ORDER_STATUS_TABS, formatKg } from '@/utils/clientShop';

const PAGE_SIZE = 20;

// The server keeps every request in exactly one pipeline status, so these tabs partition the list.
const TABS = [
  { key: 'ALL', label: 'All' },
  ...ORDER_STATUS_TABS.map((key) => ({ key, label: ORDER_STATUS[key].label })),
];

const HEAD_CLASS = 'px-4 py-2.5 text-center text-[11.5px] font-semibold tracking-[0.03em] text-ink-3 uppercase whitespace-nowrap';
const CELL_CLASS = 'px-4 py-2.5 text-center text-[13px] text-ink-2';

const ClientOrderApprovals = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const usernameFilter = searchParams.get('username') || '';
  const partyNameFilter = searchParams.get('partyName') || '';

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [tab, setTab] = useState('ALL');
  const [expandedId, setExpandedId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null, action: null });
  const [processing, setProcessing] = useState(false);

  const loadRequests = async (pageNum = 0) => {
    try {
      setLoading(true);
      const response = await clientPortalAdminApi.getAllOrderRequests(
        pageNum,
        PAGE_SIZE,
        undefined,
        undefined,
        undefined,
        tab === 'ALL' ? undefined : tab,
        partyNameFilter || undefined,
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
      console.error('Error fetching order requests:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch order requests');
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
        'PENDING_APPROVAL',
        partyNameFilter || undefined,
      );
      setPendingCount(response.data?.totalElements || 0);
    } catch (error) {
      console.error('Error fetching pending order request count:', error);
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
    const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
    try {
      setProcessing(true);
      await clientPortalAdminApi.updateOrderRequestStatus(id, { status: newStatus });
      await loadRequests(page);
      await loadPendingCount();
      toast.success(action === 'approve' ? 'Order request approved' : 'Order request rejected');
    } catch (error) {
      console.error('Error updating order request status:', error);
      toast.error(error.response?.data?.message || 'Failed to update order request');
    } finally {
      setProcessing(false);
      setConfirmDialog({ isOpen: false, id: null, action: null });
    }
  };

  return (
    <SidebarLayout>
      <PageHeader
        title="Order approvals"
        subtitle="Review and approve order requests submitted by clients."
        backTo="/client-portal"
        backLabel="Client Portal"
      />

      <PageBody className="space-y-6">
        {usernameFilter && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface-2 px-4 py-2.5">
            <p className="text-[13px] text-ink-2">
              Showing requests for{' '}
              <span className="font-semibold text-ink">{partyNameFilter || usernameFilter}</span>{' '}
              <span className="text-ink-3">({usernameFilter})</span>
            </p>
            <Button variant="ghost" size="sm" onClick={clearClientFilter} className="text-ink-2">
              <XCircle className="size-4" />
              Clear filter
            </Button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatCard label="Total requests" value={totalElements} icon={ClipboardList} tone="info" />
          <StatCard label="Pending approval" value={pendingCount} icon={Package} tone="warning" />
        </div>

        {/* Tabs */}
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

        {/* Requests list */}
        {loading ? (
          <ListSkeleton rows={4} className="h-24" />
        ) : filteredRequests.length === 0 ? (
          <EmptyState icon={Package} title="No order requests found" />
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((req) => (
              <Card key={req.id} className="gap-0 overflow-hidden py-0">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-ink">
                      Request #{req.id} {req.partyName ? `· ${req.partyName}` : ''}
                    </p>
                    <p className="mt-0.5 text-[12px] text-ink-3">
                      Client: <span className="font-medium text-ink-2">{req.username || '-'}</span>
                      {' · '}
                      {req.orderDate ? new Date(req.orderDate).toLocaleDateString() : '-'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <OrderStatusBadge status={req.status} />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                    >
                      {expandedId === req.id ? 'Hide items' : 'View items'}
                    </Button>
                    {req.status === 'PENDING_APPROVAL' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleAction(req.id, 'approve')}
                          className="bg-success text-white hover:bg-success/90"
                        >
                          <Check className="size-4" />
                          Approve
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleAction(req.id, 'reject')}>
                          <XIcon className="size-4" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {expandedId === req.id && (
                  <div className="w-full overflow-x-auto border-t border-line">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className={HEAD_CLASS}>Item</TableHead>
                          <TableHead className={HEAD_CLASS}>Size (Inch)</TableHead>
                          <TableHead className={HEAD_CLASS}>Size (mm)</TableHead>
                          <TableHead className={HEAD_CLASS}>Plating</TableHead>
                          <TableHead className={HEAD_CLASS}>Qty (Pc)</TableHead>
                          <TableHead className={HEAD_CLASS}>Stage</TableHead>
                          <TableHead className={HEAD_CLASS}>Ready / At Plater (Kg)</TableHead>
                          <TableHead className={HEAD_CLASS}>Dispatched (Pc)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(req.items || []).map((item) => {
                          const stage = ITEM_STAGE[item.stage];
                          return (
                            <TableRow key={item.id} className="border-line-2">
                              <TableCell className={CELL_CLASS}>{item.itemName || '-'}</TableCell>
                              <TableCell className={CELL_CLASS}>{item.sizeInInch || '-'}</TableCell>
                              <TableCell className={CELL_CLASS}>{item.sizeInMm || '-'}</TableCell>
                              <TableCell className={CELL_CLASS}>{item.plating || '-'}</TableCell>
                              <TableCell className="px-4 py-2.5 text-center font-mono text-[13px] text-ink-2">
                                {item.qtyPc ?? '-'}
                              </TableCell>
                              <TableCell className="px-4 py-2.5 text-center">
                                {stage ? (
                                  <span
                                    className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11.5px] font-medium whitespace-nowrap ${stage.className}`}
                                  >
                                    {stage.label}
                                  </span>
                                ) : (
                                  <span className="text-ink-3">-</span>
                                )}
                              </TableCell>
                              {/* On a partial return it is exactly the returned Kg that is ready to go
                                  out; the rest is still with the plater. */}
                              <TableCell className="px-4 py-2.5 text-center font-mono text-[13px] whitespace-nowrap">
                                {item.sentKg == null ? (
                                  '-'
                                ) : (
                                  <>
                                    <span className="font-medium text-success">{formatKg(item.returnedKg)}</span>
                                    <span className="text-ink-3"> / </span>
                                    <span className="text-ink-2">{formatKg(item.remainingKg)}</span>
                                  </>
                                )}
                              </TableCell>
                              <TableCell className="px-4 py-2.5 text-center font-mono text-[13px] whitespace-nowrap text-ink-2">
                                {item.dispatchedPc == null ? '-' : `${item.dispatchedPc} / ${item.qtyPc ?? '-'}`}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>
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

        <ConfirmDialog
          open={confirmDialog.isOpen}
          onOpenChange={(open) => !open && setConfirmDialog({ isOpen: false, id: null, action: null })}
          title={confirmDialog.action === 'approve' ? 'Approve order request' : 'Reject order request'}
          description={
            confirmDialog.action === 'approve' ? (
              <>
                This will mark the order request as <ConfirmName>approved</ConfirmName> and notify the client.
                Continue?
              </>
            ) : (
              <>
                This will <ConfirmName>reject</ConfirmName> the order request. The client will be notified.
                Continue?
              </>
            )
          }
          confirmLabel={confirmDialog.action === 'approve' ? 'Approve' : 'Reject'}
          busyLabel={confirmDialog.action === 'approve' ? 'Approving…' : 'Rejecting…'}
          isPending={processing}
          destructive={confirmDialog.action === 'reject'}
          onConfirm={handleConfirm}
        />
      </PageBody>
    </SidebarLayout>
  );
};

export default ClientOrderApprovals;
