import React, { useState } from 'react';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import ColumnFilter from '../ColumnFilter';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const splitHeaderLabel = (label, maxChars = 14) => {
  // Attach "/" to the preceding word so "Box / Pcs" → tokens ["Box /", "Pcs"]
  // This keeps the slash visible and prevents it starting a new line.
  const raw = String(label || '')
    .trim()
    .split(/\s+/);
  const tokens = [];
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '/' && tokens.length > 0) {
      tokens[tokens.length - 1] += ' /';
    } else {
      tokens.push(raw[i]);
    }
  }

  const lines = [];
  let current = '';
  tokens.forEach((token) => {
    if (!current) {
      current = token;
      return;
    }
    const next = `${current} ${token}`;
    if (next.length <= maxChars) {
      current = next;
    } else {
      lines.push(current);
      current = token;
    }
  });
  if (current) lines.push(current);
  return lines.length ? lines : [String(label || '')];
};

/** The sticky header cell, shared by every column so the row can't end up half-pinned. */
const HEADER_CELL =
  'sticky top-0 z-20 whitespace-normal border-r border-line bg-surface-2 px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.03em] last:border-r-0';

/**
 * EditableClientTable
 *
 * The client price sheet: a spreadsheet, not a list. Read-only identity columns on the left, the
 * editable packing and finish-price columns to the right, and the finish block collapsible because
 * thirteen price columns are rarely all wanted at once.
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
  tableMinWidth = '',
  scrollHeightClass = 'max-h-[min(60vh,560px)]',
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
    <Card className="min-w-0 gap-0 overflow-hidden py-0">
      <div className={cn(scrollHeightClass, 'min-w-0 overflow-auto scrollbar-thin')}>
        <table className={cn('w-max min-w-full table-auto', tableMinWidth)}>
          <thead>
            <tr className="border-b border-line bg-surface-2">
              {columns.map((col, colIndex) => {
                if (isColHidden(colIndex)) return null;
                return (
                  <React.Fragment key={col}>
                    {hasCollapsible && colIndex === collapsibleFrom && (
                      <th className="sticky top-0 z-20 min-w-[36px] border-r border-line bg-surface-2 px-1 py-2.5">
                        <button
                          type="button"
                          onClick={() => setExpanded((v) => !v)}
                          title={expanded ? 'Collapse price columns' : 'Expand price columns'}
                          className="rounded-md p-1 text-ink-3 transition-colors hover:bg-line-2 hover:text-ink"
                        >
                          {expanded ? <ChevronsLeft className="size-4" /> : <ChevronsRight className="size-4" />}
                        </button>
                      </th>
                    )}
                    <th
                      className={cn(HEADER_CELL, readOnlySet.has(colIndex) ? 'text-ink-3/70' : 'text-ink-3')}
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
                <th className="sticky top-0 z-20 min-w-[36px] border-r border-line bg-surface-2 px-1 py-2.5">
                  <button
                    type="button"
                    onClick={() => setExpanded(true)}
                    title="Expand price columns"
                    className="rounded-md p-1 text-ink-3 transition-colors hover:bg-line-2 hover:text-ink"
                  >
                    <ChevronsRight className="size-4" />
                  </button>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={`row-${rowIndex}`}
                className={cn(
                  'border-b border-line-2',
                  modifiedRowIndices.has(rowIndex) ? 'bg-warning-soft' : 'hover:bg-surface-2',
                )}
              >
                {row.map((value, colIndex) => {
                  if (isColHidden(colIndex)) return null;
                  const cellId = `${rowIndex}-${colIndex}`;
                  const isReadOnly = readOnlySet.has(colIndex);
                  const isEditing = !isReadOnly && editingCell === cellId;
                  const isSelected = !isReadOnly && selectedCell === cellId;

                  return (
                    <React.Fragment key={`${rowIndex}-${columns[colIndex]}`}>
                      {hasCollapsible && colIndex === collapsibleFrom && (
                        <td className="h-10 border-r border-line-2 px-1 py-1" />
                      )}
                      <td
                        className={cn(
                          'h-10 border-r border-line-2 px-3 py-2 text-center font-mono text-[12.5px] last:border-r-0',
                          colWidths[colIndex] ?? 'min-w-[84px]',
                          isReadOnly ? 'select-none bg-surface-2/70 text-ink-3' : 'cursor-pointer text-ink-2',
                          isSelected && 'ring-2 ring-primary/50 ring-inset',
                        )}
                        onClick={() => !isReadOnly && onCellClick(rowIndex, colIndex)}
                      >
                        {isEditing ? (
                          <input
                            autoFocus
                            value={value}
                            onChange={(e) => onCellChange(rowIndex, colIndex, e.target.value)}
                            onBlur={() => onCellBlur(cellId)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur();
                                return;
                              }
                              if (
                                e.key === 'Tab' &&
                                !e.shiftKey &&
                                onLastCellTab &&
                                rowIndex === rows.length - 1 &&
                                colIndex === columns.length - 1
                              ) {
                                e.preventDefault();
                                onLastCellTab();
                              }
                            }}
                            className="w-full rounded bg-transparent text-center font-mono text-[12.5px] text-ink outline-none"
                          />
                        ) : (
                          <span className={value ? (isReadOnly ? 'text-ink-3' : 'text-ink') : 'text-ink-3/50'}>
                            {value || '—'}
                          </span>
                        )}
                      </td>
                    </React.Fragment>
                  );
                })}
                {hasCollapsible && !expanded && <td className="h-10 border-r border-line-2 px-1 py-1" />}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default EditableClientTable;
