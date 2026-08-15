import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FormDialog } from '@/components/form-dialog';
import { Field } from '@/components/form-field';
import { PageLoader } from '@/components/states';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { itemApi, sizeApi } from '@/services/apiService';

const WEIGHT_UNITS = ['Kg', 'Gram'];

// Round a numeric value to at most 3 decimals (e.g. 0.0791666… -> 0.079) for display.
const round3 = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? '' : String(Math.round(n * 1000) / 1000);
};

const AddStockDialog = ({ open, onClose, row, onSaved }) => {
  const [itemKg, setItemKg] = useState('');
  const [weightPerPc, setWeightPerPc] = useState('');
  const [weightUnit, setWeightUnit] = useState('');
  const [totalPc, setTotalPc] = useState('');
  const [stockDozenWeight, setStockDozenWeight] = useState('');
  const [lowStockWarning, setLowStockWarning] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load existing stock data when dialog opens
  useEffect(() => {
    if (!open || !row) return;
    setItemKg('');
    // Pre-fill Weight/Pc. from the size's PCS Weight (shown in the table), rounded to 3 decimals;
    // a saved stock entry's own weightPerPc, if any, overrides this once loaded below.
    setWeightPerPc(row.pcsWeight != null && row.pcsWeight !== '' ? round3(row.pcsWeight) : '');
    setWeightUnit(row.pcsWeight != null && row.pcsWeight !== '' ? 'Kg' : '');
    setTotalPc('');
    setStockDozenWeight('');
    setLowStockWarning('');

    // Fetch existing stock entry for this row's size
    if (row.sizeInInch && row.sizeInMm && row._itemId) {
      setLoading(true);
      (async () => {
        try {
          const sizesRes = await sizeApi.getSizesByItemId(Number(row._itemId));
          const sizes = Array.isArray(sizesRes.data) ? sizesRes.data : [];
          const inch = (row.sizeInInch || '').trim();
          const mm = (row.sizeInMm || '').trim();
          const matchedSize = sizes.find(
            (s) => (s.sizeInInch || '').trim() === inch && (s.sizeInMm || '').trim() === mm,
          );
          if (!matchedSize?.id) return;

          const res = await itemApi.getAllItems(undefined, undefined, 0, 1000);
          const page = res.data;
          const all = Array.isArray(page?.data) ? page.data : Array.isArray(page) ? page : [];
          const matched = all.find((it) => it.sizeId === matchedSize.id);
          if (matched) {
            if (matched.itemKg != null) setItemKg(String(matched.itemKg));
            if (matched.weightPerPc != null) setWeightPerPc(round3(matched.weightPerPc));
            if (matched.totalPc != null) setTotalPc(String(matched.totalPc));
            if (matched.dozenWeight != null) setStockDozenWeight(String(matched.dozenWeight));
            if (matched.lowStockWarning != null) setLowStockWarning(String(matched.lowStockWarning));
            setWeightUnit('Kg');
          }
        } catch (err) {
          console.error('Failed to load stock details:', err);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [open, row]);

  // Auto-calculate totalPc & stockDozenWeight
  const recalc = (kg, wpc, unit) => {
    const kgF = parseFloat(kg) || 0;
    const wpcF = parseFloat(wpc) || 0;
    const wpcKg = unit === 'Gram' ? wpcF / 1000 : wpcF;
    setTotalPc(kgF > 0 && wpcKg > 0 ? Math.floor(kgF / wpcKg).toString() : '');
    setStockDozenWeight(wpcKg > 0 ? (wpcKg * 12).toFixed(2) : '');
  };

  const onItemKgChange = (v) => {
    setItemKg(v);
    recalc(v, weightPerPc, weightUnit);
  };
  const onWeightPerPcChange = (v) => {
    setWeightPerPc(v);
    recalc(itemKg, v, weightUnit);
  };
  const onWeightUnitChange = (v) => {
    setWeightUnit(v);
    recalc(itemKg, weightPerPc, v);
  };

  const handleSave = async () => {
    if (!itemKg && !weightPerPc && !lowStockWarning) {
      toast.error('Please fill at least one stock field');
      return;
    }

    setSaving(true);
    try {
      // Resolve sizeId
      const sizesRes = await sizeApi.getSizesByItemId(Number(row._itemId));
      const sizes = Array.isArray(sizesRes.data) ? sizesRes.data : [];
      const inch = (row.sizeInInch || '').trim();
      const mm = (row.sizeInMm || '').trim();
      const matchedSize = sizes.find(
        (s) => (s.sizeInInch || '').trim() === inch && (s.sizeInMm || '').trim() === mm,
      );

      if (!matchedSize?.id) {
        toast.error('Could not resolve size. Please try again.');
        return;
      }

      const numericSizeId = Number(matchedSize.id);
      const stockPayload = {
        sizeId: numericSizeId,
        itemKg: parseFloat(itemKg) || 0,
        weightPerPc: parseFloat(weightPerPc) || 0,
        totalPc: parseInt(totalPc, 10) || 0,
        lowStockWarning: parseFloat(lowStockWarning) || 0,
        stockStatus: 'IN_STOCK',
      };

      // Check if stock entry already exists → update, otherwise create
      let existingStockId = null;
      try {
        const stockRes = await itemApi.getAllItems(undefined, undefined, 0, 1000);
        const stockPage = stockRes.data;
        const allStock = Array.isArray(stockPage?.data) ? stockPage.data : Array.isArray(stockPage) ? stockPage : [];
        const existing = allStock.find((it) => Number(it.sizeId) === numericSizeId);
        if (existing?.id) existingStockId = Number(existing.id);
      } catch {
        /* ignore — will create new */
      }

      if (existingStockId) {
        await itemApi.updateItem(existingStockId, stockPayload);
      } else {
        await itemApi.createItem(stockPayload);
      }

      toast.success('Stock updated successfully!');
      onSaved?.();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message || 'Failed to save stock');
    } finally {
      setSaving(false);
    }
  };

  const subtitle = `${row?.itemName || ''}${row?.sizeInInch ? ` — ${row.sizeInInch}` : ''}${
    row?.sizeInMm ? ` / ${row.sizeInMm}` : ''
  }`;

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Update stock"
      description={subtitle}
      onSubmit={handleSave}
      submitLabel="Update stock"
      busyLabel="Saving…"
      isPending={saving}
      submitDisabled={loading}
      size="lg"
    >
      {loading ? (
        <PageLoader text="Loading stock details…" />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Item in Kg">
              <Input value={itemKg} onChange={(e) => onItemKgChange(e.target.value)} placeholder="Enter Kg" className="font-mono" />
            </Field>
            <Field label="Weight/Pc.">
              <Input
                value={weightPerPc}
                onChange={(e) => onWeightPerPcChange(e.target.value)}
                placeholder="Weight/Pc."
                className="font-mono"
              />
            </Field>
            <Field label="Unit">
              <Select value={weightUnit || undefined} onValueChange={onWeightUnitChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {WEIGHT_UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Total Pc." hint="Auto">
              <Input value={totalPc} readOnly placeholder="Auto" className="bg-surface-2 font-mono" />
            </Field>
            <Field label="Low stock warning">
              <Input
                value={lowStockWarning}
                onChange={(e) => setLowStockWarning(e.target.value)}
                placeholder="Pcs"
                className="font-mono"
              />
            </Field>
          </div>
        </div>
      )}
    </FormDialog>
  );
};

export default AddStockDialog;
