import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FormDialog } from '@/components/form-dialog';
import { Field, FieldGrid } from '@/components/form-field';
import { Notice } from '@/components/notice';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { cn } from '@/lib/utils';

const EMPTY_FORM = {
  returnElement: '',
  returnType: 'PETI',
  grossKg: '',
  petiWeightKg: '1',
};

const TYPE_OPTIONS = [
  { value: 'PETI', label: 'Peti' },
  { value: 'DRUM', label: 'Drum' },
];

const round3 = (n) => Math.round(n * 1000) / 1000;
const parseNumber = (v) => {
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

/** Excel: Net Kg = Kgs − Peti × 1-Peti Weight. */
const computeReturnNet = (form) => {
  const gross = parseNumber(form.grossKg);
  const count = parseNumber(form.returnElement);
  const tare = parseNumber(form.petiWeightKg);
  if (gross == null) return null;
  if (count == null || tare == null) return round3(gross);
  return round3(Math.max(0, gross - count * tare));
};

const fmt = (v, d = 3) => (v == null ? '—' : Number(v).toFixed(d));

const GresReturnDialog = ({ isOpen, gres, editingReturn, onClose, onSave }) => {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!isOpen) return;
    if (editingReturn) {
      setForm({
        returnElement: editingReturn.returnElement != null ? String(editingReturn.returnElement) : '',
        returnType: editingReturn.returnType || 'PETI',
        grossKg: editingReturn.grossKg != null ? String(editingReturn.grossKg) : '',
        petiWeightKg: editingReturn.petiWeightKg != null ? String(editingReturn.petiWeightKg) : '1',
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editingReturn, isOpen]);

  // Job's forward Net Kg — used for both the Diff live preview and the remaining-quota guard.
  const jobNet = useMemo(() => {
    const item = gres?.items?.[0];
    if (!item) return null;
    const n = parseNumber(item.qtyKg);
    return n == null ? null : round3(n);
  }, [gres]);

  // Everything already returned across other rows on this Gres.
  const otherReturnedNet = useMemo(() => {
    const rows = gres?.returns || [];
    return round3(
      rows.filter((r) => r.id !== editingReturn?.id).reduce((sum, r) => sum + (Number(r.returnKg) || 0), 0),
    );
  }, [gres, editingReturn?.id]);

  const remaining = useMemo(() => {
    if (jobNet == null) return null;
    return round3(Math.max(0, jobNet - otherReturnedNet));
  }, [jobNet, otherReturnedNet]);

  const returnNet = useMemo(() => computeReturnNet(form), [form]);
  // Diff is cumulative: all returns so far (incl. this one) vs the job's net. Negative = still
  // short (a shortfall / ghati); this makes the final entry read the true loss, not this row
  // measured against the whole job net.
  const ghati = useMemo(() => {
    if (returnNet == null || jobNet == null) return null;
    return round3(otherReturnedNet + returnNet - jobNet);
  }, [returnNet, jobNet, otherReturnedNet]);

  const fullyReturned = remaining != null && remaining <= 1e-6;

  const handleSave = () => {
    const gross = parseNumber(form.grossKg);
    const count = parseNumber(form.returnElement);
    const tare = parseNumber(form.petiWeightKg);
    if (gross == null || gross <= 0) {
      toast.error('Kgs is required and must be greater than 0');
      return;
    }
    if (count == null || count < 0) {
      toast.error('Enter the Peti count');
      return;
    }
    if (tare == null || tare < 0) {
      toast.error('Enter the 1 Peti Weight');
      return;
    }
    // Excel allows +Diff (returned more) but blocks further returns once the
    // full Job Net has already been accounted for.
    if (fullyReturned) {
      toast.error('This Gres is fully returned — no remaining Kg to record.');
      return;
    }

    onSave?.({
      id: editingReturn?.id || Date.now(),
      returnElement: form.returnElement,
      returnType: form.returnType,
      grossKg: round3(gross),
      petiWeightKg: round3(tare),
      returnKg: returnNet,
      ghati,
    });
  };

  const ghatiLabel = ghati == null ? '—' : `${ghati > 0 ? '+ ' : ghati < 0 ? '- ' : ''}${Math.abs(ghati)}`;

  return (
    <FormDialog
      open={isOpen && Boolean(gres)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Return aavak"
      description="Record what came back against this gres chitthi."
      size="lg"
      submitLabel="Save return"
      submitDisabled={fullyReturned}
      onSubmit={handleSave}
    >
      <div className="space-y-4">
        {/* Remaining-quota strip — the one number that decides whether this entry is allowed. */}
        <Notice tone={fullyReturned ? 'danger' : 'warning'}>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <span>
              Job net <span className="font-mono font-semibold text-ink">{fmt(jobNet)} Kg</span>
              <span className="mx-2 opacity-40">·</span>
              Already returned <span className="font-mono font-semibold text-ink">{otherReturnedNet} Kg</span>
            </span>
            <span>
              Remaining <span className="font-mono font-semibold text-ink">{fmt(remaining)} Kg</span>
            </span>
          </div>
        </Notice>

        {/* Row 1: Peti (left) | Kgs (right) — matches the Excel layout the floor works from. */}
        <FieldGrid columns={2}>
          <Field label="Peti" htmlFor="return-peti">
            <div className="flex items-center gap-2">
              <Input
                id="return-peti"
                type="number"
                min="0"
                step="1"
                value={form.returnElement}
                onChange={(e) => setForm((prev) => ({ ...prev, returnElement: e.target.value }))}
                placeholder="5"
                className="min-w-0 flex-1 font-mono"
              />
              <SearchableSelect
                ariaLabel="Element type"
                options={TYPE_OPTIONS}
                value={form.returnType}
                onChange={(value) => setForm((prev) => ({ ...prev, returnType: value }))}
                className="w-24 shrink-0"
                contentClassName="min-w-[8rem]"
              />
            </div>
          </Field>

          <Field label="Kgs" htmlFor="return-kgs" required>
            <Input
              id="return-kgs"
              type="number"
              step="0.001"
              value={form.grossKg}
              onChange={(e) => setForm((prev) => ({ ...prev, grossKg: e.target.value }))}
              placeholder="153.000"
              className="font-mono"
            />
          </Field>

          <Field label="1 Peti weight" htmlFor="return-tare">
            <Input
              id="return-tare"
              type="number"
              step="0.001"
              value={form.petiWeightKg}
              onChange={(e) => setForm((prev) => ({ ...prev, petiWeightKg: e.target.value }))}
              placeholder="1"
              className="font-mono"
            />
          </Field>

          <div className="hidden sm:block" />

          <Field label="Net Kg" hint="Net Kg = Kgs − Peti × 1-Peti Weight">
            <Input
              value={returnNet != null ? `${returnNet} kg` : ''}
              readOnly
              placeholder="Auto"
              className="bg-surface-2 font-mono font-medium text-ink"
            />
          </Field>

          <Field
            label="Diff."
            hint={`Total returned ${fmt(round3(otherReturnedNet + (returnNet || 0)))} − job net ${fmt(jobNet)}`}
          >
            <Input
              value={ghatiLabel}
              readOnly
              placeholder="—"
              className={cn(
                'font-mono font-semibold',
                ghati == null && 'bg-surface-2 text-ink-2',
                ghati != null && ghati >= 0 && 'border-success/30 bg-success-soft text-success',
                ghati != null && ghati < 0 && 'border-danger/30 bg-danger-soft text-danger',
              )}
            />
          </Field>
        </FieldGrid>

        {fullyReturned && (
          <Notice tone="danger">This gres has 0 Kg remaining — a return cannot be recorded.</Notice>
        )}
      </div>
    </FormDialog>
  );
};

export default GresReturnDialog;
