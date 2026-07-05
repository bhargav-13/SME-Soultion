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
        className={`ml-1 p-0.5 rounded transition ${
          active ? "text-blue-600 bg-blue-100" : "text-gray-400 hover:text-gray-700 hover:bg-gray-200"
        }`}
      >
        <Filter className="w-3.5 h-3.5" fill={active ? "currentColor" : "none"} />
      </button>

      {open && (
        <div
          ref={popRef}
          className="fixed z-[100] w-60 bg-white border border-gray-200 rounded-lg shadow-xl text-left font-normal"
          style={{ top: pos.top, left: pos.left }}
        >
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search values"
                className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 px-3 py-1.5 text-sm border-b border-gray-100 cursor-pointer hover:bg-gray-50 font-medium text-gray-800">
            <input type="checkbox" checked={allChecked} onChange={toggleAll} />
            (Select all)
          </label>

          <div className="max-h-56 overflow-y-auto py-1">
            {visible.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-400">No values</div>
            ) : (
              visible.map((v) => (
                <label
                  key={String(v)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50 text-gray-700"
                >
                  <input type="checkbox" checked={effective.has(v)} onChange={() => toggleValue(v)} />
                  <span className="truncate">{label(v)}</span>
                </label>
              ))
            )}
          </div>

          <div className="flex justify-between items-center px-3 py-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="text-xs text-gray-500 hover:text-gray-800"
            >
              Clear filter
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs px-2.5 py-1 bg-gray-900 text-white rounded hover:bg-gray-800"
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
