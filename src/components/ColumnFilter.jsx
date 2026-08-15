import React, { useEffect, useMemo, useRef, useState } from "react";
import { Filter, Search } from "lucide-react";

/**
 * Excel-style column filter: a funnel button in a column header that opens a checklist of the
 * column's distinct values (with a search box and "Select all"). Rows are shown only for the
 * checked values.
 *
 * `selected` is a Set of allowed values, or null when no filter is applied (all values shown).
 * `onChange(nextSelected)` receives a Set, or null when everything is selected (i.e. filter cleared).
 * Rendered as a fixed-position popover so it isn't clipped by the table's scroll container.
 */
const ColumnFilter = ({ options = [], selected, onChange }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const popRef = useRef(null);

  const active = selected != null;
  const effective = selected ?? new Set(options); // currently-checked values
  const allChecked = effective.size >= options.length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => String(o).toLowerCase().includes(q)) : options;
  }, [options, query]);

  const openPopover = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      const left = Math.min(Math.max(8, r.left - 110), window.innerWidth - 248);
      setPos({ top: r.bottom + 4, left });
    }
    setQuery("");
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (
        popRef.current && !popRef.current.contains(e.target) &&
        btnRef.current && !btnRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggleValue = (v) => {
    const next = new Set(effective);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange(next.size >= options.length ? null : next);
  };

  const toggleAll = () => onChange(allChecked ? new Set() : null);

  const label = (v) => (v === "" || v == null ? "(blank)" : String(v));

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          open ? setOpen(false) : openPopover();
        }}
        title="Filter"
        className={`ml-1 rounded p-0.5 transition ${
          active ? "bg-primary-soft text-primary" : "text-ink-3 hover:bg-surface-2 hover:text-ink"
        }`}
      >
        <Filter className="size-3.5" fill={active ? "currentColor" : "none"} />
      </button>

      {open && (
        <div
          ref={popRef}
          className="fixed z-[100] w-60 rounded-lg border border-line bg-surface text-left font-normal shadow-pop"
          style={{ top: pos.top, left: pos.left }}
        >
          <div className="border-b border-line-2 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-ink-3" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search values"
                className="w-full rounded border border-line bg-surface py-1.5 pr-2 pl-7 text-[13px] outline-none focus:ring-1 focus:ring-primary-ring"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 border-b border-line-2 px-3 py-1.5 text-[13px] font-medium text-ink hover:bg-surface-2">
            <input type="checkbox" checked={allChecked} onChange={toggleAll} className="accent-[var(--primary-base)]" />
            (Select all)
          </label>

          <div className="max-h-56 overflow-y-auto py-1">
            {visible.length === 0 ? (
              <div className="px-3 py-2 text-[12px] text-ink-3">No values</div>
            ) : (
              visible.map((v) => (
                <label
                  key={String(v)}
                  className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[13px] text-ink-2 hover:bg-surface-2"
                >
                  <input
                    type="checkbox"
                    checked={effective.has(v)}
                    onChange={() => toggleValue(v)}
                    className="accent-[var(--primary-base)]"
                  />
                  <span className="truncate">{label(v)}</span>
                </label>
              ))
            )}
          </div>

          <div className="flex items-center justify-between border-t border-line-2 px-3 py-2">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="text-[12px] text-ink-3 hover:text-ink"
            >
              Clear filter
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded bg-primary px-2.5 py-1 text-[12px] text-primary-foreground hover:bg-primary-hover"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ColumnFilter;
