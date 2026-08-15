import { useCallback, useRef, useState } from 'react';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

/** The sentinel a single-select filter uses for its "no narrowing" choice. */
export const FILTER_ALL = 'ALL';

/** Rows per page when a list first opens, and the presets offered in the size dropdown. */
export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/**
 * The state every list page was otherwise going to wire by hand — a filters map, a debounced
 * search term, page and size — with the two rules that are easy to forget and jarring when missed:
 *
 *  - any filter or search change rewinds to the first page, so you can't be left staring at
 *    "page 4 of 1";
 *  - a parent filter change cascades to its dependants (party → item), so a stale narrower
 *    selection can't survive a change that invalidates it.
 *
 * `hasActiveFilters` compares against the page's own defaults rather than a hard-coded "ALL",
 * because a scope selector (the party a client price list is *for*) legitimately starts non-empty;
 * keys listed in `scopeKeys` narrow the fetch rather than the list, so they never count as
 * filtering.
 */
export function useListFilters({ defaults = {}, cascades, scopeKeys, initialSize = DEFAULT_PAGE_SIZE } = {}) {
  const [filters, setFilters] = useState(defaults);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(initialSize);

  // `defaults` and `cascades` are object literals in every caller's render body, so they arrive
  // with a fresh identity on each keystroke while never actually changing. Reading them through a
  // latest-value ref keeps the callbacks below stable for the page's whole life, which is what
  // lets memoised children (the filter dropdowns, the table body) skip re-rendering while someone
  // types.
  const config = useRef({ defaults, cascades });
  config.current = { defaults, cascades };

  const setFilter = useCallback((key, value) => {
    const { defaults: d, cascades: c } = config.current;
    setFilters((f) => {
      const next = { ...f, [key]: value };
      for (const dep of c?.[key] ?? []) next[dep] = d[dep];
      return next;
    });
    setPage(0);
  }, []);

  const onSearchChange = useCallback((value) => {
    setSearch(value);
    setPage(0);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(config.current.defaults);
    setSearch('');
    setPage(0);
  }, []);

  const changeSize = useCallback((next) => {
    setSize(next);
    // A different page length re-flows the list, so the current offset no longer means anything.
    setPage(0);
  }, []);

  const hasActiveFilters =
    debouncedSearch.trim() !== '' ||
    Object.keys(defaults).some((key) => {
      if (scopeKeys?.includes(key)) return false;
      const v = filters[key];
      return Array.isArray(v) ? v.length > 0 : v !== defaults[key];
    });

  return {
    filters,
    setFilter,
    setFilters,
    search,
    onSearchChange,
    debouncedSearch,
    page,
    setPage,
    size,
    setSize: changeSize,
    clearFilters,
    hasActiveFilters,
  };
}

/** `'ALL'` → undefined, anything else → itself: the wire mapping for a single-select filter. */
export function orAll(value) {
  return value === FILTER_ALL ? undefined : value;
}

/** A multi-select's values → what to send, or undefined when nothing is picked (i.e. "all"). */
export function orAllList(value) {
  return value && value.length > 0 ? value : undefined;
}

/**
 * Does [row] match [term] on any of [keys]? The one text-matching rule every in-memory list
 * search uses, so "search" means the same thing on every screen.
 */
export function matchesSearch(row, term, keys) {
  const q = term.trim().toLowerCase();
  if (!q) return true;
  return keys.some((key) => {
    const v = typeof key === 'function' ? key(row) : row?.[key];
    return v != null && String(v).toLowerCase().includes(q);
  });
}
