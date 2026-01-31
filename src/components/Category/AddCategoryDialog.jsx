import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

const AddCategoryDialog = ({
  isOpen,
  onClose,
  onSave,
  initialData = null,
  isEdit = false,
}) => {
  const [formData, setFormData] = useState({
    categoryName: "",
    subCategories: [""],
  });

  useEffect(() => {
    if (initialData && isEdit) {
      setFormData({
        categoryName: initialData.categoryName,
        subCategories: initialData.subCategories.map((sub) => sub.name),
      });
    } else {
      setFormData({
        categoryName: "",
        subCategories: [""],
      });
    }
  }, [initialData, isEdit]);

  const handleCategoryChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      categoryName: e.target.value,
    }));
  };

  const handleSubCategoryChange = (index, value) => {
    const newSubCategories = [...formData.subCategories];
    newSubCategories[index] = value;
    setFormData((prev) => ({
      ...prev,
      subCategories: newSubCategories,
    }));
  };

  const addSubCategoryField = () => {
    setFormData((prev) => ({
      ...prev,
      subCategories: [...prev.subCategories, ""],
    }));
  };

  const handleSave = () => {
    if (!formData.categoryName.trim()) {
      alert("Please enter category name");
      return;
    }

    const filteredSubCategories = formData.subCategories.filter(
      (sub) => sub.trim() !== ""
    );

    if (filteredSubCategories.length === 0) {
      alert("Please add at least one sub category");
      return;
    }

    onSave({
      ...formData,
      subCategories: filteredSubCategories.map((name, idx) => ({
        id: idx + 1,
        name,
      })),
    });
  };

  if (!isOpen) return null;

  return (
   <div className="fixed inset-0 bg-black/15 flex items-center justify-center z-50 ">
  <div className="bg-white rounded-xl shadow-2xl py-10 px-20 w-full max-w-xl">
    
    {/* Header */}
    <div className="flex items-center justify-center mb-4">
      <h2 className="text-xl font-semibold text-gray-900">
        {isEdit ? "Edit Category" : "Add Categories"}
      </h2>
      
    </div>

    {/* Description */}
    <p className="text-sm text-gray-500 mb-10 text-center">
      {isEdit
        ? "Update category and subcategories for your inventory."
        : "Create categories and subcategories for organised inventory."}
    </p>

    {/* Form */}
    <div className="space-y-4 mb-6">
      <div>
        <label className="block text-md font-medium text-gray-700 mb-2">
          Enter New Category<span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.categoryName}
          onChange={handleCategoryChange}
          placeholder="Enter Category"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none"
        />
      </div>

      <div>
        <label className="block text-md font-medium text-gray-700 mb-2">
          Enter New Sub Category<span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          {formData.subCategories.map((subCategory, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={subCategory}
                onChange={(e) =>
                  handleSubCategoryChange(index, e.target.value)
                }
                placeholder="Enter Sub Category"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none"
              />
              {index === formData.subCategories.length - 1 && (
                <button
                  type="button"
                  onClick={addSubCategoryField}
                  className="px-4 py-2 border border-gray-800 text-gray-800 rounded-lg hover:bg-gray-50 transition font-medium whitespace-nowrap"
                >
                  Add More +
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
     
    </div>

    {/* Actions */}
    <div className="flex gap-4 justify-center">
      <button
        onClick={handleSave}
        className="bg-gray-800 text-white px-8 py-2 rounded-lg hover:bg-gray-900 transition"
      >
        Save
      </button>
      <button
        onClick={onClose}
        className="border border-gray-800 text-gray-800 px-8 py-2 rounded-lg hover:bg-gray-50 transition"
      >
        Cancel
      </button>
    </div>
  </div>
</div>

  );
};

export default AddCategoryDialog;
