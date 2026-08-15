import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FormDialog } from '@/components/form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { itemBlueprintApi, inventoryApi, clientInventoryApi } from '@/services/apiService';
import { applyFinish, fallbackRules } from '@/services/pricingRulesApi';

// Editable price fields (client field key + label). Base inventory uses `ss` for S.S.
const PRICE_FIELDS = [
  { key: 'sssatinlacq', label: 'S.S.', base: 'ss' },
  { key: 'antiq', label: 'Antq.' },
  { key: 'sidegold', label: 'Side Gold' },
  { key: 'sartinlacq', label: 'Sartin Lacqur' },
  { key: 'zblack', label: 'Z Black' },
  { key: 'grblack', label: 'Gr. Black' },
  { key: 'mattss', label: 'Matt S.S.' },
  { key: 'mattantiq', label: 'Matt Antq.' },
  { key: 'pvdrose', label: 'PVD Rose Gold' },
  { key: 'pvdgold', label: 'PVD Gold' },
  { key: 'pvdblack', label: 'PVD Black' },
  { key: 'rosegold', label: 'Rose Gold' },
  { key: 'clearlacq', label: 'Clear Lacqur' },
];

const PACKING_FIELDS = [
  { key: 'pcsPerBox', label: 'Box / Pcs', int: true },
  { key: 'boxPerCarton', label: 'Box / Cartoon', int: true },
  { key: 'pcsPerCarton', label: 'Total Pcs / Cartoon', int: true },
  { key: 'cartonWeight', label: 'Total Cartoon Weight' },
];

// Finish keys whose value is auto-derived from S.S. (everything except S.S. itself)
const FINISH_KEYS = PRICE_FIELDS.filter((f) => f.key !== 'sssatinlacq').map((f) => f.key);

const ALL_KEYS = [...PACKING_FIELDS, ...PRICE_FIELDS].map((f) => f.key);

const emptyForm = () => ALL_KEYS.reduce((acc, k) => ({ ...acc, [k]: '' }), {});

const FieldInput = ({ label, value, onChange }) => (
  <label className="text-[11.5px] text-ink-2">
    {label}
    <Input type="number" step="any" value={value} onChange={onChange} className="mt-0.5 h-8 font-mono" />
  </label>
);

