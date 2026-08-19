import { useMemo, useState } from 'react';
import { Layers, Merge } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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

const toKg = (row) => {
  const value = Number(row.qtyKg);
  return Number.isFinite(value) ? value : 0;
};

const toPc = (row) => {
  const value = Number(row.qtyPc);
  return Number.isFinite(value) ? value : 0;
};

/**
 * Two order lines with the same party, item, size and finish are one batch on the shop floor —
 * they go into the same drum and come back together. This finds those lines and lets them be sent
 * as a single chitthi.
 *
 * The grouping key is deliberately strict. Anything that would make the plater treat the goods
 * differently (a different finish, a different size) must not be merged, because the chitthi is
 * what the plater actually works from.
 *
 * A line that has already been out once is still offered — the works sends a line to the plater in
 * batches, so the rest of it can legitimately ride along on a later chitthi. Those lines are
 * flagged and start unticked, so including one is always a deliberate choice.
 */
const MergeJobWorkDialog = ({ isOpen, onClose, rows, onMerge }) => {
  const [selectedKey, setSelectedKey] = useState(null);
  const [excludedIds, setExcludedIds] = useState(() => new Set());

  const groups = useMemo(() => {
    const buckets = new Map();
    (rows || []).forEach((row) => {
      // A merged chitthi is created against real order lines, so both ids must exist. Nothing
      // else is excluded: a line that has already been to the plater once may go again — the
      // works sends a line out in batches, so "already actioned" is not "finished".
      if (row.sizeId == null || row.partyId == null) return;

      const finish = String(row.plating ?? '').trim().toLowerCase();
      const key = `${row.partyId}|${row.sizeId}|${finish}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(row);
    });
    return [...buckets.entries()]
      .filter(([, items]) => items.length > 1)
      .map(([key, items]) => ({ key, items }));
  }, [rows]);

  const active = groups.find((g) => g.key === selectedKey) || null;
  const chosen = active ? active.items.filter((row) => !excludedIds.has(row.id)) : [];
  const totalKg = round3(chosen.reduce((sum, row) => sum + toKg(row), 0));
  const totalPc = round3(chosen.reduce((sum, row) => sum + toPc(row), 0));

  const selectGroup = (key) => {
    setSelectedKey(key);
    // Lines that have already been out to the plater start unticked — they are offered (a line
    // can be sent in batches) but never swept into a merge by accident.
    const group = groups.find((g) => g.key === key);
    setExcludedIds(
      new Set((group?.items || []).filter((row) => row.platingStatus).map((row) => row.id)),
    );
  };

  const toggleRow = (id) =>
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleClose = () => {
    setSelectedKey(null);
    setExcludedIds(new Set());
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[46rem]">
        <DialogHeader>
          <DialogTitle>Merge into one job work</DialogTitle>
          <DialogDescription>
            Order lines that match on party, item, size and finish can go to the plater as a single
            chitthi. The combined weight is split back across the lines, so each order still reports
            its own progress.
          </DialogDescription>
        </DialogHeader>

        {groups.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line px-4 py-10 text-center">
            <Layers className="mx-auto size-6 text-ink-3" />
            <p className="mt-2 text-[13px] font-medium text-ink">Nothing to merge</p>
            <p className="mt-1 text-[12.5px] text-ink-3">
              No two order lines share the same party, item, size and finish. All four have to
              match — a different finish or size is a different batch to the plater.
            </p>
          </div>
        ) : (
          <div className="max-h-[24rem] space-y-2.5 overflow-y-auto pr-1">
            {groups.map((group) => {
              const first = group.items[0];
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
                      <span className="block text-[13px] font-semibold text-ink">
                        {first.partyName} · {first.itemName}
                      </span>
                      <span className="mt-0.5 block text-[12px] text-ink-3">
                        {first.size} · Finish{' '}
                        <span className="font-medium text-ink-2">{first.plating}</span>
                      </span>
                    </span>
                    <Badge variant={isActive ? 'accent' : 'muted'} className="shrink-0">
                      {group.items.length} lines
                    </Badge>
                  </button>

                  {isActive && (
                    <div className="mt-3 space-y-1.5 border-t border-line pt-2.5">
                      {group.items.map((row) => (
                        <label
                          key={row.id}
                          className="flex cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1 hover:bg-surface-2"
                        >
                          <Checkbox
                            checked={!excludedIds.has(row.id)}
                            onCheckedChange={() => toggleRow(row.id)}
                          />
                          <span className="flex-1 text-[12.5px] text-ink-2">
                            Order line <span className="font-mono text-ink">#{row.id}</span>
                            <span className="text-ink-3"> · {row.date}</span>
                            {row.platingStatus && (
                              <span className="ml-1.5 rounded-full bg-warning-soft px-1.5 py-0.5 text-[10.5px] font-semibold text-warning">
                                already sent
                              </span>
                            )}
                          </span>
                          <span className="font-mono text-[12.5px] font-semibold text-ink">
                            {toKg(row) ? `${round3(toKg(row))} Kg` : '—'}
                          </span>
                          <span className="w-20 text-right font-mono text-[12px] text-ink-3">
                            {toPc(row) ? `${round3(toPc(row))} pc` : '—'}
                          </span>
                        </label>
                      ))}

                      <div className="flex items-center justify-between border-t border-dashed border-line pt-2 text-[12.5px]">
                        <span className="font-medium text-ink-2">Merged chitthi</span>
                        <span className="font-mono font-semibold text-ink">
                          {totalKg} Kg · {totalPc} pc
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button disabled={chosen.length < 2} onClick={() => onMerge(chosen, { totalKg, totalPc })}>
            <Merge className="size-4" />
            Merge {chosen.length > 1 ? `${chosen.length} lines` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MergeJobWorkDialog;
