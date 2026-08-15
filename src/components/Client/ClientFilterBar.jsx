import { useMemo } from 'react';
import { ChevronDown, Search, User } from 'lucide-react';
import DebouncedSearchInput from '../DebouncedSearchInput';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { FILTER_ALL } from '@/hooks/use-list-filters';

/**
 * The toolbar above the client price sheet: which client it is for, a search, and the type filter.
 *
 * The client picker is a button rather than a select because choosing one opens a dialog with the
 * full party list — the same list the rest of the console picks a party from.
 */
const ClientFilterBar = ({
  leftLabel = 'Select client',
  onLeftClick,
  leftDisabled = false,
  searchQuery,
  setSearchQuery,
  typeFilter,
  setTypeFilter,
  filterOptions = ['Type'],
  filterPlaceholder = 'Type',
}) => {
  // The caller passes the placeholder as the first option; drop it and let "All types" stand in.
  const options = useMemo(
    () =>
      filterOptions
        .filter((o) => o !== filterPlaceholder)
        .map((o) => ({ value: o, label: o })),
    [filterOptions, filterPlaceholder],
  );

  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
      <Button
        type="button"
        variant="outline"
        onClick={onLeftClick}
        disabled={leftDisabled}
        className="w-full justify-between gap-2 sm:w-auto sm:min-w-[12rem]"
      >
        <span className="flex min-w-0 items-center gap-2">
          <User className="size-4 shrink-0 text-ink-3" />
          <span className="truncate">{leftLabel}</span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-ink-3" />
      </Button>

      <div className="relative w-full sm:flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
        <DebouncedSearchInput
          value={searchQuery}
          onDebouncedChange={setSearchQuery}
          placeholder="Search items, sizes…"
          wrapperClassName="contents"
          className="h-9 w-full rounded-md border border-input bg-surface py-1 pr-3 pl-9 text-[13px] shadow-xs transition-[color,box-shadow] outline-none placeholder:text-ink-3 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </div>

      <SearchableSelect
        ariaLabel={filterPlaceholder}
        options={[{ value: FILTER_ALL, label: `All ${filterPlaceholder.toLowerCase()}s` }, ...options]}
        value={typeFilter || FILTER_ALL}
        onChange={(value) => setTypeFilter(value === FILTER_ALL ? '' : value)}
        placeholder={filterPlaceholder}
        searchPlaceholder={`Search ${filterPlaceholder.toLowerCase()}…`}
        className="w-full sm:w-auto sm:min-w-[9rem]"
      />
    </div>
  );
};

export default ClientFilterBar;
