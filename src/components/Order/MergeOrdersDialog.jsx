import { useEffect, useMemo, useState } from 'react';
import { Layers, Merge } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/form-field';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const round3 = (n) => Math.round(n * 1000) / 1000;

const num = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** What the plater sees. A different size or finish is a different batch and never combines. */
const lineKey = (row) => `${row.sizeId}|${String(row.plating ?? '').trim().toLowerCase()}`;

/**
 * Two orders from the same party for the same item, size and finish are one job on the floor —
 * 100 Kg and 200 Kg go into the same drum. This picks those orders out and folds them into one.
 *
 * It offers whole *orders*, not lines. Merging is a fact about the orders, settled once, and
 * everything after it — chitthi, dispatch, packing — then follows without being told again.
 *
 * Only orders still at Created are offered. Once a line is with the plater or has gone out, its
 * quantity is no longer just a number on a sheet, and adding it to another order's would misreport
 * work that has already happened.
 */
const MergeOrdersDialog = ({ isOpen, onClose, rows, onMerge, isMerging }) => {
  const [selectedKey, setSelectedKey] = useState(null);
  const [excludedIds, setExcludedIds] = useState(() => new Set());
  const [scrap, setScrap] = useState('');

  // One entry per order, built from the flat line rows the sheet already holds.
  const orders = useMemo(() => {
    const byOrder = new Map();
    (rows || []).forEach((row) => {
      if (row.orderId == null || row.partyId == null) return;
      if (!byOrder.has(row.orderId)) {
        byOrder.set(row.orderId, {
          orderId: row.orderId,
          partyId: row.partyId,
          partyName: row.partyName,
          date: row.date,
          scrap: row.scrap,
          status: row.status,
          isMerged: (row.mergedFrom || []).length > 0,
          lines: [],
        });
      }
      byOrder.get(row.orderId).lines.push(row);
    });
    return [...byOrder.values()];
  }, [rows]);

  // Group by party, then keep only parties whose orders actually overlap on an item — two orders
  // with nothing in common can be merged, but there would be no reason to.
  const groups = useMemo(() => {
    const byParty = new Map();
    orders.forEach((order) => {
      // A merged order cannot be merged again, and neither can one that has already moved.
      if (order.isMerged) return;
      if (order.status && order.status !== 'CREATED') return;
      if (!byParty.has(order.partyId)) byParty.set(order.partyId, []);
      byParty.get(order.partyId).push(order);
    });

    return [...byParty.entries()]
      .map(([partyId, list]) => {
        const seen = new Map();
        list.forEach((order) => {
          new Set(order.lines.map(lineKey)).forEach((key) =>
            seen.set(key, (seen.get(key) || 0) + 1),
          );
        });
        const shared = [...seen.values()].filter((count) => count > 1).length;
        return { key: String(partyId), partyName: list[0].partyName, orders: list, shared };
      })
      .filter((group) => group.orders.length > 1 && group.shared > 0);
  }, [orders]);

  const active = groups.find((g) => g.key === selectedKey) || null;
  const chosen = useMemo(
    () => (active ? active.orders.filter((o) => !excludedIds.has(o.orderId)) : []),
    [active, excludedIds],
  );

  // What the merged order will look like: lines that match are added together, the rest ride
  // across untouched.
  const preview = useMemo(() => {
    const byKey = new Map();
    chosen.forEach((order) =>
      order.lines.forEach((row) => {
        const key = lineKey(row);
        if (!byKey.has(key)) {
          byKey.set(key, { itemName: row.itemName, size: row.size, plating: row.plating, kg: 0, pc: 0, from: 0 });
        }
        const entry = byKey.get(key);
        entry.kg += num(row.qtyKg);
        entry.pc += num(row.qtyPc);
        entry.from += 1;
      }),
    );
    return [...byKey.values()];
  }, [chosen]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedKey(null);
    setExcludedIds(new Set());
    setScrap('');
  }, [isOpen]);

  const selectGroup = (key) => {
    setSelectedKey(key);
    setExcludedIds(new Set());
    // The merged order inherits the sum of what was agreed on each; the user can correct it here
    // rather than having to find it on the sheet afterwards.
    const group = groups.find((g) => g.key === key);
    const total = (group?.orders || []).reduce((sum, o) => sum + num(o.scrap), 0);
    setScrap(total > 0 ? String(round3(total)) : '');
  };

  const toggleOrder = (orderId) =>
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[46rem]">
        <DialogHeader>
          <DialogTitle>Merge orders</DialogTitle>
          <DialogDescription>
            Orders from one party that share an item, size and finish become a single order — the
            matching quantities add together and everything else carries across. Only orders still
            at <span className="font-medium text-ink-2">Created</span> can be merged; anything
            already with the plater or dispatched is left out.
          </DialogDescription>
        </DialogHeader>

        {groups.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line px-4 py-10 text-center">
            <Layers className="mx-auto size-6 text-ink-3" />
            <p className="mt-2 text-[13px] font-medium text-ink">Nothing to merge</p>
            <p className="mt-1 text-[12.5px] text-ink-3">
              No party has two untouched orders sharing an item, size and finish.
            </p>
          </div>
        ) : (
          <div className="max-h-[24rem] space-y-2.5 overflow-y-auto pr-1">
            {groups.map((group) => {
              const isActive = group.key === selectedKey;
              return (
                <div
                  key={group.key}
                  className={cn(
                    'rounded-lg border p-3 transition-colors',
                    isActive ? 'border-primary/60 bg-primary-soft/30' : 'border-line bg-surface',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => selectGroup(group.key)}
                    className="flex w-full items-start justify-between gap-3 text-left"
                  >
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-ink">{group.partyName}</span>
                      <span className="mt-0.5 block text-[12px] text-ink-3">
                        {group.shared} item{group.shared > 1 ? 's' : ''} in common
                      </span>
                    </span>
                    <Badge variant={isActive ? 'accent' : 'muted'} className="shrink-0">
                      {group.orders.length} orders
                    </Badge>
                  </button>

                  {isActive && (
                    <div className="mt-3 space-y-1.5 border-t border-line pt-2.5">
                      {group.orders.map((order) => (
                        <label
                          key={order.orderId}
                          className="flex cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1 hover:bg-surface-2"
                        >
                          <Checkbox
                            checked={!excludedIds.has(order.orderId)}
                            onCheckedChange={() => toggleOrder(order.orderId)}
                          />
                          <span className="flex-1 text-[12.5px] text-ink-2">
                            Order <span className="font-mono text-ink">#{order.orderId}</span>
                            <span className="text-ink-3"> · {order.date}</span>
                          </span>
                          <span className="text-[12px] text-ink-3">
                            {order.lines.length} line{order.lines.length > 1 ? 's' : ''}
                          </span>
                          <span className="w-24 text-right font-mono text-[12px] text-ink-3">
                            {order.scrap == null ? 'No scrap' : `Scrap ${order.scrap}`}
                          </span>
                        </label>
                      ))}

                      {preview.length > 0 && (
                        <div className="mt-2 space-y-1 border-t border-dashed border-line pt-2">
                          <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-3 uppercase">
                            Merged order
                          </p>
                          {preview.map((line, i) => (
                            <div key={i} className="flex items-center gap-2 text-[12.5px]">
                              <span className="min-w-0 flex-1 truncate text-ink-2">
                                {line.itemName} · {line.size} · {line.plating}
                                {line.from > 1 && (
                                  <span className="ml-1.5 rounded-full bg-primary-soft px-1.5 py-0.5 text-[10.5px] font-semibold text-primary">
                                    {line.from} merged
                                  </span>
                                )}
                              </span>
                              <span className="font-mono font-semibold text-ink">
                                {round3(line.kg)} Kg
                              </span>
                              <span className="w-20 text-right font-mono text-ink-3">
                                {round3(line.pc)} pc
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {active && (
          <Field label="Scrap" hint="Summed from the orders being merged — change it if that is not what was agreed">
            <Input
              type="number"
              step="any"
              min="0"
              inputMode="decimal"
              value={scrap}
              placeholder="Not agreed"
              onChange={(e) => setScrap(e.target.value)}
              className="font-mono"
            />
          </Field>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isMerging}>
            Cancel
          </Button>
          <Button
            disabled={chosen.length < 2 || isMerging}
            onClick={() =>
              onMerge(
                chosen.map((o) => o.orderId),
                String(scrap).trim() === '' ? null : Number(scrap),
              )
            }
          >
            <Merge className="size-4" />
            {isMerging ? 'Merging…' : `Merge ${chosen.length > 1 ? `${chosen.length} orders` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MergeOrdersDialog;
