import { useState } from 'react';
import { ChevronDown, CircleCheck, Merge, SquarePen, Trash2 } from 'lucide-react';
import JobWorkBajaarControl from './JobWorkBajaarControl';
import JobWorkStatusDropdown from './JobWorkStatusDropdown';
import JobWorkTypeDropdown from './JobWorkTypeDropdown';
import { PrintSizeButton } from '@/components/PrintSizeButton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { printJobWorkChitthi } from '@/utils/jobWorkChitthi';
import { cn } from '@/lib/utils';

const fmt = (v) => (v == null || v === '' ? '—' : v);
const fmtNumber = (value, decimals) => {
  if (value == null || value === '') return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  if (typeof decimals === 'number') return num.toFixed(decimals);
  return String(Math.round(num));
};
const fmtDate = (s) => {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString('en-IN');
  } catch {
    return s;
  }
};

const round3 = (n) => Math.round(n * 1000) / 1000;

/** A column inside one of the card's data grids: a quiet caption over a bold figure. */
const Cell = ({ label, children, align = 'left' }) => (
  <div className={cn('min-w-0', align === 'center' && 'text-center', align === 'right' && 'text-right')}>
    <p className="text-[10.5px] font-medium tracking-[0.04em] text-ink-3 uppercase">{label}</p>
    <p className="mt-0.5 truncate font-mono text-[13px] font-semibold text-ink">{children}</p>
  </div>
);

/**
 * One job-work chitthi: what went out, what has come back, and the controls to move it along.
 *
 * The two panels are deliberately symmetrical — a floor supervisor reads "sent" against
 * "returned", and the remaining figure at the bottom right is the number the whole card exists
 * to produce.
 */
