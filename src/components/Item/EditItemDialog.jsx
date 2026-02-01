import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

const EditItemDialog = ({
  isOpen,
  onClose,
  onSave,
  initialData = null,
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
    if (initialData) {
      setFormData({
        sizeInch: initialData.sizeInch || "",
        sizeMM: initialData.sizeMM || "",
        category: initialData.category || "",
        subCategory: initialData.subCategory || "",
        itemKg: initialData.itemKg || "",
        weightPerPL: initialData.weightPerPL || "",
        totalPL: initialData.totalPL || "",
        dozenWeight: initialData.dozenWeight || "",
        lowStockWarning: initialData.lowStockWarning || "",
      });
    }
  }, [initialData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = () => {
    if (!formData.sizeInch.trim() || !formData.category.trim()) {
      alert("Please fill in required fields");
      return;
    }
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Edit Item</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4 mb-6">
          {/* Row 1 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Size in Inch<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="sizeInch"
                value={formData.sizeInch}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Size in MM<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="sizeMM"
                value={formData.sizeMM}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none text-sm"
              />
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sub Category
              </label>
              <input
                type="text"
                name="subCategory"
                value={formData.subCategory}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none text-sm"
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
                name="itemKg"
                value={formData.itemKg}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weight/Pc.<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="weightPerPL"
                value={formData.weightPerPL}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none text-sm"
              />
            </div>
          </div>

          {/* Row 4 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Pc.
              </label>
              <input
                type="text"
                name="totalPL"
                value={formData.totalPL}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dozen Weight<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="dozenWeight"
                value={formData.dozenWeight}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none text-sm"
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
              name="lowStockWarning"
              value={formData.lowStockWarning}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none text-sm"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={handleSave}
            className=" bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-900 transition font-medium text-sm"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="border-2 border-gray-800 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-50 transition font-medium text-sm"
          >
            Cancle
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditItemDialog;
