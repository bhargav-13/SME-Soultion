import { ArrowDownUp, Search, X } from 'lucide-react';
import { memo, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MultiSelect } from '@/components/ui/multi-select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { FILTER_ALL } from '@/hooks/use-list-filters';
import { cn } from '@/lib/utils';

/**
 * Per-field `onChange` handlers that keep their identity for the life of the page.
 *
 * The selects are memoised and sit directly beside the search box; an inline
 * `(v) => onChange(f.key, v)` would hand each of them a brand-new function on every keystroke and
 * defeat the memo entirely. Handlers are cached by key (which never changes for a given page) and
 * read the caller's current `onChange` through a ref, so a page that doesn't memoise its own
 * handler still always gets the latest one.
 */
function useFieldChange(onChange) {
  const latest = useRef(onChange);
  latest.current = onChange;
  const cache = useRef(new Map()).current;
  return useCallback(
    (key) => {
      let handler = cache.get(key);
      if (!handler) {
        handler = (value) => latest.current(key, value);
        cache.set(key, handler);
      }
      return handler;
    },
    [cache],
  );
}

/** One shared empty array, so an unset multi-select doesn't get a fresh `[]` every render. */
const NO_VALUES = [];

/**
 * One filter, as its own memoised control.
 *
 * It exists for the memo boundary, not the markup: a single select leads with an "All" sentinel,
 * and building `[sentinel, ...options]` in the parent produced a new array every render — exactly
 * the prop the memoised select compares, so the memo could never hold.
 */
const FilterControl = memo(function FilterControl({ field, value, onChange }) {
  const allLabel = field.allLabel ?? `All ${field.label.toLowerCase()}`;
  const options = useMemo(
    () =>
      field.multiple || field.scope
        ? field.options
        : [{ value: FILTER_ALL, label: allLabel }, ...field.options],
    [field.multiple, field.scope, field.options, allLabel],
  );

  const shared = 'w-[calc(50%-0.25rem)] sm:w-auto sm:min-w-[9.5rem] sm:max-w-[15rem]';

  if (field.multiple) {
    return (
      <MultiSelect
        ariaLabel={field.label}
        options={options}
        value={Array.isArray(value) ? value : NO_VALUES}
        onChange={onChange}
        placeholder={allLabel}
        searchPlaceholder={`Search ${field.label.toLowerCase()}…`}
        className={shared}
      />
    );
  }

  return (
    <SearchableSelect
      ariaLabel={field.label}
      placeholder={field.label}
      searchPlaceholder={`Search ${field.label.toLowerCase()}…`}
      options={options}
      value={typeof value === 'string' ? value : undefined}
      onChange={onChange}
      className={shared}
    />
  );
});

/**
 * The toolbar above every list: search, the filter row, an optional sort control, and the page's
 * primary action.
 *
 * The bar re-renders on every keystroke — it owns the input. Its *children* must not: each
 * {@link FilterControl} is memoised and receives a stable field, value and handler, so typing
 * costs one input render rather than one per filter. Pages build `fields` in a `useMemo` to
 * complete that chain.
 *
 * `sort` is offered as well as the sortable column headers because on a phone the table becomes a
 * card list with no headers to click — without it, sorting would simply not exist there.
 */
export function ListToolbar({
  search,
  fields = [],
  values = {},
  onChange,
  onClear,
  hasActiveFilters = false,
  sort,
  actions,
  className,
}) {
  const noop = useCallback(() => {}, []);
  const changeFor = useFieldChange(onChange ?? noop);
  const shown = fields.filter((f) => !f.hidden);

  return (
    <div className={cn('mb-4 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between', className)}>
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {search && (
          <div className="relative w-full sm:w-auto sm:min-w-[15rem] sm:max-w-sm sm:flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
            <Input
              className="h-9 bg-surface pl-9"
              placeholder={search.placeholder ?? 'Search…'}
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              // A search box the user can't empty with one key is a small, constant irritation.
              type="search"
            />
          </div>
        )}
        {shown.map((f) => (
          <FilterControl
            key={f.key}
            field={f}
            value={f.multiple ? (values[f.key] ?? NO_VALUES) : (values[f.key] ?? FILTER_ALL)}
            onChange={changeFor(f.key)}
          />
        ))}
        {sort && (
          <div className="flex w-[calc(50%-0.25rem)] items-center gap-1.5 sm:w-auto">
            <ArrowDownUp className="hidden size-4 shrink-0 text-ink-3 sm:block" aria-hidden="true" />
            <SearchableSelect
              ariaLabel="Sort by"
              placeholder="Sort by"
              searchPlaceholder="Search sort options…"
              options={sort.options}
              value={sort.value}
              onChange={sort.onChange}
              className="w-full sm:w-auto sm:min-w-[10rem] sm:max-w-[15rem]"
            />
          </div>
        )}
        {hasActiveFilters && onClear && (
          <Button variant="ghost" size="sm" onClick={onClear} className="gap-1.5 text-ink-2">
            <X className="size-4" />
            Clear
          </Button>
        )}
      </div>

      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