const ClientAddItemDialog = ({ isOpen, clientId, clientName, ssRules, onClose, onAdded }) => {
  const rules = ssRules || fallbackRules();
  const [loading, setLoading] = useState(false);
  const [sizeOptions, setSizeOptions] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  // Load stock-master sizes + base inventory once when opened
  useEffect(() => {
    if (!isOpen) return;
    setSearch('');
    setSelected(null);
    setForm(emptyForm());

    const load = async () => {
      setLoading(true);
      try {
        const itemsRes = await itemBlueprintApi.getAllItems();
        const items = Array.isArray(itemsRes.data) ? itemsRes.data : [];

        const invResults = await Promise.allSettled(
          items.map((it) =>
            inventoryApi.getAllInventory(Number(it.id), undefined, undefined, undefined, undefined, 0, 1000),
          ),
        );

        const options = [];
        items.forEach((item, i) => {
          const sizes = item.sizes || [];
          const invList =
            invResults[i].status === 'fulfilled'
              ? Array.isArray(invResults[i].value.data?.data)
                ? invResults[i].value.data.data
                : Array.isArray(invResults[i].value.data)
                  ? invResults[i].value.data
                  : []
              : [];
          const invBySize = new Map(
            invList.map((inv) => [`${(inv.sizeInInch || '').trim()}|${(inv.sizeInMm || '').trim()}`, inv]),
          );

          sizes.forEach((s) => {
            if (!s.id) return;
            const base = invBySize.get(`${(s.sizeInInch || '').trim()}|${(s.sizeInMm || '').trim()}`) || {};
            options.push({
              sizeId: s.id,
              itemName: item.itemName || '',
              sizeInInch: s.sizeInInch || '',
              sizeInMm: s.sizeInMm || '',
              dozenWeight: s.dozenWeight,
              pcsWeight: s.pcsWeight,
              base,
            });
          });
        });
        setSizeOptions(options);
      } catch {
        toast.error('Failed to load stock master sizes');
        setSizeOptions([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sizeOptions.slice(0, 50);
    return sizeOptions
      .filter((o) => `${o.itemName} ${o.sizeInInch} ${o.sizeInMm}`.toLowerCase().includes(q))
      .slice(0, 50);
  }, [search, sizeOptions]);

  // Pick a size → pre-fill the form with base (default) values; admin edits afterwards
  const handleSelect = (opt) => {
    setSelected(opt);
    const b = opt.base || {};
    const next = emptyForm();
    PACKING_FIELDS.forEach((f) => {
      if (b[f.key] != null) next[f.key] = String(b[f.key]);
    });
    PRICE_FIELDS.forEach((f) => {
      const baseKey = f.base || f.key;
      if (b[baseKey] != null) next[f.key] = String(b[baseKey]);
    });
    setForm(next);
  };

  const handleField = (key, value) => {
    setForm((prev) => {
      const updated = { ...prev, [key]: value };
      if (key === 'sssatinlacq') {
        const ss = parseFloat(value);
        if (!isNaN(ss)) {
          FINISH_KEYS.forEach((f) => {
            const result = applyFinish(ss, rules[f]);
            if (result != null) updated[f] = String(result);
          });
        }
      }
      return updated;
    });
  };

  const handleAdd = async () => {
    if (!clientId || !selected) {
      toast.error('Please select a size');
      return;
    }
    const toNum = (v) => {
      const n = parseFloat(v);
      return isNaN(n) ? undefined : n;
    };
    const toInt = (v) => {
      const n = parseInt(v, 10);
      return isNaN(n) ? undefined : n;
    };
    const payload = { sizeId: selected.sizeId };
    PACKING_FIELDS.forEach((f) => {
      const v = f.int ? toInt(form[f.key]) : toNum(form[f.key]);
      if (v !== undefined) payload[f.key] = v;
    });
    PRICE_FIELDS.forEach((f) => {
      const v = toNum(form[f.key]);
      if (v !== undefined) payload[f.key] = v;
    });

    setSaving(true);
    try {
      await clientInventoryApi.createClientInventory(clientId, payload);
      toast.success('Item added');
      onAdded?.();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Add item"
      description={`${clientName ? `For ${clientName}. ` : ''}Pick a size — packing & prices are pre-filled from stock master. Edit any value, then add.`}
      onSubmit={handleAdd}
      submitLabel="Add item"
      busyLabel="Adding…"
      isPending={saving}
      submitDisabled={!selected}
    >
      {/* Size picker */}
      <div className="mb-4">
        <label className="mb-1 block text-[12.5px] font-medium text-ink-2">Size</label>
        {selected ? (
          <div className="flex items-center justify-between rounded-lg border border-line px-3 py-2">
            <span className="text-[13px] text-ink-2">
              <span className="font-medium text-ink">{selected.itemName || '-'}</span> · {selected.sizeInInch || '-'} ·{' '}
              {selected.sizeInMm || '-'}
            </span>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                setSelected(null);
                setForm(emptyForm());
              }}
            >
              Change
            </Button>
          </div>
        ) : (
          <>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by item or size…"
            />
            <ul className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-line">
              {loading ? (
                <li className="px-3 py-2 text-[13px] text-ink-3">Loading sizes…</li>
              ) : filteredOptions.length === 0 ? (
                <li className="px-3 py-2 text-[13px] text-ink-3">No sizes found</li>
              ) : (
                filteredOptions.map((o) => (
                  <li
                    key={o.sizeId}
                    onClick={() => handleSelect(o)}
                    className="flex cursor-pointer justify-between px-3 py-2 text-[13px] hover:bg-surface-2"
                  >
                    <span className="font-medium text-ink">{o.itemName || '-'}</span>
                    <span className="text-[12px] text-ink-3">
                      {o.sizeInInch} · {o.sizeInMm}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </>
        )}
      </div>

      {/* Editable fields (only after a size is chosen) */}
      {selected && (
        <>
          <div className="mb-3">
            <p className="mb-1.5 text-[10.5px] font-semibold tracking-[0.05em] text-ink-3 uppercase">Packing</p>
            <div className="grid grid-cols-2 gap-2">
              {PACKING_FIELDS.map((f) => (
                <FieldInput key={f.key} label={f.label} value={form[f.key]} onChange={(e) => handleField(f.key, e.target.value)} />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[10.5px] font-semibold tracking-[0.05em] text-ink-3 uppercase">Pricing</p>
            <div className="grid grid-cols-2 gap-2">
              {PRICE_FIELDS.map((f) => (
                <FieldInput key={f.key} label={f.label} value={form[f.key]} onChange={(e) => handleField(f.key, e.target.value)} />
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-ink-3">
              Editing S.S. auto-fills the finish prices. The item is added to this client's list whether or not the
              prices differ from base stock.
            </p>
          </div>
        </>
      )}
    </FormDialog>
  );
};

export default ClientAddItemDialog;
