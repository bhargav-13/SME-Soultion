import React, { useState } from "react";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import ColumnFilter from "../ColumnFilter";

const splitHeaderLabel = (label, maxChars = 14) => {
  // Attach "/" to the preceding word so "Box / Pcs" → tokens ["Box /", "Pcs"]
  // This keeps the slash visible and prevents it starting a new line.
  const raw = String(label || "").trim().split(/\s+/);
  const tokens = [];
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === "/" && tokens.length > 0) {
      tokens[tokens.length - 1] += " /";
    } else {
      tokens.push(raw[i]);
    }
  }

  const lines = [];
  let current = "";
  tokens.forEach((token) => {
    if (!current) { current = token; return; }
    const next = `${current} ${token}`;
    if (next.length <= maxChars) { current = next; }
    else { lines.push(current); current = token; }
  });
  if (current) lines.push(current);
  return lines.length ? lines : [String(label || "")];
};

/**
 * EditableClientTable
 *
 * readOnlyCols – Set (or array converted to Set) of column indices that are
 *                NOT editable. Clicking them never triggers edit mode.
 */
const EditableClientTable = ({
  columns,
  rows,
  selectedCell,
  editingCell,
  onCellClick,
  onCellChange,
  onCellBlur,
  onLastCellTab,
  readOnlyCols = [],
  colWidths = {},
  tableMinWidth = "",
  scrollHeightClass = "max-h-[560px]",
  modifiedRowIndices = new Set(),
  collapsibleFrom = -1,
  filterableCols = [],
  columnDistinctValues = {},
  columnFilters = {},
  onColumnFilterChange,
}) => {
  const filterableSet = new Set(filterableCols);
  const readOnlySet = new Set(readOnlyCols);
  const hasCollapsible = collapsibleFrom >= 0 && collapsibleFrom < columns.length;
  const [expanded, setExpanded] = useState(false);
  const isColHidden = (colIndex) => hasCollapsible && !expanded && colIndex >= collapsibleFrom;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className={`${scrollHeightClass} overflow-auto scrollbar-thin`}>
        <table className={`w-max min-w-full table-auto ${tableMinWidth}`.trim()}>
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200">
              {columns.map((col, colIndex) => {
                if (isColHidden(colIndex)) return null;
                return (
                  <React.Fragment key={col}>
                    {hasCollapsible && colIndex === collapsibleFrom && (
                      <th className="sticky top-0 z-10 px-1 py-3 bg-gray-100 border-r border-gray-200 min-w-[36px]">
                        <button
                          type="button"
                          onClick={() => setExpanded((v) => !v)}
                          title={expanded ? "Collapse columns" : "Expand columns"}
                          className="p-1 rounded hover:bg-gray-200 transition text-gray-600"
                        >
                          {expanded ? <ChevronsLeft className="w-4 h-4" /> : <ChevronsRight className="w-4 h-4" />}
                        </button>
                      </th>
                    )}
                    <th
                      className={`sticky top-0 z-10 whitespace-normal px-3 py-3 text-center text-sm font-[550] border-r border-gray-200 last:border-r-0 bg-gray-100 ${
                        readOnlySet.has(colIndex) ? "text-gray-400" : "text-gray-900"
                      }`}
                    >
                      <div className="inline-flex items-center justify-center gap-0.5">
                        <span className="inline-flex flex-col items-center leading-tight">
                          {splitHeaderLabel(col).map((line, idx) => (
                            <span key={`${col}-${idx}`}>{line}</span>
                          ))}
                        </span>
                        {filterableSet.has(colIndex) && onColumnFilterChange && (
                          <ColumnFilter
                            options={columnDistinctValues[colIndex] || []}
                            selected={columnFilters[colIndex] ?? null}
                            onChange={(sel) => onColumnFilterChange(colIndex, sel)}
                          />
                        )}
                      </div>
                    </th>
                  </React.Fragment>
                );
              })}
              {hasCollapsible && !expanded && (
                <th className="sticky top-0 z-10 px-1 py-3 bg-gray-100 border-r border-gray-200 min-w-[36px]">
                  <button
                    type="button"
                    onClick={() => setExpanded(true)}
                    title="Expand columns"
                    className="p-1 rounded hover:bg-gray-200 transition text-gray-600"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`} className={`border-b border-gray-200 ${modifiedRowIndices.has(rowIndex) ? "bg-yellow-50" : "hover:bg-gray-50"}`}>
                {row.map((value, colIndex) => {
                  if (isColHidden(colIndex)) return null;
                  const cellId = `${rowIndex}-${colIndex}`;
                  const isReadOnly = readOnlySet.has(colIndex);
                  const isEditing = !isReadOnly && editingCell === cellId;
                  const isSelected = !isReadOnly && selectedCell === cellId;

                  return (
                    <React.Fragment key={`${rowIndex}-${columns[colIndex]}`}>
                      {hasCollapsible && colIndex === collapsibleFrom && (
                        <td className="h-10 px-1 py-1 border-r border-gray-200" />
                      )}
                      <td
                        className={`h-10 ${colWidths[colIndex] ?? 'min-w-[84px]'} px-3 py-3 text-center text-sm border-r border-gray-200 last:border-r-0
                          ${isReadOnly ? "bg-gray-50 text-gray-400 select-none" : "text-gray-500 cursor-pointer"}
                          ${isSelected ? "ring-2 ring-gray-400 ring-inset" : ""}
                        `}
                        onClick={() => !isReadOnly && onCellClick(rowIndex, colIndex)}
                      >
                        {isEditing ? (
                          <input
                            autoFocus
                            value={value}
                            onChange={(e) => onCellChange(rowIndex, colIndex, e.target.value)}
                            onBlur={() => onCellBlur(cellId)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.currentTarget.blur();
                                return;
                              }
                              if (
                                e.key === "Tab" &&
                                !e.shiftKey &&
                                onLastCellTab &&
                                rowIndex === rows.length - 1 &&
                                colIndex === columns.length - 1
                              ) {
                                e.preventDefault();
                                onLastCellTab();
                              }
                            }}
                            className="w-full rounded text-start text-sm focus:outline-none focus:ring-none focus:ring-gray-300"
                          />
                        ) : (
                          <span className={value ? (isReadOnly ? "text-gray-400" : "text-gray-500") : "text-gray-300"}>
                            {value || " "}
                          </span>
                        )}
                      </td>
                    </React.Fragment>
                  );
                })}
                {hasCollapsible && !expanded && <td className="h-10 px-1 py-1 border-r border-gray-200" />}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EditableClientTable;
