import { useMemo } from 'react';
import { FileText } from 'lucide-react';
import { CardField, DataTable, SortableHeader } from '@/components/data-table';
import { EmptyState } from '@/components/states';
import { Button } from '@/components/ui/button';

/**
 * The aavak/javak ledger both bill screens show.
 *
 * Purchase and sales differ only in one column's label and key, so they share this table rather
 * than each keeping its own copy of a ten-column grouped header — the pair had already drifted
 * apart once (the same column was headed "Purchase Kg / Pc." on one and "Sales Kg / Pc." on the
 * other while reading the same field).
 */
export function BillLedgerTable({ rows, qtyKey, qtyLabel, isPending, hasActiveFilters, onClearFilters, emptyText }) {
  const columns = useMemo(
    () => [
      {
        id: 'aavak',
        header: () => <span className="text-primary">Aavak</span>,
        columns: [
          {
            id: 'partyName',
            accessorKey: 'partyName',
            header: ({ column }) => <SortableHeader column={column}>Party name</SortableHeader>,
            cell: ({ row }) => <span className="font-medium text-ink">{row.original.partyName}</span>,
          },
          {
            id: 'size',
            accessorKey: 'size',
            header: ({ column }) => <SortableHeader column={column}>Size</SortableHeader>,
            cell: ({ row }) => <span className="font-mono text-[12.5px]">{row.original.size}</span>,
          },
          {
            id: 'aavakElement',
            accessorKey: 'aavakElement',
            header: 'Element',
            cell: ({ row }) => <span className="text-ink-2">{row.original.aavakElement}</span>,
          },
          {
            id: qtyKey,
            accessorKey: qtyKey,
            header: qtyLabel,
            cell: ({ row }) => <span className="font-mono text-[12.5px] text-ink-2">{row.original[qtyKey]}</span>,
          },
          {
            id: 'price',
            accessorKey: 'price',
            header: 'Price',
            cell: ({ row }) => <span className="font-mono text-[12.5px] text-ink-2">{row.original.price}</span>,
          },
          {
            id: 'totalPrice',
            accessorKey: 'totalPrice',
            header: 'Total price',
            cell: ({ row }) => (
              <span className="font-mono text-[12.5px] font-medium text-ink">{row.original.totalPrice}</span>
            ),
          },
        ],
      },
      {
        id: 'javak',
        header: () => <span className="text-brass">Javak</span>,
        columns: [
          {
            id: 'javakElement',
            accessorKey: 'javakElement',
            header: 'Element',
            cell: ({ row }) => <span className="text-ink-2">{row.original.javakElement}</span>,
          },
          {
            id: 'javakKgPc',
            accessorKey: 'javakKgPc',
            header: 'Javak Kg / Pc.',
            cell: ({ row }) => <span className="font-mono text-[12.5px] text-ink-2">{row.original.javakKgPc}</span>,
          },
          {
            id: 'rs',
            accessorKey: 'rs',
            header: 'Rs.',
            cell: ({ row }) => <span className="font-mono text-[12.5px] text-ink-2">{row.original.rs}</span>,
          },
          {
            id: 'totalRs',
            accessorKey: 'totalRs',
            header: 'Total Rs.',
            cell: ({ row }) => (
              <span className="font-mono text-[12.5px] font-medium text-ink">{row.original.totalRs}</span>
            ),
          },
        ],
      },
    ],
    [qtyKey, qtyLabel],
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(r) => r.id}
      isPending={isPending}
      renderMobileCard={(r) => (
        <div className="space-y-2.5">
          <div>
            <p className="text-[13.5px] font-semibold text-ink">{r.partyName}</p>
            <p className="font-mono text-[11.5px] text-ink-3">Size {r.size}</p>
          </div>
          <div className="grid grid-cols-2 gap-2.5 border-t border-line-2 pt-2.5">
            <CardField label="Aavak element">{r.aavakElement}</CardField>
            <CardField label={qtyLabel}>
              <span className="font-mono">{r[qtyKey]}</span>
            </CardField>
            <CardField label="Price">
              <span className="font-mono">{r.price}</span>
            </CardField>
            <CardField label="Total price">
              <span className="font-mono font-medium">{r.totalPrice}</span>
            </CardField>
            <CardField label="Javak element">{r.javakElement}</CardField>
            <CardField label="Javak Kg / Pc.">
              <span className="font-mono">{r.javakKgPc}</span>
            </CardField>
            <CardField label="Rs.">
              <span className="font-mono">{r.rs}</span>
            </CardField>
            <CardField label="Total Rs.">
              <span className="font-mono font-medium">{r.totalRs}</span>
            </CardField>
          </div>
        </div>
      )}
      empty={
        hasActiveFilters ? (
          <EmptyState
            icon={FileText}
            title="Nothing matches"
            description="No rows match that search or filter."
            action={
              onClearFilters && (
                <Button variant="outline" size="sm" onClick={onClearFilters}>
                  Clear filters
                </Button>
              )
            }
          />
        ) : (
          <EmptyState icon={FileText} title="No records yet" description={emptyText} />
        )
      }
    />
  );
}