const JobWorkCard = ({
  jw,
  fixedBajaar,
  onStatusChange,
  onTypeChange,
  onBajaarChange,
  onReturnRecord,
  onEditReturn,
  onDeleteReturn,
  onEdit,
  onDelete,
}) => {
  const returns = jw.jobWorkReturns || [];
  const mergedCount = (jw.mergedOrderItemIds || []).length;
  const [printingKey, setPrintingKey] = useState(null);
  const [returnExpanded, setReturnExpanded] = useState(false);

  const sizeLabel =
    [jw.size?.sizeInInch, jw.size?.sizeInMm ? `(${jw.size.sizeInMm})` : null].filter(Boolean).join(' ') || '—';

  const elementLabel =
    jw.elementCount != null ? `${jw.elementCount} ${jw.elementType === 'DRUM' ? 'Drum' : 'Peti'}` : '—';

  // ret.returnKg is already the net kg (backend computes it from grossKg - element*petiWeight)
  const totalReturnNetKg = round3(returns.reduce((sum, r) => sum + (r.returnKg || 0), 0));
  const totalGhati = round3(returns.reduce((sum, r) => sum + (r.ghati || 0), 0));
  const totalReturnWithGhati = round3(totalReturnNetKg + totalGhati);
  const sentKg = jw.qtyKg || 0;
  const remainingKg = round3(Math.max(0, sentKg - totalReturnWithGhati));
  const isFullyReturned = sentKg > 0 && totalReturnWithGhati >= sentKg;
  const processLabel = /sartin/i.test(String(jw.finish || '')) ? 'Sartin' : 'Emrey';

  return (
    <Card className="gap-0 rounded-xl p-4" onDoubleClick={onEdit}>
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[14px] font-semibold text-ink">{jw.jobWorkLabel || `JW-${jw.id}`}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink-3">
            <span>{jw.party?.name || '—'}</span>
            {jw.size?.category && (
              <>
                <span className="inline-block size-1 rounded-full bg-ink-3/50" />
                <span>
                  {jw.size.itemName ? `${jw.size.itemName} — ` : ''}
                  {jw.size.category}
                </span>
              </>
            )}
            <span className="inline-block size-1 rounded-full bg-ink-3/50" />
            <span>
              Finish <span className="font-semibold text-ink">{fmt(jw.finish)}</span>
            </span>
            {mergedCount > 1 && (
              <>
                <span className="inline-block size-1 rounded-full bg-ink-3/50" />
                {/* One batch, several orders. Worth saying on the card: the Net Kg below is the
                    whole chitthi, not any one line's share. */}
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary"
                  title={`Covers order lines ${jw.mergedOrderItemIds.join(', ')}`}
                >
                  <Merge className="size-3" />
                  Merged · {mergedCount} orders
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="text-right text-[11.5px] text-ink-3">
            <p>
              Date <span className="font-mono font-semibold text-ink-2">{fmtDate(jw.jobDate || jw.date)}</span>
            </p>
            <p>
              Created <span className="font-mono font-semibold text-ink-2">{fmtDate(jw.createdAt)}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label="Edit job work">
              <SquarePen className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onDelete}
              aria-label="Delete job work"
              className="text-danger hover:bg-danger-soft hover:text-danger"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Items + Return panels */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Items panel */}
        <div className="rounded-lg border border-line bg-surface-2 p-3.5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-[13px] font-semibold text-ink">Items</p>
            <PrintSizeButton
              printing={printingKey === 'javak'}
              onPrint={(size) => printJobWorkChitthi(jw, 'JAVAK', size, setPrintingKey)}
            />
          </div>

          <div className="grid grid-cols-5 gap-2">
            <Cell label="Size">{sizeLabel}</Cell>
            <Cell label="Peti" align="center">
              {elementLabel}
            </Cell>
            <Cell label="Process" align="center">
              {processLabel}
            </Cell>
            <Cell label="Gross Kg" align="center">
              {fmt(jw.grossKg)} Kg
            </Cell>
            <Cell label="Net Kg" align="right">
              {fmt(jw.qtyKg)} Kg
            </Cell>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <Cell label="Total Pcs">{fmtNumber(jw.qtyPc)}</Cell>
            <Cell label="Sticker qty" align="center">
              {fmtNumber(jw.stickerQty, 0)}
            </Cell>
            <Cell label="Total carton" align="right">
              {fmtNumber(jw.totalCarton, 2)}
            </Cell>
          </div>

          <div className="mt-2.5 flex items-center justify-between border-t border-dashed border-line pt-2.5 text-[11.5px] text-ink-3">
            <span>
              Rate/Kg <span className="font-mono font-semibold text-ink">{fmt(jw.ratePerKg)}</span>
            </span>
            <span>
              Total rate <span className="font-mono font-semibold text-ink">{fmt(jw.totalRate)}</span>
            </span>
          </div>
        </div>

        {/* Return panel */}
        <div className="rounded-lg border border-line bg-surface-2 p-3.5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-semibold text-ink">Return</p>
              {returns.length > 0 && <span className="text-[11.5px] text-ink-3">({returns.length})</span>}
            </div>
            <div className="flex items-center gap-1.5">
              {returns.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setReturnExpanded((p) => !p)}>
                  {returnExpanded ? 'Collapse' : 'Expand'}
                  <ChevronDown className={cn('size-3.5 transition-transform', returnExpanded && 'rotate-180')} />
                </Button>
              )}
              <PrintSizeButton
                printing={printingKey === 'aavak'}
                onPrint={(size) => printJobWorkChitthi(jw, 'AAVAK', size, setPrintingKey)}
              />
            </div>
          </div>

          {returns.length === 0 ? (
            <p className="text-[12.5px] text-ink-3 italic">No return recorded yet</p>
          ) : (
            <>
              {/* Expanded: show individual return records */}
              {returnExpanded && (
                <div className="mb-3 space-y-2.5">
                  {returns.map((ret) => (
                    <div key={ret.id} className="rounded-lg border border-line bg-surface p-3">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-ink-3">
                          {ret.jobReturnDate ? (
                            <>
                              Return{' '}
                              <span className="font-mono font-medium text-ink-2">{fmtDate(ret.jobReturnDate)}</span>
                            </>
                          ) : (
                            fmtDate(ret.createdAt)
                          )}
                        </span>
                        <div className="flex items-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => onEditReturn(ret)}
                            aria-label="Edit return"
                          >
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
                        <Cell label="Peti">
                          {ret.returnElementCount != null
                            ? `${ret.returnElementCount} ${ret.elementType === 'DRUM' ? 'Drum' : 'Peti'}`
                            : '—'}
                        </Cell>
                        <Cell label="Gross Kg" align="center">
                          {fmt(ret.grossKg)} Kg
                        </Cell>
                        <Cell label="Net Kg" align="center">
                          {fmt(ret.returnKg)} Kg
                        </Cell>
                        <Cell label="Ghati" align="right">
                          {fmt(ret.ghati)}
                        </Cell>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary totals (always visible) */}
              <div className="grid grid-cols-2 gap-2 border-t border-dashed border-line pt-2.5">
                <Cell label="Total net returned">{totalReturnNetKg ? `${totalReturnNetKg} Kg` : '—'}</Cell>
                <Cell label="Total ghati" align="right">
                  {totalGhati || '—'}
                </Cell>
              </div>

              {/* Remaining Kg — the figure this card exists to produce. */}
              <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2.5">
                <span className="text-[10.5px] font-medium tracking-[0.04em] text-ink-3 uppercase">Remaining</span>
                <span
                  className={cn(
                    'font-mono text-[13px] font-semibold',
                    isFullyReturned ? 'text-success' : 'text-danger',
                  )}
                >
                  {isFullyReturned ? 'Fully returned' : `${remainingKg} Kg`}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {/* Not locked once Complete: the server auto-completes on the first return and reverts to
            Pending when the last one is deleted, so the dropdown stays available for corrections. */}
        <JobWorkStatusDropdown value={jw.status} onChange={(v) => onStatusChange(jw, v)} />
        <JobWorkTypeDropdown value={jw.jobWorkType} onChange={(v) => onTypeChange(jw, v)} />
        <JobWorkBajaarControl
          value={jw.bajaarType}
          amount={jw.bajaarValue}
          fixedAmount={fixedBajaar}
          onChange={(type, amount) => onBajaarChange(jw, type, amount)}
        />
        <Button size="sm" variant="secondary" onClick={onReturnRecord} className="gap-1.5">
          Return record
          <CircleCheck className="size-4" />
        </Button>
      </div>
    </Card>
  );
};

export default JobWorkCard;
