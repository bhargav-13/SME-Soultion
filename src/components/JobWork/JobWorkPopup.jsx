import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FormDialog } from '@/components/form-dialog';
import { Field } from '@/components/form-field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { jobWorkApi, partyApi } from '@/services/apiService';
import { upsertOrderJobOverride } from '@/utils/orderJobWorkSync';

const FINISH_OPTIONS = [
  'S.S & Sartin Lacq',
  'ANTQ',
  'Side Gold',
  'Z-Black.',
  'Gr. Black.',
  'Matt S.S',
  'Matt ANTQ',
  'PVD Rose',
  'PVD Gold',
  'PVD Black',
  'Rose Gold',
  'Clear Lacq.',
];

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'COMPLETE', label: 'Complete' },
  { value: 'REJECT', label: 'Reject' },
];

const JOB_TYPE_OPTIONS = [
  { value: 'JOB_WORK', label: 'Job Work' },
  { value: 'INHOUSE', label: 'In-House' },
  { value: 'OUTSIDE', label: 'Outside' },
];

const ELEMENT_TYPES = ['Peti', 'Drum'];

const EMPTY_FORM = {
  partyName: '',
  partyId: '',
  sizeLabel: '',
  sizeId: '',
  jobDate: '',
  qtyPc: '',
  qtyKg: '',
  finish: '',
  elementCount: '',
  elementType: 'Peti',
  stickerQty: '',
  status: 'PENDING',
  jobWorkType: 'JOB_WORK',
};

