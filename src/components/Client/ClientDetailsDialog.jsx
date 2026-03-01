import React, { useEffect, useState } from "react";
import EditableClientTable from "./EditableClientTable";
import ConfirmationDialog from "../ConfirmationDialog";

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
}) => {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) setIsDeleteConfirmOpen(false);
  }, [isOpen]);

  if (!isOpen || !clientName) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-[1400px] max-h-[90vh] bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 md:px-6 py-4">
          <h2 className="text-2xl font-medium text-gray-800">{clientName}</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
          <EditableClientTable
            columns={columns}
            rows={rows}
            selectedCell={selectedCell}
            editingCell={editingCell}
            onCellClick={onCellClick}
            onCellChange={onCellChange}
            onCellBlur={onCellBlur}
            onLastCellTab={onLastCellTab}
          />

          {rows.length === 0 && <p className="mt-2 text-xs text-gray-500">No matching rows.</p>}
        </div>

        <div className="sticky bottom-0 z-20 bg-white border-t border-gray-200 px-4 md:px-6 py-4">
          <div className="flex items-center justify-start gap-4">
            <button
              type="button"
              onClick={onSave}
              className="px-12 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm cursor-pointer"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="px-12 py-2 border border-red-400 text-red-500 rounded-lg hover:bg-red-50 transition text-sm"
            >
              Delete All
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-12 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={isDeleteConfirmOpen}
        title="Delete All Items?"
        message={`This will remove all rows for ${clientName}. This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous
        onCancel={() => setIsDeleteConfirmOpen(false)}
        onConfirm={() => {
          onDeleteAll();
          setIsDeleteConfirmOpen(false);
        }}
      />
    </div>
  );
};

export default ClientDetailsDialog;
