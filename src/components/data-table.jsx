import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Pagination } from '@/components/pagination';
import { ErrorState, ListSkeleton } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DEFAULT_PAGE_SIZE } from '@/hooks/use-list-filters';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

/**
 * The console's one table.
 *
 * Sorting, paging, the loading skeleton, the error state and the empty state all live here, so a
 * list page is only ever a column definition plus a toolbar — which is why every list in this app
 * behaves identically without any of them repeating the behaviour.
 *
 * On a phone a twelve-column ERP table is unreadable however much it scrolls, so a page can hand
 * over `renderMobileCard` and get a stacked card list below `md` instead. Everything else — the
 * same rows, the same page, the same sort — is shared, so the two layouts can't drift.
 *
 * Pass `pagination` to page server-side (the rows on screen are one page the API produced, so the
 * table must not slice or re-sort them). Omit it and the table pages and sorts `data` itself.
 */
export function DataTable({
  columns,
  data,
  getRowId,
  isPending = false,
  isError = false,
  onRetry,
  errorText = 'Could not load this list.',
  empty,
  pagination,
  initialPageSize = DEFAULT_PAGE_SIZE,
  hidePagination = false,
  onRowClick,
  rowClassName,
  renderMobileCard,
  skeletonRows = 6,
  className,
}) {
  const [sorting, setSorting] = useState([]);
  const isMobile = useIsMobile();
  const serverPaged = pagination !== undefined;

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // In server mode the API decides both the slice and the order, so the client row models must
    // not re-apply either — otherwise "page 2, sorted by name" would sort only page 2.
    getPaginationRowModel: serverPaged ? undefined : getPaginationRowModel(),
    manualPagination: serverPaged,
    manualSorting: serverPaged,
    initialState: serverPaged ? undefined : { pagination: { pageIndex: 0, pageSize: initialPageSize } },
  });

  // Filtering happens above this component (it owns the toolbar), so a narrowed result set can
  // leave the client-mode table parked on a page that no longer exists — an empty table with rows
  // one page back. Rewind whenever the row count drops out from under the current offset.
  const rowCount = table.getFilteredRowModel().rows.length;
  const { pageIndex, pageSize } = table.getState().pagination;
  useEffect(() => {
    if (serverPaged) return;
    const lastPage = Math.max(0, Math.ceil(rowCount / pageSize) - 1);
    if (pageIndex > lastPage) table.setPageIndex(lastPage);
  }, [serverPaged, rowCount, pageSize, pageIndex, table]);

  if (isPending) return <ListSkeleton rows={skeletonRows} />;
  if (isError) return <ErrorState message={errorText} onRetry={onRetry} />;
  if (data.length === 0 && empty) return <>{empty}</>;

  const rows = table.getRowModel().rows;

  const footer = !hidePagination && (
    serverPaged ? (
      <Pagination
        page={pagination.page}
        size={pagination.size}
        total={pagination.total}
        count={data.length}
        onPageChange={pagination.onPageChange}
        onSizeChange={pagination.onSizeChange}
      />
    ) : (
      <Pagination
        page={pageIndex}
        size={pageSize}
        total={rowCount}
        count={rows.length}
        onPageChange={(p) => table.setPageIndex(p)}
        onSizeChange={(s) => table.setPageSize(s)}
      />
    )
  );

  if (isMobile && renderMobileCard) {
    return (
      <>
        <div className={cn('space-y-2.5', className)}>
          {rows.map((row) => (
            <Card
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              className={cn(
                'gap-0 rounded-xl p-3.5',
                onRowClick && 'cursor-pointer active:bg-surface-2',
                rowClassName?.(row.original),
              )}
            >
              {renderMobileCard(row.original, row)}
            </Card>
          ))}
        </div>
        {footer}
      </>
    );
  }

  return (
    <>
      <Card className={cn('overflow-hidden py-0', className)}>
        {/* Wide tables scroll inside the card rather than pushing the page sideways. */}
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      style={header.column.columnDef.size ? { width: header.column.columnDef.size } : undefined}
                      className="h-10 whitespace-nowrap px-3 text-[11.5px] font-semibold tracking-[0.03em] text-ink-3 uppercase"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn('border-line-2', onRowClick && 'cursor-pointer', rowClassName?.(row.original))}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-3 py-2.5 text-[13px]">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {footer}
    </>
  );
}

/**
 * A sortable column header. Rendered as a button so it is reachable by keyboard, with the arrow
 * showing the direction the *current* sort is in — not the one a click would apply, which is the
 * ambiguity that makes so many tables' sort arrows unreadable.
 */
export function SortableHeader({ column, children, className }) {
  const sorted = column.getIsSorted();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => column.toggleSorting(sorted === 'asc')}
      className={cn(
        '-ml-2 h-7 gap-1 px-2 text-[11.5px] font-semibold tracking-[0.03em] text-ink-3 uppercase hover:text-ink',
        className,
      )}
    >
      {children}
      {sorted === 'asc' ? (
        <ArrowUp className="size-3.5" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="size-3.5" />
      ) : (
        <ChevronsUpDown className="size-3.5 opacity-40" />
      )}
    </Button>
  );
}

/**
 * A label/value pair inside a {@link DataTable} mobile card — the card equivalent of a table cell,
 * so the phone layout keeps the column headings the desktop table shows once at the top.
 */
export function CardField({ label, children, className }) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-[10.5px] font-semibold tracking-[0.06em] text-ink-3 uppercase">{label}</p>
      <div className="mt-0.5 truncate text-[13px] text-ink">{children}</div>
    </div>
  );
}
