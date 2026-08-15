import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { memo, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { PAGE_SIZE_OPTIONS } from '@/hooks/use-list-filters';
import { fmtNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * The shared list footer: a rows-per-page control and an "n–m of total" summary on the left,
 * first/previous/next/last on the right.
 *
 * There are no numbered page buttons. An ERP list is scanned and filtered, not browsed by page
 * number — and a numbered strip over 400 pages of stock rows is noise, not navigation.
 */
export const Pagination = memo(function Pagination({
  page,
  size,
  total,
  count,
  onPageChange,
  onSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  className,
}) {
  const sizeOptions = useMemo(
    () => pageSizeOptions.map((o) => ({ value: String(o), label: String(o) })),
    [pageSizeOptions],
  );

  if (total <= 0) return null;

  const from = page * size + 1;
  const to = Math.min(total, page * size + count);
  const lastPage = Math.max(0, Math.ceil(total / size) - 1);

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        'mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[12.5px] text-ink-3',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {onSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="hidden sm:inline">Rows</span>
            <SearchableSelect
              ariaLabel="Rows per page"
              options={sizeOptions}
              value={String(size)}
              onChange={(v) => onSizeChange(Number(v))}
              className="h-8 w-[4.75rem] px-2.5 text-[12.5px]"
              contentClassName="min-w-[7rem]"
            />
          </div>
        )}
        <span className="font-mono">
          {fmtNumber(from)}–{fmtNumber(to)} of {fmtNumber(total)}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          disabled={page <= 0}
          onClick={() => onPageChange(0)}
          aria-label="First page"
        >
          <ChevronsLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 0}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4 sm:hidden" />
          <span className="hidden sm:inline">Previous</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= lastPage}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="size-4 sm:hidden" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          disabled={page >= lastPage}
          onClick={() => onPageChange(lastPage)}
          aria-label="Last page"
        >
          <ChevronsRight className="size-4" />
        </Button>
      </div>
    </nav>
  );
});
