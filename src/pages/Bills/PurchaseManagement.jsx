import { useEffect, useMemo, useState } from 'react';
import { Download, Plus } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import SidebarLayout from '@/components/SidebarLayout';
import { BillLedgerTable } from '@/components/Bills/BillLedgerTable';
import DownloadStatementModal from '@/components/DownloadStatementModal';
import { ListToolbar } from '@/components/list-toolbar';
import { PageBody, PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { FILTER_ALL, matchesSearch, useListFilters } from '@/hooks/use-list-filters';
import { exportApi } from '@/services/apiService';

const PURCHASE_ORDERS_KEY = 'bills:purchaseOrders';

const PurchaseManagement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [purchaseRows, setPurchaseRows] = useState([]);
  const [statementOpen, setStatementOpen] = useState(false);

  const { filters, setFilter, search, onSearchChange, debouncedSearch, clearFilters, hasActiveFilters } =
    useListFilters({ defaults: { type: FILTER_ALL } });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PURCHASE_ORDERS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) {
        setPurchaseRows([]);
        return;
      }

      const mappedRows = list.flatMap((order) =>
        (order.items || []).map((item, idx) => ({
          id: `${order.id}-${idx}`,
          partyName: order.sellerPartyName || '-',
          size: item.size || '-',
          aavakElement: `${item.element || '-'} ${item.elementType || ''}`.trim(),
          purchaseKgPc: `${item.unit || '-'} ${item.unitType || ''}`.trim(),
          price: item.scrap != null ? String(item.scrap) : '-',
          totalPrice:
            item.scrap != null && item.unit != null
              ? String((Number(item.scrap) || 0) * (Number(item.unit) || 0))
              : '-',
          javakElement: item.element || '-',
          javakKgPc: `${item.unit || '-'} ${item.unitType || ''}`.trim(),
          rs: item.labour != null ? String(item.labour) : '-',
          totalRs: item.total != null ? String(item.total) : '-',
          type: 'Purchase',
        })),
      );

      setPurchaseRows(mappedRows);
    } catch {
      setPurchaseRows([]);
    }
  }, [location.key]);

  const filtered = useMemo(
    () =>
      purchaseRows.filter((row) => {
        const bySearch = matchesSearch(row, debouncedSearch, ['partyName', 'size']);
        const byType = filters.type === FILTER_ALL || row.type === filters.type;
        return bySearch && byType;
      }),
    [purchaseRows, debouncedSearch, filters.type],
  );

  const fields = useMemo(
    () => [{ key: 'type', label: 'Type', allLabel: 'All types', options: [{ value: 'Purchase', label: 'Purchase' }] }],
    [],
  );

  return (
    <SidebarLayout>
      <PageHeader
        title="Purchase management"
        subtitle="Purchase order processing from start to delivery"
        actions={
          <Button size="sm" onClick={() => navigate('/bills/purchase/add')}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add purchase order</span>
          </Button>
        }
      />

      <PageBody>
        <ListToolbar
          search={{ value: search, onChange: onSearchChange, placeholder: 'Search party or size…' }}
          fields={fields}
          values={filters}
          onChange={setFilter}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
          actions={
            <Button variant="outline" size="sm" onClick={() => setStatementOpen(true)}>
              <Download className="size-4" />
              <span className="hidden sm:inline">Download statement</span>
            </Button>
          }
        />

        <BillLedgerTable
          rows={filtered}
          qtyKey="purchaseKgPc"
          qtyLabel="Purchase Kg / Pc."
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
          emptyText="Purchase orders you add appear here, one row per line item."
        />
      </PageBody>

      <DownloadStatementModal
        isOpen={statementOpen}
        onClose={() => setStatementOpen(false)}
        title="Download purchase statement"
        fileName="purchase_statement"
        onDownload={(partyId, startDate, endDate) =>
          exportApi.getPurchaseReportPdf(partyId, startDate, endDate, { responseType: 'blob' })
        }
      />
    </SidebarLayout>
  );
};

export default PurchaseManagement;
