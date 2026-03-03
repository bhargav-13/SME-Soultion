import React, { useState, useEffect } from "react";

const AddCategoryDialog = ({
  isOpen,
  onClose,
  onSave,
  initialData = null,
  isEdit = false,
}) => {
  const [categoryName, setCategoryName] = useState("");

  useEffect(() => {
    if (initialData && isEdit) {
      setCategoryName(initialData.categoryName);
    } else {
      setCategoryName("");
    }
  }, [initialData, isEdit, isOpen]);

  const handleSave = () => {
    if (!categoryName.trim()) {
      alert("Please enter category name");
      return;
    }
    onSave({ categoryName: categoryName.trim() });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md px-10 py-8">
        {/* Header */}
        <div className="flex items-center justify-center mb-1">
          <h2 className="text-xl font-medium text-black">
            {isEdit ? "Edit Category" : "Add Category"}
          </h2>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-500 mb-6 text-center">
          {isEdit
            ? "Update category name for your inventory."
            : "Create a new category for organised inventory."}
        </p>

        {/* Form */}
        <div className="mb-6">
          <label className="block text-md font-medium text-black mb-2">
            Category Name<span className="text-black">*</span>
          </label>
          <input
            type="text"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="Enter Category"
            autoFocus
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-[#343434] outline-none transition placeholder:text-sm placeholder:text-gray-500"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={handleSave}
            className="bg-black text-white px-12 py-2 rounded-xl hover:bg-gray-900 transition font-medium cursor-pointer"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="border border-black text-black px-12 py-2 rounded-xl hover:bg-gray-50 transition font-medium cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddCategoryDialog;
