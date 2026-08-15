import { useEffect, useState } from 'react';
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

const EMPTY_FORM = {
  returnKg: '',
  ghati: '',
  returnElement: '',
  returnType: 'Peti',
  elementWeightGm: '900',
};

const RETURN_TYPES = ['Peti', 'Drum'];

const JobWorkReturnDialog = ({ isOpen, mode = 'edit', initialData, onClose, onSave }) => {
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!isOpen) return;
    setFormData({
      returnKg: initialData?.returnKgInput || '',
      ghati: initialData?.ghatiInput || '',
      returnElement: initialData?.returnElementInput || '',
      returnType: initialData?.returnType || 'Peti',
      elementWeightGm: initialData?.returnType === 'Drum' ? '' : '900',
    });
  }, [initialData, isOpen]);

  const isViewMode = mode === 'view';

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    if (isViewMode) {
      onClose();
      return;
    }
    onSave(formData);
  };

  return (
    <FormDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Job work return"
      onSubmit={handleSubmit}
      submitLabel={isViewMode ? 'Close' : 'Save'}
      hideFooter={false}
      size="lg"
      footer={undefined}
    >
      <div className="space-y-4">
        <Field label="Return Kg.">
          <Input
            value={formData.returnKg}
            onChange={(e) => handleChange('returnKg', e.target.value)}
            placeholder="Enter Kg"
            disabled={isViewMode}
            className="font-mono"
          />
        </Field>

        <Field label="Ghati">
          <Input
            value={formData.ghati}
            onChange={(e) => handleChange('ghati', e.target.value)}
            placeholder="Enter Kg"
            disabled={isViewMode}
            className="font-mono"
          />
        </Field>

        <Field label="Return element">
          <div className="flex items-center gap-2">
            <Input
              value={formData.returnElement}
              onChange={(e) => handleChange('returnElement', e.target.value)}
              placeholder="Enter element"
              disabled={isViewMode}
              className="flex-1"
            />
            <Select
              value={formData.returnType}
              onValueChange={(v) => {
                handleChange('returnType', v);
                handleChange('elementWeightGm', v === 'Peti' ? '900' : '');
              }}
              disabled={isViewMode}
            >
              <SelectTrigger className="w-28 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RETURN_TYPES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min="0"
              step="1"
              value={formData.elementWeightGm}
              onChange={(e) => handleChange('elementWeightGm', e.target.value)}
              placeholder="gm"
              disabled={isViewMode || formData.returnType === 'Peti'}
              className="w-28 shrink-0 font-mono"
            />
          </div>
        </Field>
      </div>
    </FormDialog>
  );
};

export default JobWorkReturnDialog;
