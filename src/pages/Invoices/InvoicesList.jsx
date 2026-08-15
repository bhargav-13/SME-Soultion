import { useEffect, useMemo, useState } from 'react';
import { Download, Eye, Plus, ReceiptText, SquarePen, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import SidebarLayout from '@/components/SidebarLayout';
import { ConfirmDialog, ConfirmName } from '@/components/confirm-dialog';
import { CardField, DataTable, SortableHeader } from '@/components/data-table';
import { ListToolbar } from '@/components/list-toolbar';
import { PageBody, PageHeader } from '@/components/page-header';
import { RowActions } from '@/components/row-actions';
import { StatCard } from '@/components/stat-card';
import { EmptyState } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FILTER_ALL, useListFilters } from '@/hooks/use-list-filters';
import { fmtNumber, humanize } from '@/lib/format';
import { invoiceApi, exportApi } from '@/services/apiService';

/** Invoice type → badge tone, so the three kinds are told apart without reading the label. */
const TYPE_TONE = { EXPORT: 'accent', COMMERCIAL: 'info', PACKAGING_LIST: 'brass' };

const InvoicesList = () => {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedToDelete, setSelectedToDelete] = useState(null);

  const { filters, setFilter, search, onSearchChange, debouncedSearch, clearFilters, hasActiveFilters } =
    useListFilters({ defaults: { type: FILTER_ALL } });

  const getApiInvoiceType = (uiType) => {
    switch (uiType) {
      case 'Export':
        return 'EXPORT';
      case 'Commercial':
        return 'COMMERCIAL';
      case 'Packing List':
        return 'PACKAGING_LIST';
      default:
        return undefined; // Send undefined to show all
    }
  };

  // Update fetchInvoices to accept filters
  const fetchInvoices = async (searchText = '', type = '') => {
    try {
      setLoading(true);

      // Convert UI filter to API Enum
      const apiType = getApiInvoiceType(type);

      // Call API with search and type filters
      const response = await invoiceApi.getAllInvoice(
        apiType, // filterByType
        searchText || undefined, // search text
        0, // page
        100, // size
      );

      const invoiceData = response.data?.data || [];

      const mapped = invoiceData.map((inv) => ({
        id: inv.id || inv.invoiceId || inv._id,
        invoiceNo: inv.invoiceNo || 'N/A',
        date: inv.invoiceDate || inv.createdAt || 'N/A',
        partyName: inv.exporterCompanyName || inv.billToName || 'N/A',
        invoiceType: inv.invoiceType || 'EXPORT',
      }));

      setInvoices(mapped);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load invoices');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  // The search term is already debounced by the filter hook, and the type filter narrows on the
  // server, so both re-fetch rather than filtering the page in memory.
  useEffect(() => {
    fetchInvoices(debouncedSearch, filters.type === FILTER_ALL ? '' : filters.type);
  }, [debouncedSearch, filters.type]);

  const handleConfirmDelete = async () => {
    try {
      setDeleting(true);
      await invoiceApi.deleteInvoice(selectedToDelete?.id);
      toast.success('Invoice deleted');
      setSelectedToDelete(null);
      await fetchInvoices(debouncedSearch, filters.type === FILTER_ALL ? '' : filters.type);
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete invoice');
    } finally {
      setDeleting(false);
    }
  };

  const handleEditInvoice = async (id) => {
    try {
      const resp = await invoiceApi.getInvoiceById(id);
      const invoice = resp.data;
      navigate('/invoices/create', { state: { invoice, mode: 'edit' } });
    } catch (err) {
      console.error(err);
      toast.error('Failed to open editor');
    }
  };

  const handleViewInvoice = async (id) => {
    try {
      const resp = await invoiceApi.getInvoiceById(id);
      const invoice = resp.data;
      navigate('/invoices/create', { state: { invoice, mode: 'view' } });
    } catch (err) {
      console.error(err);
      toast.error('Failed to open viewer');
    }
  };

  const handleDownload = async (id, invoiceType, invoiceNo) => {
    try {
      const resp = await exportApi.getInvoicePdf(id, invoiceType, {
        responseType: 'blob',
      });
      const blob = resp.data;
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoiceNo || id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error(err);
      toast.error('Failed to download PDF');
    }
  };

  const rowActionsFor = (invoice) => [
    { label: 'View', icon: Eye, onSelect: () => handleViewInvoice(invoice.id) },
    { label: 'Edit', icon: SquarePen, onSelect: () => handleEditInvoice(invoice.id) },
    {
      label: 'Download PDF',
      icon: Download,
      onSelect: () => handleDownload(invoice.id, invoice.invoiceType, invoice.invoiceNo),
    },
    {
      label: 'Delete',
      icon: Trash2,
      destructive: true,
      separatorBefore: true,
      onSelect: () => setSelectedToDelete({ id: invoice.id, invoiceNo: invoice.invoiceNo }),
    },
  ];

  const columns = useMemo(
    () => [
      {
        id: 'invoiceNo',
        accessorKey: 'invoiceNo',
        header: ({ column }) => <SortableHeader column={column}>Invoice no</SortableHeader>,
        cell: ({ row }) => <span className="font-mono font-medium text-ink">{row.original.invoiceNo}</span>,
      },
      {
        id: 'date',
        accessorKey: 'date',
        header: ({ column }) => <SortableHeader column={column}>Date</SortableHeader>,
        cell: ({ row }) => <span className="font-mono text-[12.5px] text-ink-2">{row.original.date}</span>,
      },
      {
        id: 'partyName',
        accessorKey: 'partyName',
        header: ({ column }) => <SortableHeader column={column}>Party</SortableHeader>,
        cell: ({ row }) => <span className="text-ink-2">{row.original.partyName}</span>,
      },
      {
        id: 'invoiceType',
        accessorKey: 'invoiceType',
        header: ({ column }) => <SortableHeader column={column}>Type</SortableHeader>,
        cell: ({ row }) => (
          <Badge variant={TYPE_TONE[row.original.invoiceType] ?? 'muted'}>{humanize(row.original.invoiceType)}</Badge>
        ),
        size: 140,
      },
      {
        id: 'pdf',
        header: 'PDF',
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDownload(row.original.id, row.original.invoiceType, row.original.invoiceNo);
            }}
          >
            <Download className="size-3.5" />
            Download
          </Button>
        ),
        size: 140,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => <RowActions actions={rowActionsFor(row.original)} />,
        size: 60,
      },
    ],
    [],
  );

  const fields = useMemo(
    () => [
      {
        key: 'type',
        label: 'Type',
        allLabel: 'All types',
        options: [
          { value: 'Export', label: 'Export' },
          { value: 'Commercial', label: 'Commercial' },
          { value: 'Packing List', label: 'Packing list' },
        ],
      },
    ],
    [],
  );

  return (
    <SidebarLayout>
      <PageHeader
        title="Invoices"
        subtitle="Export, commercial and packing-list invoices"
        actions={
          <Button size="sm" onClick={() => navigate('/invoices/create')}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">Create invoice</span>
          </Button>
        }
      />

      <PageBody>
        <div className="mb-5 grid grid-cols-1 gap-3 sm:max-w-xs">
          <StatCard
            label="Invoices listed"
            value={fmtNumber(invoices.length)}
            hint={hasActiveFilters ? 'Matching the current filters' : undefined}
            icon={ReceiptText}
            tone="primary"
            isPending={loading}
          />
        </div>

        <ListToolbar
          search={{ value: search, onChange: onSearchChange, placeholder: 'Search invoice no or party…' }}
          fields={fields}
          values={filters}
          onChange={setFilter}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />

        <DataTable
          columns={columns}
          data={invoices}
          getRowId={(i) => String(i.id)}
          isPending={loading}
          onRowClick={(i) => handleViewInvoice(i.id)}
          renderMobileCard={(i) => (
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-[13.5px] font-semibold text-ink">{i.invoiceNo}</p>
                  <p className="truncate text-[12px] text-ink-2">{i.partyName}</p>
                </div>
                <RowActions actions={rowActionsFor(i)} />
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-line-2 pt-2.5">
                <Badge variant={TYPE_TONE[i.invoiceType] ?? 'muted'}>{humanize(i.invoiceType)}</Badge>
                <CardField label="Date" className="ml-auto text-right">
                  <span className="font-mono">{i.date}</span>
                </CardField>
              </div>
            </div>
          )}
          empty={
            hasActiveFilters ? (
              <EmptyState
                icon={ReceiptText}
                title="No invoices match"
                description="Nothing matches that search or type."
                action={
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={ReceiptText}
                title="No invoices yet"
                description="Create an export, commercial or packing-list invoice to get started."
                action={
                  <Button size="sm" onClick={() => navigate('/invoices/create')}>
                    <Plus className="size-4" />
                    Create the first invoice
                  </Button>
                }
              />
            )
          }
        />
      </PageBody>

      <ConfirmDialog
        open={selectedToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedToDelete(null);
        }}
        title="Delete this invoice?"
        description={
          <>
            Invoice <ConfirmName>{selectedToDelete?.invoiceNo}</ConfirmName> will be permanently deleted. This cannot
            be undone.
          </>
        }
        confirmLabel="Delete"
        busyLabel="Deleting…"
        isPending={deleting}
        onConfirm={handleConfirmDelete}
      />
    </SidebarLayout>
  );
};

export default InvoicesList;
