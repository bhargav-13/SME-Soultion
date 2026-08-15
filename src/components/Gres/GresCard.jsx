import { useMemo, useState } from 'react';
import { ChevronDown, CircleCheck, SquarePen, Trash2 } from 'lucide-react';
import GresStatusDropdown from './GresStatusDropdown';
import { PrintSizeButton } from '@/components/PrintSizeButton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const round3 = (n) => Math.round(n * 1000) / 1000;
const fmt = (v) => (v == null || v === '' ? '—' : v);
const fmtDate = (s) => {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString('en-IN');
  } catch {
    return s;
  }
};

/** A column inside one of the card's data grids: a quiet caption over a bold figure. */
const Cell = ({ label, children, align = 'left' }) => (
  <div className={cn('min-w-0', align === 'center' && 'text-center', align === 'right' && 'text-right')}>
    <p className="text-[10.5px] font-medium tracking-[0.04em] text-ink-3 uppercase">{label}</p>
    <p className="mt-0.5 truncate font-mono text-[13px] font-semibold text-ink">{children}</p>
  </div>
);

const GresCard = ({ gres, onEdit, onDelete, onStatusChange, onReturnRecord, onEditReturn, onDeleteReturn, onPrint }) => {
  const [expanded, setExpanded] = useState(false);
  const [printLoading, setPrintLoading] = useState(null);
  const primaryItem = gres.items?.[0] || {};
  const returns = useMemo(() => gres.returns || [], [gres.returns]);

  const totals = useMemo(() => {
    // Total Return = gross weight returned; Total Net = net after tare.
    const totalReturn = round3(returns.reduce((sum, item) => sum + (Number(item.grossKg) || 0), 0));
    const totalNet = round3(returns.reduce((sum, item) => sum + (Number(item.netKg) || 0), 0));
    // Ghati: totalReturned - jobNet (positive = returned more, negative = shortfall).
    const jobNet = Number(primaryItem.qtyKg) || 0;
    const totalGhati = returns.length ? round3(totalNet - jobNet) : 0;
    return { totalReturn, totalNet, totalGhati };
  }, [returns, primaryItem.qtyKg]);

  const productName = primaryItem.itemName || primaryItem.size || '—';
  const sizeLabel = primaryItem.size || '—';
  const elementLabel =
    primaryItem.element != null
      ? `${primaryItem.element} ${primaryItem.elementType === 'DRUM' ? 'Drum' : 'Peti'}`
      : '—';

  const handlePrint = (formType, size) => onPrint?.(gres, formType, size, setPrintLoading);

  return (
    <Card className="gap-0 rounded-xl p-4">
      {/* Identity: what it is, which chitthi, for whom, when. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-ink">
            {productName}
            {primaryItem.size && primaryItem.size !== productName && (
              <span className="ml-2 text-[12.5px] font-normal text-ink-3">({primaryItem.size})</span>
            )}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink-3">
            <span className="font-mono font-semibold text-ink-2">{gres.chithiNo || `GRES-${gres.id}`}</span>
            <span className="inline-block size-1 rounded-full bg-ink-3/50" />
            <span>{gres.vendorName || '—'}</span>
            <span className="inline-block size-1 rounded-full bg-ink-3/50" />
            <span>
              Rate <span className="font-mono font-semibold text-ink">{fmt(primaryItem.ratePerKg)}</span>
            </span>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="text-right text-[11.5px] text-ink-3">
            <p>
              Date <span className="font-mono font-semibold text-ink-2">{fmtDate(gres.date)}</span>
            </p>
            <p>
              Time <span className="font-mono font-semibold text-ink-2">{fmt(gres.time)}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label="Edit gres">
              <SquarePen className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onDelete}
              aria-label="Delete gres"
              className="text-danger hover:bg-danger-soft hover:text-danger"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Items — what went out. */}
        <div className="rounded-lg border border-line bg-surface-2 p-3.5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-[13px] font-semibold text-ink">Items</p>
            <PrintSizeButton printing={printLoading === 'javak'} onPrint={(size) => handlePrint('JAVAK', size)} />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <Cell label="Size">{sizeLabel}</Cell>
            <Cell label="Element" align="center">
              {elementLabel}
            </Cell>
            <Cell label="Kg." align="center">
              {fmt(primaryItem.qtyKg)} Kg
            </Cell>
            <Cell label="Rate/Kg" align="right">
              {fmt(primaryItem.ratePerKg)}
            </Cell>
          </div>
          <p className="mt-2.5 text-[11.5px] text-ink-3">
            Qty Pc <span className="font-mono font-semibold text-ink">{fmt(primaryItem.qtyPc)}</span>
          </p>
        </div>

        {/* Return — what came back. */}
        <div className="rounded-lg border border-line bg-surface-2 p-3.5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-semibold text-ink">Return</p>
              {returns.length > 0 && <span className="text-[11.5px] text-ink-3">({returns.length})</span>}
            </div>
            <div className="flex items-center gap-1.5">
              {returns.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setExpanded((prev) => !prev)}>
                  {expanded ? 'Collapse' : 'Expand'}
                  <ChevronDown className={cn('size-3.5 transition-transform', expanded && 'rotate-180')} />
                </Button>
              )}
              <PrintSizeButton printing={printLoading === 'aavak'} onPrint={(size) => handlePrint('AAVAK', size)} />
            </div>
          </div>

          {returns.length === 0 ? (
            <p className="text-[12.5px] text-ink-3 italic">No return recorded yet</p>
          ) : (
            <>
              {expanded && (
                <div className="mb-3 space-y-2.5">
                  {returns.map((ret) => (
                    <div key={ret.id} className="rounded-lg border border-line bg-surface p-3">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-ink-3">
                          Return <span className="font-mono font-medium text-ink-2">{fmtDate(ret.returnDate)}</span>
                        </span>
                        <div className="flex items-center gap-0.5">
                          <Button variant="ghost" size="icon-xs" onClick={() => onEditReturn(ret)} aria-label="Edit return">
                            <SquarePen className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => onDeleteReturn(ret)}
                            aria-label="Delete return"
                            className="text-danger hover:bg-danger-soft hover:text-danger"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <Cell label="Element">{ret.returnElement || '—'}</Cell>
                        <Cell label="Return Kg." align="center">
                          {fmt(ret.grossKg)} Kg
                        </Cell>
                        <Cell label="Net Kg" align="center">
                          {fmt(ret.netKg)} Kg
                        </Cell>
                        <Cell label="Rate/Kg" align="right">
                          {fmt(ret.rsKg)}
                        </Cell>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 border-t border-dashed border-line pt-2.5">
                <Cell label="Total return">{totals.totalReturn ? `${totals.totalReturn} Kg` : '—'}</Cell>
                <Cell label="Total net" align="center">
                  {totals.totalNet ? `${totals.totalNet} Kg` : '—'}
                </Cell>
                <Cell label="Total ghati" align="right">
                  {totals.totalGhati || '—'}
                </Cell>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {/* Not locked once Complete: the server auto-completes on the first return and reverts to
            Pending when the last one is deleted, so the dropdown stays available for corrections. */}
        <GresStatusDropdown value={gres.status} onChange={(value) => onStatusChange(gres, value)} />
        <Button size="sm" variant="secondary" onClick={onReturnRecord} className="gap-1.5">
          Return record
          <CircleCheck className="size-4" />
        </Button>
      </div>
    </Card>
  );
};

export default GresCard;
