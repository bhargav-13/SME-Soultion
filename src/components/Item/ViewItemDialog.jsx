import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

const ViewItemDialog = ({
  isOpen,
  onClose,
  onEdit,
  onDelete,
  itemData = null,
}) => {
  const [formData, setFormData] = useState({
    sizeInch: "",
    sizeMM: "",
    category: "",
    subCategory: "",
    itemKg: "",
    weightPerPL: "",
    totalPL: "",
    dozenWeight: "",
    lowStockWarning: "",
  });

  useEffect(() => {
    if (itemData) {
      setFormData({
        sizeInch: itemData.sizeInch || "",
        sizeMM: itemData.sizeMM || "",
        category: itemData.category || "",
        subCategory: itemData.subCategory || "",
        itemKg: itemData.itemKg || "",
        weightPerPL: itemData.weightPerPL || "",
        totalPL: itemData.totalPL || "",
        dozenWeight: itemData.dozenWeight || "",
        lowStockWarning: itemData.lowStockWarning || "",
      });
    }
  }, [itemData, isOpen]);

  const handleEdit = () => {
    if (onEdit) {
      onEdit(itemData);
    }
    onClose();
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(itemData);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50  flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Item Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form - Read Only */}
        <div className="space-y-4 mb-6">
          {/* Row 1 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Size in Inch
              </label>
              <input
                type="text"
                value={formData.sizeInch}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Size in MM
              </label>
              <input
                type="text"
                value={formData.sizeMM}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-600"
              />
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sub Category
              </label>
              <input
                type="text"
                value={formData.subCategory}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-600"
              />
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item in Kg
              </label>
              <input
                type="text"
                value={formData.itemKg}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weight/PL
              </label>
              <input
                type="text"
                value={formData.weightPerPL}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-600"
              />
            </div>
          </div>

          {/* Row 4 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total PL
              </label>
              <input
                type="text"
                value={formData.totalPL}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dozen Weight
              </label>
              <input
                type="text"
                value={formData.dozenWeight}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-600"
              />
            </div>
          </div>

          {/* Row 5 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Low stock Warning [Pcs]
            </label>
            <input
              type="text"
              value={formData.lowStockWarning}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-600"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleEdit}
            className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-900 transition font-medium text-sm"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="border-2 border-gray-800 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-50 transition font-medium text-sm"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewItemDialog;
