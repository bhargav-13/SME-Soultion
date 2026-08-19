import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * The bajaar (market rate) a chitthi is priced against, and the amount that goes with it.
 *
 * Two kinds, and the difference is who owns the number. **Fixed** is one house rate maintained in
 * Settings, so it is shown read-only here — editing it on a single card would be a lie, because
 * every other fixed chitthi would still move when the setting changes. **Rojnu** (daily) is
 * negotiated per chitthi, so it gets an editable box that starts empty: a rate carried over from
 * yesterday is worse than no rate at all.
 */
const JobWorkBajaarControl = ({ value, amount, fixedAmount, onChange }) => {
  const [draft, setDraft] = useState(amount ?? '');

  // Follow the saved amount whenever the server (or a type switch) replaces it.
  useEffect(() => {
    setDraft(amount ?? '');
  }, [amount]);

  const isRojnu = value === 'ROJNU';
  const isFixed = value === 'FIXED';

  const commitAmount = () => {
    const trimmed = String(draft).trim();
    const parsed = trimmed === '' ? null : Number(trimmed);
    const next = parsed == null || Number.isNaN(parsed) ? null : parsed;
    if (next === (amount ?? null)) return;
    onChange('ROJNU', next);
  };

  return (
    <div className="flex items-center gap-1.5">
      <Select
        value={value || undefined}
        onValueChange={(next) => {
          // Switching to Rojnu clears the box — the new rate has not been agreed yet.
          if (next === 'ROJNU') setDraft('');
          onChange(next, null);
        }}
      >
        <SelectTrigger size="sm" className="h-8 w-[9.5rem]">
          <SelectValue placeholder="Bajaar" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="FIXED">Fixed bajaar</SelectItem>
          <SelectItem value="ROJNU">Rojnu bajaar</SelectItem>
        </SelectContent>
      </Select>

      {isFixed && (
        <span
          className="inline-flex h-8 min-w-[5.5rem] items-center justify-end rounded-md border border-line bg-surface-2 px-2.5 font-mono text-[12.5px] font-semibold text-ink"
          title="Set in Settings → Job work → Fixed bajaar"
        >
          {fixedAmount == null || fixedAmount === '' ? '—' : fixedAmount}
        </span>
      )}

      {isRojnu && (
        <Input
          type="number"
          step="any"
          inputMode="decimal"
          value={draft}
          placeholder="Amount"
          aria-label="Rojnu bajaar amount"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitAmount}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          className="h-8 w-[5.5rem] text-right font-mono text-[12.5px]"
        />
      )}
    </div>
  );
};

export default JobWorkBajaarControl;
