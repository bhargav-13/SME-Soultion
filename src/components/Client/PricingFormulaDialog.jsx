import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FormDialog } from '@/components/form-dialog';
import { PageLoader } from '@/components/states';
import { Input } from '@/components/ui/input';
import { FINISH_META, resolvePricingRules, upsertPricingRule } from '@/services/pricingRulesApi';

/**
 * Inline editor for finish-price formulas: finish = S.S. × multiplier + offset.
 * clientId null  → edits the GLOBAL defaults (Stock Master).
 * clientId set   → edits that client's overrides (Client Management).
 */
const PricingFormulaDialog = ({ isOpen, clientId = null, scopeLabel, onClose, onSaved }) => {
  const [rows, setRows] = useState({}); // { finishKey: { multiplier, offset } }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      setLoading(true);
      const resolved = await resolvePricingRules(clientId, null);
      setRows(resolved);
      setLoading(false);
    };
    load();
  }, [isOpen, clientId]);

  const setField = (key, field, value) => {
    setRows((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(
        FINISH_META.map(({ key }) => {
          const r = rows[key] || {};
          const mult = parseFloat(r.multiplier);
          const off = parseFloat(r.offset);
          return upsertPricingRule(clientId, null, key, isNaN(mult) ? 1 : mult, isNaN(off) ? 0 : off);
        }),
      );
      toast.success('Formulas saved');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save formulas');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Finish price formulas"
      description={
        <>
          {scopeLabel ? `${scopeLabel} — ` : ''}each finish = <span className="font-mono">S.S. × multiplier + offset</span>.
          {clientId != null ? ' Overrides apply to this client only.' : ' These are the global defaults.'}
        </>
      }
      onSubmit={handleSave}
      submitLabel="Save formulas"
      busyLabel="Saving…"
      isPending={saving}
      submitDisabled={loading}
    >
      {loading ? (
        <PageLoader text="Loading formulas…" />
      ) : (
        <div className="space-y-1.5">
          <div className="grid grid-cols-[1fr_90px_90px] gap-2 px-1 text-[10.5px] font-semibold tracking-[0.05em] text-ink-3 uppercase">
            <span>Finish</span>
            <span className="text-center">× Mult.</span>
            <span className="text-center">+ Offset</span>
          </div>
          {FINISH_META.map(({ key, label }) => {
            const r = rows[key] || { multiplier: 1, offset: 0 };
            return (
              <div key={key} className="grid grid-cols-[1fr_90px_90px] items-center gap-2">
                <span className="text-[13px] text-ink-2">{label}</span>
                <Input
                  type="number"
                  step="any"
                  value={r.multiplier ?? ''}
                  onChange={(e) => setField(key, 'multiplier', e.target.value)}
                  className="h-8 text-center font-mono"
                />
                <Input
                  type="number"
                  step="any"
                  value={r.offset ?? ''}
                  onChange={(e) => setField(key, 'offset', e.target.value)}
                  className="h-8 text-center font-mono"
                />
              </div>
            );
          })}
        </div>
      )}
    </FormDialog>
  );
};

export default PricingFormulaDialog;
