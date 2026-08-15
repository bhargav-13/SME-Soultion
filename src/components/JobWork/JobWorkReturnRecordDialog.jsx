import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FormDialog } from '@/components/form-dialog';
import { Field } from '@/components/form-field';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { jobWorkReturnApi } from '@/services/apiService';

const EMPTY_FORM = {
  returnElementCount: '',
  elementType: 'PETI',
  petiWeightKg: '',
  grossKg: '',
  ghati: '',
  jobReturnDate: '',
};

const TYPE_OPTIONS = [
  { value: 'PETI', label: 'Peti' },
  { value: 'DRUM', label: 'Drum' },
];

const round3 = (n) => Math.round(n * 1000) / 1000;

const parseNumber = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/** Net Kg = Gross Kg (weighed once) - Peti/Drum count * tare weight per Peti/Drum (kg). */
const getNetKg = (form) => {
  const grossKg = parseNumber(form.grossKg);
  if (grossKg === null) return null;
  const count = parseNumber(form.returnElementCount) ?? 0;
  const petiWeightKg = parseNumber(form.petiWeightKg) ?? 0;
  return Math.max(0, round3(grossKg - count * petiWeightKg));
};

const JobWorkReturnRecordDialog = ({ isOpen, jobWork, editingReturn, onClose, onSaved }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [ghatiTouched, setGhatiTouched] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setGhatiTouched(false);
    if (editingReturn) {
      setForm({
        returnElementCount: String(editingReturn.returnElementCount ?? ''),
        elementType: editingReturn.elementType || 'PETI',
        petiWeightKg: editingReturn.petiWeightKg != null ? String(editingReturn.petiWeightKg) : '',
        grossKg: editingReturn.grossKg != null ? String(editingReturn.grossKg) : '',
        ghati: editingReturn.ghati != null ? String(editingReturn.ghati) : '',
        jobReturnDate: editingReturn.jobReturnDate ? editingReturn.jobReturnDate.substring(0, 10) : '',
      });
      setGhatiTouched(true);
    } else {
      setForm(EMPTY_FORM);
    }
  }, [isOpen, editingReturn]);

  const returns = jobWork?.jobWorkReturns || [];
  const alreadyReturnedKg = round3(
    returns
      .filter((r) => r.id !== editingReturn?.id)
      .reduce((sum, r) => sum + (r.returnKg || 0) + (r.ghati || 0), 0),
  );
  const sentKg = jobWork?.qtyKg || 0;
  const remainingBeforeThisReturn = round3(Math.max(0, sentKg - alreadyReturnedKg));

  const netKg = getNetKg(form);

  // Auto-suggest Ghati as "what's still outstanding after this return", editable by the user.
  useEffect(() => {
    if (ghatiTouched) return;
    if (netKg === null) return;
    const suggested = round3(Math.max(0, remainingBeforeThisReturn - netKg));
    setForm((prev) => ({ ...prev, ghati: suggested > 0 ? String(suggested) : '' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.grossKg, form.returnElementCount, form.petiWeightKg]);

  const handleSave = async () => {
    const grossKg = parseFloat(form.grossKg);
    if (!form.grossKg || Number.isNaN(grossKg) || grossKg <= 0) {
      toast.error('Gross Kg is required and must be greater than 0');
      return;
    }

    if (netKg === null || netKg < 0) {
      toast.error('Net Kg could not be calculated');
      return;
    }

    const ghatiVal = form.ghati ? parseFloat(form.ghati) : 0;
    if (Number.isNaN(ghatiVal) || ghatiVal < 0) {
      toast.error('Ghati must be a valid non-negative number');
      return;
    }

    const newContribution = round3(netKg + ghatiVal);
    if (sentKg > 0 && newContribution > remainingBeforeThisReturn) {
      toast.error(`Net Kg + Ghati (${newContribution}) exceeds remaining (${remainingBeforeThisReturn} Kg)`);
      return;
    }

    const elemCount = form.returnElementCount ? parseFloat(form.returnElementCount) : undefined;
    if (elemCount !== undefined && (Number.isNaN(elemCount) || elemCount < 0 || !Number.isInteger(elemCount))) {
      toast.error('Peti/Drum count must be a valid non-negative integer');
      return;
    }

    const petiWeightKg = form.petiWeightKg ? parseFloat(form.petiWeightKg) : undefined;

    setSaving(true);
    try {
      const payload = {
        grossKg,
        petiWeightKg,
        returnElementCount: elemCount,
        elementType: form.elementType,
        ghati: ghatiVal || undefined,
        jobReturnDate: form.jobReturnDate || undefined,
      };

      // Manual job works have no order item; the return endpoint ignores this path segment
      // (it resolves by jobWorkId), so send 0 rather than null to keep the URL valid.
      const orderItemPathId = jobWork.orderItemId ?? 0;
      if (editingReturn?.id) {
        await jobWorkReturnApi.updateJobWorkReturn(orderItemPathId, jobWork.id, editingReturn.id, payload);
        toast.success('Return record updated!');
      } else {
        await jobWorkReturnApi.createJobWorkReturn(orderItemPathId, jobWork.id, payload);
        toast.success('Return record saved!');
      }

      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save return');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog
      open={isOpen && Boolean(jobWork)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Job work return"
      description="Record what came back against this chitthi."
      size="md"
      submitLabel="Save return"
      busyLabel="Saving…"
      isPending={saving}
      onSubmit={handleSave}
    >
      <div className="space-y-4">
        <Field label="Peti / Drum count" htmlFor="jwr-count">
          <div className="flex items-center gap-2">
            <Input
              id="jwr-count"
              type="number"
              step="1"
              value={form.returnElementCount}
              onChange={(e) => setForm((prev) => ({ ...prev, returnElementCount: e.target.value }))}
              placeholder="Count"
              className="min-w-0 flex-1 font-mono"
            />
            <SearchableSelect
              ariaLabel="Element type"
              options={TYPE_OPTIONS}
              value={form.elementType}
              onChange={(value) => setForm((prev) => ({ ...prev, elementType: value }))}
              className="w-24 shrink-0"
              contentClassName="min-w-[8rem]"
            />
            <Input
              type="number"
              step="0.001"
              min="0"
              value={form.petiWeightKg}
              onChange={(e) => setForm((prev) => ({ ...prev, petiWeightKg: e.target.value }))}
              placeholder="Kg each"
              aria-label="Weight per peti or drum, in kg"
              className="w-24 shrink-0 font-mono"
            />
          </div>
        </Field>

        <Field
          label="Gross Kg (weighed)"
          htmlFor="jwr-gross"
          required
          hint={
            sentKg > 0
              ? `Remaining (incl. ghati): ${remainingBeforeThisReturn} Kg of ${sentKg} Kg`
              : undefined
          }
        >
          <Input
            id="jwr-gross"
            type="number"
            step="0.001"
            value={form.grossKg}
            onChange={(e) => setForm((prev) => ({ ...prev, grossKg: e.target.value }))}
            placeholder="Enter Kg."
            className="font-mono"
          />
        </Field>

        <Field label="Net Kg" hint="Net Kg = Gross Kg − (Peti/Drum count × weight each).">
          <Input
            type="number"
            step="0.001"
            value={netKg ?? ''}
            readOnly
            placeholder="Auto calculated"
            className="cursor-not-allowed bg-surface-2 font-mono font-medium text-ink"
          />
        </Field>

        <Field
          label="Ghati"
          htmlFor="jwr-ghati"
          hint="Auto-suggested as the remaining shortfall after this return — adjust if the actual process loss differs."
        >
          <Input
            id="jwr-ghati"
            type="number"
            step="0.001"
            min="0"
            value={form.ghati}
            onChange={(e) => {
              setGhatiTouched(true);
              setForm((prev) => ({ ...prev, ghati: e.target.value }));
            }}
            placeholder="Auto suggested, editable"
            className="font-mono"
          />
        </Field>

        <Field label="Return date" htmlFor="jwr-date">
          <Input
            id="jwr-date"
            type="date"
            value={form.jobReturnDate}
            onChange={(e) => setForm((prev) => ({ ...prev, jobReturnDate: e.target.value }))}
          />
        </Field>
      </div>
    </FormDialog>
  );
};

export default JobWorkReturnRecordDialog;
