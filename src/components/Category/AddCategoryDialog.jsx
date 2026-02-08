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

  const removeSubCategoryField = (index) => {
    setFormData((prev) => ({
      ...prev,
      subCategories: prev.subCategories.filter((_, i) => i !== index),
    }));
  };

  const handleSave = () => {
    if (!formData.categoryName.trim()) {
      alert("Please enter category name");
      return;
    }

    const filteredSubCategories = formData.subCategories.filter(
      (sub) => sub.trim() !== "",
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
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[80vh] overflow-hidden px-16 py-8 ">
        {/* Header */}
        <div className="flex items-center justify-center mb-1">
          <h2 className="text-xl font-medium text-black">
            {isEdit ? "Edit Category" : "Add Categories"}
          </h2>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-500 mb-6 text-center">
          {isEdit
            ? "Update category and subcategories for your inventory."
            : "Create categories and subcategories for organised inventory."}
        </p>

        {/* Scrollable Form Section */}
        <div className="space-y-4 mb-6 overflow-y-auto max-h-[45vh] pr-2 scrollbar-custom hide-scrollbar ">
          <div>
            <label className="block text-md font-medium text-black mb-2">
              Enter New Category<span className="text-black">*</span>
            </label>
            <input
              type="text"
              value={formData.categoryName}
              onChange={handleCategoryChange}
              placeholder="Enter Category"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-[#343434] outline-none transition placeholder:text-sm placeholder:text-gray-500 "
            />
          </div>

          <div>
            <label className="block text-md font-medium text-black mb-2">
              Enter New Sub Category<span className="text-black">*</span>
            </label>
            <div className="space-y-2 pr-1">
              {formData.subCategories.map((subCategory, index) => (
                <div key={index} className="flex gap-2 items-center">
                  {/* Input wrapper */}
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={subCategory}
                      onChange={(e) =>
                        handleSubCategoryChange(index, e.target.value)
                      }
                      placeholder="Enter Sub Category"
                      className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:border-[#343434] outline-none transition placeholder:text-sm placeholder:text-gray-500"
                    />

                    {/* X icon inside input */}
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => removeSubCategoryField(index)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600 transition cursor-pointer "
                        aria-label="Remove sub category"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Add More button */}
                  {index === formData.subCategories.length - 1 && (
                    <button
                      type="button"
                      onClick={addSubCategoryField}
                      className="px-4 py-2 border border-[#343434] text-black rounded-lg hover:bg-gray-50 transition font-medium whitespace-nowrap cursor-pointer"
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
