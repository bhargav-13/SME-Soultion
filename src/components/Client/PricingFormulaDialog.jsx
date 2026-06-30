import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FINISH_META, resolvePricingRules, upsertPricingRule } from "../../services/pricingRulesApi";

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
    setRows((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(
        FINISH_META.map(({ key }) => {
          const r = rows[key] || {};
          const mult = parseFloat(r.multiplier);
          const off = parseFloat(r.offset);
          return upsertPricingRule(
            clientId,
            null,
            key,
            isNaN(mult) ? 1 : mult,
            isNaN(off) ? 0 : off
          );
        })
      );
      toast.success("Formulas saved");
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save formulas");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Finish Price Formulas</h2>
        <p className="text-sm text-gray-500 mb-4">
          {scopeLabel ? `${scopeLabel} — ` : ""}each finish = <span className="font-mono">S.S. × multiplier + offset</span>.
          {clientId != null ? " Overrides apply to this client only." : " These are the global defaults."}
        </p>

        {loading ? (
          <div className="py-10 text-center text-sm text-gray-400">Loading formulas…</div>
        ) : (
          <div className="space-y-1.5 mb-4">
            <div className="grid grid-cols-[1fr_90px_90px] gap-2 px-1 text-[11px] font-semibold text-gray-400 uppercase">
              <span>Finish</span>
              <span className="text-center">× Mult.</span>
              <span className="text-center">+ Offset</span>
            </div>
            {FINISH_META.map(({ key, label }) => {
              const r = rows[key] || { multiplier: 1, offset: 0 };
              return (
                <div key={key} className="grid grid-cols-[1fr_90px_90px] gap-2 items-center">
                  <span className="text-sm text-gray-700">{label}</span>
                  <input
                    type="number"
                    step="any"
                    value={r.multiplier ?? ""}
                    onChange={(e) => setField(key, "multiplier", e.target.value)}
                    className="border border-gray-300 rounded-md px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-gray-900"
                  />
                  <input
                    type="number"
                    step="any"
                    value={r.offset ?? ""}
                    onChange={(e) => setField(key, "offset", e.target.value)}
                    className="border border-gray-300 rounded-md px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-gray-900"
                  />
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="px-5 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Save Formulas"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PricingFormulaDialog;
