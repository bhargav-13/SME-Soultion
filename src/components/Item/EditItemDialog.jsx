import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

const EditItemDialog = ({
  isOpen,
  onClose,
  onSave,
  initialData = null,
  categories = [],
}) => {
  const [formData, setFormData] = useState({
    sizeInch: "",
    sizeMM: "",
    categoryId: "",
    categoryName: "",
    itemKg: "",
    weightPerPL: "",
    weightUnit: "",
    totalPL: "",
    dozenWeight: "",
    lowStockWarning: "",
  });
  const [isWeightUnitOpen, setIsWeightUnitOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        sizeInch: initialData.sizeInch || "",
        sizeMM: initialData.sizeMM || "",
        categoryId: initialData.categoryId || "",
        categoryName: initialData.category || "",
        itemKg: initialData.itemKg || "",
        weightPerPL: initialData.weightPerPL || "",
        weightUnit: initialData.weightUnit || "",
        totalPL: initialData.totalPL || "",
        dozenWeight: initialData.dozenWeight || "",
        lowStockWarning: initialData.lowStockWarning || "",
      });
    }
  }, [initialData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newFormData = { ...prev, [name]: value };

      if (name === "itemKg" || name === "weightPerPL" || name === "weightUnit") {
        const itemKg = name === "itemKg" ? parseFloat(value) || 0 : parseFloat(prev.itemKg) || 0;
        const weightPerPc = name === "weightPerPL" ? parseFloat(value) || 0 : parseFloat(prev.weightPerPL) || 0;
        const weightUnit = name === "weightUnit" ? value : newFormData.weightUnit || prev.weightUnit;
        const weightPerPcInKg = weightUnit === "Gram" ? weightPerPc / 1000 : weightPerPc;
        if (itemKg > 0 && weightPerPcInKg > 0) {
          newFormData.totalPL = (itemKg / weightPerPcInKg).toFixed(2);
        } else {
          newFormData.totalPL = "";
        }
      }

      if (name === "weightPerPL" || name === "weightUnit") {
        const weightPerPc = name === "weightPerPL" ? parseFloat(value) || 0 : parseFloat(prev.weightPerPL) || 0;
        const weightUnit = name === "weightUnit" ? value : newFormData.weightUnit || prev.weightUnit;
        const weightPerPcInKg = weightUnit === "Gram" ? weightPerPc / 1000 : weightPerPc;
        if (weightPerPcInKg > 0) {
          newFormData.dozenWeight = (weightPerPcInKg * 12).toFixed(2);
        } else {
          newFormData.dozenWeight = "";
        }
      }

      return newFormData;
    });
  };

  const handleCategorySelect = (category) => {
    setFormData((prev) => ({
      ...prev,
      categoryId: category.id,
      categoryName: category.name,
    }));
    setIsCategoryOpen(false);
  };

  const handleSave = () => {
    if (!formData.sizeInch.trim() || !formData.categoryId) {
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
          <h2 className="text-xl font-medium text-gray-900">Edit Item</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-500">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4 mb-6">
          {/* Row 1 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Size in Inch<span className="text-black">*</span>
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
              <label className="block text-sm font-medium text-black mb-1">
                Size in MM<span className="text-black">*</span>
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

          {/* Row 2 - Category */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Category<span className="text-black">*</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-gray-500 transition text-sm"
              >
                <span className={formData.categoryName === "" ? "text-gray-500 text-sm" : "text-gray-900"}>
                  {formData.categoryName === "" ? "Select Category" : formData.categoryName}
                </span>
                <svg className={`w-4 h-4 text-gray-500 transition-transform ${isCategoryOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isCategoryOpen && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                  {categories.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500">No categories available</div>
                  ) : (
                    categories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => handleCategorySelect(category)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition"
                      >
                        {category.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">
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
              <label className="block text-sm font-medium text-black mb-1">
                Weight/Pc.<span className="text-black">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="weightPerPL"
                  value={formData.weightPerPL}
                  onChange={handleChange}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none text-sm"
                />
                <div className="relative w-24">
                  <button
                    type="button"
                    onClick={() => setIsWeightUnitOpen(!isWeightUnitOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-gray-500 transition text-sm"
                  >
                    <span className={formData.weightUnit === "" ? "text-gray-500 text-sm" : "text-gray-900 font-medium"}>
                      {formData.weightUnit === "" ? "Gm/Kg" : formData.weightUnit}
                    </span>
                    <svg className={`w-3 h-3 text-gray-500 transition-transform ${isWeightUnitOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isWeightUnitOpen && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                      {["Kg", "Gram"].map((unit) => (
                        <button
                          key={unit}
                          type="button"
                          onClick={() => {
                            handleChange({ target: { name: "weightUnit", value: unit } });
                            setIsWeightUnitOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition"
                        >
                          {unit}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Row 4 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Total Pc. <span className="text-gray-500 text-xs">(Auto-calculated)</span>
              </label>
              <input
                type="text"
                name="totalPL"
                value={formData.totalPL}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-black cursor-not-allowed outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Dozen Weight<span className="text-black">*</span>
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
            <label className="block text-sm font-medium text-black mb-1">
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
            className="bg-black text-white px-12 py-2 rounded-xl hover:bg-gray-900 transition font-medium text-sm"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="border border-black text-black px-12 py-2 rounded-xl hover:bg-gray-50 transition font-medium text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditItemDialog;
