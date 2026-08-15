import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FormDialog } from '@/components/form-dialog';
import { Field, FieldGrid } from '@/components/form-field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const WEIGHT_UNITS = ['Kg', 'Gram'];

const EditItemDialog = ({ isOpen, onClose, onSave, initialData = null, categories = [] }) => {
  const [formData, setFormData] = useState({
    sizeInch: '',
    sizeMM: '',
    categoryId: '',
    categoryName: '',
    itemKg: '',
    weightPerPL: '',
    weightUnit: '',
    totalPL: '',
    dozenWeight: '',
    lowStockWarning: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        sizeInch: initialData.sizeInch || '',
        sizeMM: initialData.sizeMM || '',
        categoryId: initialData.categoryId || '',
        categoryName: initialData.category || '',
        itemKg: initialData.itemKg || '',
        weightPerPL: initialData.weightPerPL || '',
        weightUnit: initialData.weightUnit || '',
        totalPL: initialData.totalPL || '',
        dozenWeight: initialData.dozenWeight || '',
        lowStockWarning: initialData.lowStockWarning || '',
      });
    }
  }, [initialData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newFormData = { ...prev, [name]: value };

      if (name === 'itemKg' || name === 'weightPerPL' || name === 'weightUnit') {
        const itemKg = name === 'itemKg' ? parseFloat(value) || 0 : parseFloat(prev.itemKg) || 0;
        const weightPerPc = name === 'weightPerPL' ? parseFloat(value) || 0 : parseFloat(prev.weightPerPL) || 0;
        const weightUnit = name === 'weightUnit' ? value : newFormData.weightUnit || prev.weightUnit;
        const weightPerPcInKg = weightUnit === 'Gram' ? weightPerPc / 1000 : weightPerPc;
        if (itemKg > 0 && weightPerPcInKg > 0) {
          newFormData.totalPL = (itemKg / weightPerPcInKg).toFixed(2);
        } else {
          newFormData.totalPL = '';
        }
      }

      if (name === 'weightPerPL' || name === 'weightUnit') {
        const weightPerPc = name === 'weightPerPL' ? parseFloat(value) || 0 : parseFloat(prev.weightPerPL) || 0;
        const weightUnit = name === 'weightUnit' ? value : newFormData.weightUnit || prev.weightUnit;
        const weightPerPcInKg = weightUnit === 'Gram' ? weightPerPc / 1000 : weightPerPc;
        if (weightPerPcInKg > 0) {
          newFormData.dozenWeight = (weightPerPcInKg * 12).toFixed(2);
        } else {
          newFormData.dozenWeight = '';
        }
      }

      return newFormData;
    });
  };

  const handleSave = () => {
    if (!formData.sizeInch.trim() || !formData.categoryId) {
      toast.error('Please fill in required fields');
      return;
    }
    onSave(formData);
  };

  return (
    <FormDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Edit item"
      onSubmit={handleSave}
      submitLabel="Save"
      size="lg"
    >
      <div className="space-y-4">
        <FieldGrid columns={2}>
          <Field label="Size in inch" htmlFor="edit-size-inch" required>
            <Input id="edit-size-inch" name="sizeInch" value={formData.sizeInch} onChange={handleChange} />
          </Field>
          <Field label="Size in mm" htmlFor="edit-size-mm" required>
            <Input id="edit-size-mm" name="sizeMM" value={formData.sizeMM} onChange={handleChange} />
          </Field>
        </FieldGrid>

        <Field label="Category" required>
          <Select
            value={formData.categoryId ? String(formData.categoryId) : undefined}
            onValueChange={(v) => {
              const category = categories.find((c) => String(c.id) === v);
              if (category) setFormData((prev) => ({ ...prev, categoryId: category.id, categoryName: category.name }));
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.length === 0 ? (
                <div className="px-3 py-2 text-[13px] text-ink-3">No categories available</div>
              ) : (
                categories.map((category) => (
                  <SelectItem key={category.id} value={String(category.id)}>
                    {category.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </Field>

        <FieldGrid columns={2}>
          <Field label="Item in Kg" htmlFor="edit-item-kg">
            <Input id="edit-item-kg" name="itemKg" value={formData.itemKg} onChange={handleChange} className="font-mono" />
          </Field>
          <Field label="Weight/Pc." required>
            <div className="flex gap-2">
              <Input name="weightPerPL" value={formData.weightPerPL} onChange={handleChange} className="flex-1 font-mono" />
              <Select
                value={formData.weightUnit || undefined}
                onValueChange={(v) => handleChange({ target: { name: 'weightUnit', value: v } })}
              >
                <SelectTrigger className="w-24 shrink-0">
                  <SelectValue placeholder="Gm/Kg" />
                </SelectTrigger>
                <SelectContent>
                  {WEIGHT_UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Field>
        </FieldGrid>

        <FieldGrid columns={2}>
          <Field label="Total Pc." hint="Auto-calculated">
            <Input name="totalPL" value={formData.totalPL} readOnly className="bg-surface-2 font-mono" />
          </Field>
          <Field label="Dozen weight" htmlFor="edit-dozen-weight" required>
            <Input
              id="edit-dozen-weight"
              name="dozenWeight"
              value={formData.dozenWeight}
              onChange={handleChange}
              className="font-mono"
            />
          </Field>
        </FieldGrid>

        <Field label="Low stock warning [Pcs]" htmlFor="edit-low-stock">
          <Input
            id="edit-low-stock"
            name="lowStockWarning"
            value={formData.lowStockWarning}
            onChange={handleChange}
            className="font-mono"
          />
        </Field>
      </div>
    </FormDialog>
  );
};

export default EditItemDialog;
