import { useEffect, useState } from 'react';
import { ViewDialog } from '@/components/form-dialog';
import { ConfirmDialog, ConfirmName } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import EditableClientTable from './EditableClientTable';

const ClientDetailsDialog = ({
  isOpen,
  clientName,
  columns,
  rows,
  selectedCell,
  editingCell,
  onCellClick,
  onCellChange,
  onCellBlur,
  onLastCellTab,
  onSave,
  onDeleteAll,
  onClose,
  readOnlyCols = [],
  modifiedRowIndices = new Set(),
}) => {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsDeleteConfirmOpen(false);
      setIsEditMode(false);
    }
  }, [isOpen]);

  if (!clientName) return null;

  return (
    <>
      <ViewDialog
        open={isOpen}
        onOpenChange={(open) => !open && onClose()}
        title={clientName}
        size="full"
        actions={
          <div className="flex w-full flex-wrap items-center justify-start gap-3">
            {isEditMode ? (
              <Button
                onClick={() => {
                  onSave();
                  setIsEditMode(false);
                }}
                className="px-10"
              >
                Save
              </Button>
            ) : (
              <Button onClick={() => setIsEditMode(true)} className="px-10">
                Edit
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="px-10 text-danger hover:text-danger"
            >
              Delete all
            </Button>
            <Button variant="outline" onClick={onClose} className="px-10">
              Cancel
            </Button>
          </div>
        }
      >
        <EditableClientTable
          columns={columns}
          rows={rows}
          readOnlyCols={readOnlyCols}
          selectedCell={isEditMode ? selectedCell : null}
          editingCell={isEditMode ? editingCell : null}
          onCellClick={isEditMode ? onCellClick : () => {}}
          onCellChange={isEditMode ? onCellChange : () => {}}
          onCellBlur={isEditMode ? onCellBlur : () => {}}
          onLastCellTab={isEditMode ? onLastCellTab : () => {}}
          modifiedRowIndices={modifiedRowIndices}
        />
        {rows.length === 0 && <p className="mt-2 text-[12px] text-ink-3">No matching rows.</p>}
      </ViewDialog>

      <ConfirmDialog
        open={isDeleteConfirmOpen}
        onOpenChange={(open) => !open && setIsDeleteConfirmOpen(false)}
        title="Delete all items?"
        description={
          <>
            This will remove all rows for <ConfirmName>{clientName}</ConfirmName>. This action cannot be undone.
          </>
        }
        confirmLabel="Delete"
        onConfirm={() => {
          onDeleteAll();
          setIsDeleteConfirmOpen(false);
        }}
      />
    </>
  );
};

export default ClientDetailsDialog;
