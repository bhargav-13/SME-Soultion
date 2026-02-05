import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import SidebarLayout from "../../../components/SidebarLayout";
import ItemsTable from "../../../components/Item/ItemsTable";
import ConfirmationDialog from "../../../components/ConfirmationDialog";
import ViewItemDialog from "../../../components/Item/ViewItemDialog";
import EditItemDialog from "../../../components/Item/EditItemDialog";
import SearchFilter from "../../../components/SearchFilter";
import { itemApi, categoryApi } from "../../../services/apiService";
import toast from "react-hot-toast";

const AddItem = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    sizeInch: "",
    sizeMM: "",
    categoryId: "",
    categoryName: "",
    subCategoryId: "",
    subCategoryName: "",
    itemKg: "",
    weightPerPL: "",
    weightUnit: "Kg",
    totalPL: "",
    dozenWeight: "",
    lowStockWarning: "",
  });
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    itemId: null,
    itemName: "",
  });
  const [viewDialog, setViewDialog] = useState({
    isOpen: false,
    data: null,
  });
  const [editDialog, setEditDialog] = useState({
    isOpen: false,
    data: null,
  });
  const [isWeightUnitOpen, setIsWeightUnitOpen] = useState(false);
  const [isSubCategoryOpen, setIsSubCategoryOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await itemApi.getAllItems();
      const itemsData = response.data;

      const rawItems = itemsData.data || itemsData;

      const transformedItems = (Array.isArray(rawItems) ? rawItems : []).map((item) => ({
        id: item.id,
        sizeInch: item.sizeInch || "",
        sizeMM: item.sizeMm || "",
        category: item.itemCategory?.name || "",
        categoryId: item.itemCategory?.id,
        subCategory: item.itemSubCategory?.name || "",
        subCategoryId: item.itemSubCategory?.id,
        totalKg: item.itemKg,
        itemKg: item.itemKg,
        weightPerPL: item.weightPerPc,
        totalPL: item.totalPc,
        dozenWeight: item.dozenWeight,
        lowStockWarning: item.lowStockWarning,
        lowStock: item.stockStatus === "LOW_STOCK" ? "Low Stock" : "In Stock",
        stockStatus: item.stockStatus,
      }));

      setItems(transformedItems);
    } catch (error) {
      console.error("Error fetching items:", error);
      toast.error(error.response?.data?.message || "Failed to fetch items");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoryApi.getAllCategories();
      const categoriesData = response.data;

      setCategories(
        categoriesData.map((cat) => ({
          id: cat.id,
          name: cat.name,
          subCategories: (cat.subCategories || []).map((sub) => ({
            id: sub.id,
            name: sub.name,
          })),
        }))
      );
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleCategorySelect = (category) => {
    setFormData((prev) => ({
      ...prev,
      categoryId: category.id,
      categoryName: category.name,
      subCategoryId: "",
      subCategoryName: "",
    }));
    setSubCategories(category.subCategories || []);
    setIsCategoryOpen(false);
  };

  const handleSubCategorySelect = (subCategory) => {
    setFormData((prev) => ({
      ...prev,
      subCategoryId: subCategory.id,
      subCategoryName: subCategory.name,
    }));
    setIsSubCategoryOpen(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData((prev) => {
      const newFormData = {
        ...prev,
        [name]: value,
      };

      // Auto-calculate Total Pc when Item Kg or Weight/Pc changes
      if (name === 'itemKg' || name === 'weightPerPL') {
        const itemKg = name === 'itemKg' ? parseFloat(value) || 0 : parseFloat(prev.itemKg) || 0;
        const weightPerPc = name === 'weightPerPL' ? parseFloat(value) || 0 : parseFloat(prev.weightPerPL) || 0;
        
        if (itemKg > 0 && weightPerPc > 0) {
          // Total Pc = Item Kg / Weight per Pc
          newFormData.totalPL = (itemKg / weightPerPc).toFixed(2);
        } else {
          newFormData.totalPL = '';
        }
      }

      // Auto-calculate Dozen Weight when Weight/Pc changes
      if (name === 'weightPerPL') {
        const weightPerPc = parseFloat(value) || 0;
        
        if (weightPerPc > 0) {
          // Dozen Weight = Weight per Pc × 12
          newFormData.dozenWeight = (weightPerPc * 12).toFixed(2);
        } else {
          newFormData.dozenWeight = '';
        }
      }

      return newFormData;
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!formData.sizeInch.trim() || !formData.categoryId || !formData.itemKg.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const createData = {
        sizeInch: formData.sizeInch,
        sizeMm: formData.sizeMM,
        categoryId: formData.categoryId,
        subCategoryId: formData.subCategoryId || undefined,
        itemKg: parseFloat(formData.itemKg) || 0,
        weightPerPc: parseFloat(formData.weightPerPL) || 0,
        totalPc: parseFloat(formData.totalPL) || 0,
        dozenWeight: parseFloat(formData.dozenWeight) || 0,
        lowStockWarning: parseFloat(formData.lowStockWarning) || 0,
        stockStatus: "IN_STOCK",
      };

      await itemApi.createItem(createData);

      toast.success("Item added successfully!");
      setFormData({
        sizeInch: "",
        sizeMM: "",
        categoryId: "",
        categoryName: "",
        subCategoryId: "",
        subCategoryName: "",
        itemKg: "",
        weightPerPL: "",
        weightUnit: "Kg",
        totalPL: "",
        dozenWeight: "",
        lowStockWarning: "",
      });
      setSubCategories([]);

      await fetchItems();
    } catch (error) {
      console.error("Error adding item:", error);
      toast.error(error.response?.data?.message || "Failed to add item");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      sizeInch: "",
      sizeMM: "",
      categoryId: "",
      categoryName: "",
      subCategoryId: "",
      subCategoryName: "",
      itemKg: "",
      weightPerPL: "",
      weightUnit: "Kg",
      totalPL: "",
      dozenWeight: "",
      lowStockWarning: "",
    });
    setSubCategories([]);
  };

  const handleEdit = (item) => {
    setEditDialog({
      isOpen: true,
      data: item,
    });
  };

  const handleDeleteClick = (item) => {
    setDeleteDialog({
      isOpen: true,
      itemId: item.id,
      itemName: item.sizeInch,
    });
  };

  const handleConfirmDelete = async () => {
    try {
      await itemApi.deleteItem(deleteDialog.itemId);
      await fetchItems();

      setDeleteDialog({ isOpen: false, itemId: null, itemName: "" });
      toast.success("Item deleted successfully!");
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error(error.response?.data?.message || "Failed to delete item");
    }
  };

  const handleViewItem = (item) => {
    setViewDialog({
      isOpen: true,
      data: item,
    });
  };

  const handleViewEdit = (item) => {
    setViewDialog({ isOpen: false, data: null });
    handleEdit(item);
  };

  const handleViewDelete = (item) => {
    setViewDialog({ isOpen: false, data: null });
    handleDeleteClick(item);
  };

  const handleCancelDelete = () => {
    setDeleteDialog({ isOpen: false, itemId: null, itemName: "" });
  };

  const handleSaveEdit = async (formData) => {
    try {
      const updateData = {
        sizeInch: formData.sizeInch,
        sizeMm: formData.sizeMM,
        categoryId: editDialog.data.categoryId,
        subCategoryId: editDialog.data.subCategoryId,
        itemKg: parseFloat(formData.itemKg) || 0,
        weightPerPc: parseFloat(formData.weightPerPL) || 0,
        totalPc: parseFloat(formData.totalPL) || 0,
        dozenWeight: parseFloat(formData.dozenWeight) || 0,
        lowStockWarning: parseFloat(formData.lowStockWarning) || 0,
        stockStatus: editDialog.data.stockStatus || "IN_STOCK",
      };

      await itemApi.updateItem(editDialog.data.id, updateData);
      await fetchItems();

      setEditDialog({ isOpen: false, data: null });
      toast.success("Item updated successfully!");
    } catch (error) {
      console.error("Error updating item:", error);
      toast.error(error.response?.data?.message || "Failed to update item");
    }
  };

  // Filter items based on search and category
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.sizeInch.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      !categoryFilter ||
      item.category.toLowerCase().includes(categoryFilter.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  return (
    <SidebarLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-gray-900">Add New Item</h1>
          <p className="text-md text-gray-600 mt-1">
            Create and define item specifications including size, weight,
            category, and stock thresholds.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSave}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8"
        >
          <div className="space-y-6">
            {/* Row 1 */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Size in Inch<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="sizeInch"
                  value={formData.sizeInch}
                  onChange={handleChange}
                  placeholder="Enter size"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Size in MM<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="sizeMM"
                  value={formData.sizeMM}
                  onChange={handleChange}
                  placeholder="Enter size"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            {/* Row 2 - Category & SubCategory from API */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category<span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                    className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-gray-500 transition"
                  >
                    <span
                      className={
                        formData.categoryName === ""
                          ? "text-gray-400"
                          : "text-gray-900"
                      }
                    >
                      {formData.categoryName === ""
                        ? "Select Category"
                        : formData.categoryName}
                    </span>
                    <svg
                      className={`w-4 h-4 text-gray-500 transition-transform ${
                        isCategoryOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {isCategoryOpen && (
                    <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                      {categories.length === 0 ? (
                        <div className="px-4 py-2 text-sm text-gray-500">
                          No categories available
                        </div>
                      ) : (
                        categories.map((category) => (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => handleCategorySelect(category)}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition"
                          >
                            {category.name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sub Category
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsSubCategoryOpen(!isSubCategoryOpen)}
                    disabled={!formData.categoryId}
                    className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-gray-500 transition disabled:bg-gray-50 disabled:cursor-not-allowed"
                  >
                    <span
                      className={
                        formData.subCategoryName === ""
                          ? "text-gray-400"
                          : "text-gray-900"
                      }
                    >
                      {formData.subCategoryName === ""
                        ? "Select Sub Category"
                        : formData.subCategoryName}
                    </span>
                    <svg
                      className={`w-4 h-4 text-gray-500 transition-transform ${
                        isSubCategoryOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {isSubCategoryOpen && (
                    <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                      {subCategories.length === 0 ? (
                        <div className="px-4 py-2 text-sm text-gray-500">
                          No sub categories available
                        </div>
                      ) : (
                        subCategories.map((subCategory) => (
                          <button
                            key={subCategory.id}
                            type="button"
                            onClick={() => handleSubCategorySelect(subCategory)}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition"
                          >
                            {subCategory.name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item in Kg<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="itemKg"
                  value={formData.itemKg}
                  onChange={handleChange}
                  placeholder="Enter Kg"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weight/Pc.<span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="weightPerPL"
                    value={formData.weightPerPL}
                    onChange={handleChange}
                    placeholder="Enter Weight/Pc."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none"
                  />
                  <div className="relative w-24">
                    <button
                      type="button"
                      onClick={() => setIsWeightUnitOpen(!isWeightUnitOpen)}
                      className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-gray-500 transition"
                    >
                      <span className="text-gray-900 font-medium">
                        {formData.weightUnit}
                      </span>
                      <svg
                        className={`w-4 h-4 text-gray-500 transition-transform ${
                          isWeightUnitOpen ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {isWeightUnitOpen && (
                      <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                        {["Kg", "Gram"].map((unit) => (
                          <button
                            key={unit}
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                weightUnit: unit,
                              }));
                              setIsWeightUnitOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition"
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
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Pc. <span className="text-gray-500 text-xs">(Auto-calculated)</span>
                </label>
                <input
                  type="text"
                  name="totalPL"
                  value={formData.totalPL}
                  readOnly
                  placeholder="Auto-calculated"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dozen Weight <span className="text-gray-500 text-xs">(Auto-calculated)</span>
                </label>
                <input
                  type="text"
                  name="dozenWeight"
                  value={formData.dozenWeight}
                  readOnly
                  placeholder="Auto-calculated"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed outline-none"
                />
              </div>
            </div>

            {/* Row 5 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Low stock Warning [Pc.]
              </label>
              <input
                type="text"
                name="lowStockWarning"
                value={formData.lowStockWarning}
                onChange={handleChange}
                placeholder="Set Low stock Warning"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
                <button
                type="submit"
                disabled={loading}
                className="px-12 py-2 bg-[#343434] text-white rounded-2xl hover:bg-gray-800 transition font-medium disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-12 py-2 border border-[#343434] text-[#343434] rounded-2xl hover:bg-gray-50 transition font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>

        {/* Search and Filter */}
        <SearchFilter
          className="mb-6 flex gap-4"
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          typeFilter={categoryFilter}
          setTypeFilter={setCategoryFilter}
          filterOptions={categories.map((c) => c.name)}
          filterPlaceholder="Category"
        />

        {/* Items Table */}
        <ItemsTable
          items={filteredItems}
          onEdit={handleEdit}
          onView={handleViewItem}
          onDelete={handleDeleteClick}
        />

        {/* View Item Dialog */}
        <ViewItemDialog
          isOpen={viewDialog.isOpen}
          onClose={() => setViewDialog({ isOpen: false, data: null })}
          onEdit={handleViewEdit}
          onDelete={handleViewDelete}
          itemData={viewDialog.data}
        />

        {/* Edit Item Dialog */}
        <EditItemDialog
          isOpen={editDialog.isOpen}
          onClose={() => setEditDialog({ isOpen: false, data: null })}
          onSave={handleSaveEdit}
          initialData={editDialog.data}
        />

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={deleteDialog.isOpen}
          title="Delete Item"
          message={`Are you sure you want to delete "${deleteDialog.itemName}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          isDangerous={true}
        />
      </div>
    </SidebarLayout>
  );
};

export default AddItem;
