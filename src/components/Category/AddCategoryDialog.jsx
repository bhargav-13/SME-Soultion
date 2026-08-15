import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FormDialog } from '@/components/form-dialog';
import { Field } from '@/components/form-field';
import { Input } from '@/components/ui/input';

const AddCategoryDialog = ({ isOpen, onClose, onSave, initialData = null, isEdit = false }) => {
  const [categoryName, setCategoryName] = useState('');

  useEffect(() => {
    if (initialData && isEdit) {
      setCategoryName(initialData.categoryName);
    } else {
      setCategoryName('');
    }
  }, [initialData, isEdit, isOpen]);

  const handleSave = () => {
    if (!categoryName.trim()) {
      toast.error('Please enter a category name');
      return;
    }
    onSave({ categoryName: categoryName.trim() });
  };

  return (
    <FormDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={isEdit ? 'Edit category' : 'Add category'}
      description={
        isEdit
          ? 'Rename this category. Items already filed under it keep their link.'
          : 'Categories are how the item master is grouped — every item needs one.'
      }
      size="sm"
      submitLabel="Save"
      onSubmit={handleSave}
    >
      <Field label="Category name" htmlFor="category-name" required>
        <Input
          id="category-name"
          type="text"
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
          placeholder="e.g. Handles"
          autoFocus
        />
      </Field>
    </FormDialog>
  );
};

export default AddCategoryDialog;
