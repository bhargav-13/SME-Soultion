import { ViewDialog } from '@/components/form-dialog';
import { ReadOnlyField } from '@/components/form-field';
import { Button } from '@/components/ui/button';

const ViewItemDialog = ({ isOpen, onClose, onEdit, onDelete, itemData = null }) => {
  const handleEdit = () => {
    if (onEdit) onEdit(itemData);
    onClose();
  };

  const handleDelete = () => {
    if (onDelete) onDelete(itemData);
    onClose();
  };

  return (
    <ViewDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Item details"
      size="md"
      actions={
        <>
          <Button variant="outline" onClick={handleDelete}>
            Delete
          </Button>
          <Button onClick={handleEdit}>Edit</Button>
        </>
      }
    >
      {itemData && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ReadOnlyField label="Size in inch" value={itemData.sizeInch} />
          <ReadOnlyField label="Size in mm" value={itemData.sizeMM} />
          <ReadOnlyField label="Category" value={itemData.category} className="sm:col-span-2" />
          <ReadOnlyField label="Item in Kg" value={itemData.itemKg} mono />
          <ReadOnlyField label="Weight/Pc." value={itemData.weightPerPL} mono />
          <ReadOnlyField label="Total Pc." value={itemData.totalPL} mono />
          <ReadOnlyField label="Dozen weight" value={itemData.dozenWeight} mono />
          <ReadOnlyField label="Low stock warning [Pcs]" value={itemData.lowStockWarning} mono className="sm:col-span-2" />
        </div>
      )}
    </ViewDialog>
  );
};

export default ViewItemDialog;