const JobWorkPopup = ({ isOpen, orderRow, onClose, onSaved }) => {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [parties, setParties] = useState([]);

  const partyOptions = useMemo(
    () => parties.map((p) => ({ value: String(p.id), label: p.name })),
    [parties],
  );

  // Fetch parties for dropdown
  useEffect(() => {
    if (!isOpen) return;
    const fetchParties = async () => {
      try {
        const res = await partyApi.getAllParties();
        const data = res.data;
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setParties(list);
      } catch {
        /* silent */
      }
    };
    fetchParties();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (orderRow) {
      const platingRaw = String(orderRow.jobWork || '').trim().toLowerCase().replace(/[\s-]/g, '');
      let jobWorkType = 'JOB_WORK';
      if (platingRaw === 'inhouse' || platingRaw === 'in_house') jobWorkType = 'INHOUSE';
      else if (platingRaw === 'outside') jobWorkType = 'OUTSIDE';

      setFormData({
        partyName: orderRow.partyName || '',
        partyId: orderRow.partyId || '',
        sizeLabel: orderRow.size || '',
        sizeId: orderRow.sizeId || '',
        jobDate:
          orderRow.date && orderRow.date !== '—'
            ? normalizeToDateInput(orderRow.date)
            : new Date().toISOString().slice(0, 10),
        qtyPc: orderRow.qtyPc !== '—' ? String(orderRow.qtyPc ?? '') : '',
        qtyKg: orderRow.qtyKg !== '—' ? String(orderRow.qtyKg ?? '') : '',
        finish: orderRow.plating && orderRow.plating !== '_' ? orderRow.plating : '',
        elementCount: '',
        elementType: 'Peti',
        stickerQty: orderRow.stickerQty !== '—' ? String(orderRow.stickerQty ?? '') : '',
        status: 'PENDING',
        jobWorkType,
      });
    } else {
      setFormData(EMPTY_FORM);
    }
  }, [isOpen, orderRow]);

  const isOutsideJobWork = formData.jobWorkType === 'OUTSIDE';

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!formData.partyId) {
      toast.error('Party is required');
      return;
    }
    if (!formData.sizeId) {
      toast.error('Size is required');
      return;
    }
    if (!formData.jobDate) {
      toast.error('Job date is required');
      return;
    }
    if (!formData.qtyPc || parseFloat(formData.qtyPc) <= 0) {
      toast.error('Qty Pc is required');
      return;
    }

    const orderItemId = orderRow?.id;
    if (!orderItemId) {
      toast.error('Order item ID is missing');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        partyId: Number(formData.partyId),
        sizeId: Number(formData.sizeId),
        jobDate: formData.jobDate,
        qtyPc: parseFloat(formData.qtyPc) || 0,
        qtyKg: formData.qtyKg ? parseFloat(formData.qtyKg) : undefined,
        finish: formData.finish || undefined,
        elementCount: formData.elementCount ? parseFloat(formData.elementCount) : undefined,
        elementType: formData.elementType === 'Peti' ? 'PETI' : 'DRUM',
        stickerQty: formData.stickerQty ? parseFloat(formData.stickerQty) : undefined,
        status: formData.status || 'PENDING',
        jobWorkType: formData.jobWorkType || 'JOB_WORK',
      };

      const res = await jobWorkApi.createJobWork(orderItemId, payload);
      toast.success('Job work created successfully!');
      upsertOrderJobOverride({
        orderItemId,
        orderId: orderRow?.orderId,
        jobWork:
          formData.jobWorkType === 'INHOUSE'
            ? 'In-House'
            : formData.jobWorkType === 'OUTSIDE'
              ? 'Outside'
              : 'Job Work',
        platingStatus: true,
        jobWorkNo: orderRow?.jobWorkNo,
      });
      onSaved?.(formData, res.data);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create job work');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Create job work"
      onSubmit={handleSave}
      submitLabel="Save"
      busyLabel="Saving…"
      isPending={saving}
      size="xl"
    >
      {/* Party + Size banner */}
      <div className="mb-6 rounded-lg border border-line bg-surface-2 p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Party name">
            <SearchableSelect
              ariaLabel="Party name"
              placeholder="Select party"
              searchPlaceholder="Search party…"
              options={partyOptions}
              value={formData.partyId ? String(formData.partyId) : undefined}
              disabled={!isOutsideJobWork}
              onChange={(v) => {
                const p = parties.find((x) => String(x.id) === v);
                if (p) setFormData((prev) => ({ ...prev, partyName: p.name, partyId: p.id }));
              }}
            />
          </Field>
          <div>
            <p className="text-[10.5px] font-semibold tracking-[0.06em] text-ink-3 uppercase">Size</p>
            <p className="mt-1.5 text-[13px] font-medium text-ink">{formData.sizeLabel || '—'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Job date" required>
          <Input type="date" value={formData.jobDate} onChange={(e) => handleChange('jobDate', e.target.value)} />
        </Field>

        <Field label="Qty Pc" required>
          <Input
            type="number"
            min="0"
            value={formData.qtyPc}
            onChange={(e) => handleChange('qtyPc', e.target.value)}
            placeholder="Enter Pc."
            className="font-mono"
          />
        </Field>

        <Field label="Qty Kg">
          <Input
            type="number"
            min="0"
            step="0.001"
            value={formData.qtyKg}
            onChange={(e) => handleChange('qtyKg', e.target.value)}
            placeholder="Auto"
            className="font-mono"
          />
        </Field>

        <Field label="Finish">
          <Select value={formData.finish || undefined} disabled>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select finish…" />
            </SelectTrigger>
            <SelectContent>
              {FINISH_OPTIONS.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Element">
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min="0"
              value={formData.elementCount}
              onChange={(e) => handleChange('elementCount', e.target.value)}
              placeholder="Count"
              className="flex-1 font-mono"
            />
            <Select value={formData.elementType} onValueChange={(v) => handleChange('elementType', v)}>
              <SelectTrigger className="w-32 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ELEMENT_TYPES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Field>

        <Field label="Sticker qty">
          <Input
            type="number"
            min="0"
            value={formData.stickerQty}
            onChange={(e) => handleChange('stickerQty', e.target.value)}
            placeholder="Enter sticker qty"
            className="font-mono"
          />
        </Field>

        <Field label="Status">
          <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Job work type">
          <Select
            value={formData.jobWorkType}
            onValueChange={(v) => handleChange('jobWorkType', v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {JOB_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </FormDialog>
  );
};

function normalizeToDateInput(dateStr) {
  if (!dateStr || dateStr === '—') return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split('/');
    return `${y}-${m}-${d}`;
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split('-');
    return `${y}-${m}-${d}`;
  }
  return dateStr;
}

export default JobWorkPopup;
