import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Edit2, SquarePen, Trash2, Plus, ChevronRight, X, ChevronDown } from "lucide-react";
import SidebarLayout from "../../../components/SidebarLayout";
import ConfirmationDialog from "../../../components/ConfirmationDialog";
import AddCategoryDialog from "../../../components/Category/AddCategoryDialog";
import CategoriesData from "../../../Data/categorydata";
import SearchFilter from "../../../components/SearchFilter";

const CategoryMaster = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState(CategoriesData);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [stats, setStats] = useState({
    totalCategories: 0,
    totalSubCategories: 0,
  });
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    categoryId: null,
    categoryName: "",
  });
  const [addCategoryDialog, setAddCategoryDialog] = useState({
    isOpen: false,
    isEdit: false,
    data: null,
  });
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [editSubCategoryDialog, setEditSubCategoryDialog] = useState({
    isOpen: false,
    categoryId: null,
    subCategory: null,
  });
  const [deleteSubCategoryDialog, setDeleteSubCategoryDialog] = useState({
    isOpen: false,
    categoryId: null,
    subCategoryId: null,
    subCategoryName: "",
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = () => {
    try {
      setLoading(true);
      setCategories([...CategoriesData]);
      calculateStats();
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const totalCategories = CategoriesData.length;
    const totalSubCategories = CategoriesData.reduce(
      (sum, cat) => sum + cat.subCategories.length,
      0
    );
    setStats({
      totalCategories,
      totalSubCategories,
    });
  };

  const handleAddCategory = () => {
    setAddCategoryDialog({
      isOpen: true,
      isEdit: false,
      data: null,
    });
  };

  const handleEditCategory = (category) => {
    setAddCategoryDialog({
      isOpen: true,
      isEdit: true,
      data: category,
    });
  };

  const handleSaveCategory = (formData) => {
    if (addCategoryDialog.isEdit) {
      // Edit existing category
      const updatedCategories = categories.map((cat) =>
        cat.id === addCategoryDialog.data.id
          ? {
              ...cat,
              categoryName: formData.categoryName,
              subCategories: formData.subCategories,
            }
          : cat
      );
      setCategories(updatedCategories);
      setMessage("Category updated successfully!");
    } else {
      // Add new category
      const newCategory = {
        id: Math.max(...categories.map((c) => c.id), 0) + 1,
        categoryName: formData.categoryName,
        subCategories: formData.subCategories,
      };
      setCategories([...categories, newCategory]);
      setMessage("Category added successfully!");
    }
    setAddCategoryDialog({ isOpen: false, isEdit: false, data: null });
    setTimeout(() => setMessage(""), 3000);
    calculateStats();
  };

  const handleDeleteClick = (category) => {
    setDeleteDialog({
      isOpen: true,
      categoryId: category.id,
      categoryName: category.categoryName,
    });
  };

  const handleConfirmDelete = () => {
    setCategories(categories.filter((c) => c.id !== deleteDialog.categoryId));
    setMessage("Category deleted successfully!");
    setDeleteDialog({ isOpen: false, categoryId: null, categoryName: "" });
    setTimeout(() => setMessage(""), 3000);
    calculateStats();
  };

  const handleCancelDelete = () => {
    setDeleteDialog({ isOpen: false, categoryId: null, categoryName: "" });
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleEditSubCategory = (category, subCategory) => {
    setEditSubCategoryDialog({
      isOpen: true,
      categoryId: category.id,
      subCategory: { ...subCategory },
    });
  };

  const handleSaveSubCategory = (subCategoryName) => {
    const updatedCategories = categories.map((cat) =>
      cat.id === editSubCategoryDialog.categoryId
        ? {
            ...cat,
            subCategories: cat.subCategories.map((sub) =>
              sub.id === editSubCategoryDialog.subCategory.id
                ? { ...sub, name: subCategoryName }
                : sub
            ),
          }
        : cat
    );
    setCategories(updatedCategories);
    setEditSubCategoryDialog({ isOpen: false, categoryId: null, subCategory: null });
    setMessage("SubCategory updated successfully!");
    setTimeout(() => setMessage(""), 3000);
    calculateStats();
  };

  const handleDeleteSubCategoryClick = (category, subCategory) => {
    setDeleteSubCategoryDialog({
      isOpen: true,
      categoryId: category.id,
      subCategoryId: subCategory.id,
      subCategoryName: subCategory.name,
    });
  };

  const handleConfirmDeleteSubCategory = () => {
    const updatedCategories = categories.map((cat) =>
      cat.id === deleteSubCategoryDialog.categoryId
        ? {
            ...cat,
            subCategories: cat.subCategories.filter(
              (sub) => sub.id !== deleteSubCategoryDialog.subCategoryId
            ),
          }
        : cat
    );
    setCategories(updatedCategories);
    setDeleteSubCategoryDialog({ isOpen: false, categoryId: null, subCategoryId: null, subCategoryName: "" });
    setMessage("SubCategory deleted successfully!");
    setTimeout(() => setMessage(""), 3000);
    calculateStats();
  };

  const handleCancelDeleteSubCategory = () => {
    setDeleteSubCategoryDialog({ isOpen: false, categoryId: null, subCategoryId: null, subCategoryName: "" });
  };

  // Filter categories based on search and type
  const filteredCategories = categories.filter((category) => {
    const matchesSearch = category.categoryName
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesType =
      !typeFilter ||
      (typeFilter === "With SubCategories" && category.subCategories.length > 0) ||
      (typeFilter === "Without SubCategories" && category.subCategories.length === 0);
    return matchesSearch && matchesType;
  });

  return (
    <SidebarLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 mb-2">
                Category Master
              </h1>
              <p className="text-gray-600 text-md">
                Organise items into categories and subcategories for structured
                inventory management.
              </p>
            </div>
            <button
              onClick={handleAddCategory}
              className="flex items-center gap-2 bg-white text-gray-800 border-2 border-gray-900 px-6 py-2 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              <Plus className="w-5 h-5" />
              Add Categories
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border-2 border-gray-200">
            <h3 className="text-gray-500 font-medium mb-3">Total Categories</h3>
            <p className="text-4xl font-bold text-gray-900">
              {stats.totalCategories}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg border-2 border-gray-200">
            <h3 className="text-gray-500 font-medium mb-3">
              Total Sub Categories
            </h3>
            <p className="text-4xl font-bold text-gray-900">
              {stats.totalSubCategories}
            </p>
          </div>
        </div>

        {/* Message Alert */}
        {message && (
          <div className="mb-6 p-4 rounded-lg bg-green-50 text-green-800 border border-green-200 flex items-center justify-between">
            <span>{message}</span>
            <button
              onClick={() => setMessage("")}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search and Filter */}
        <SearchFilter
          className="mb-6 flex gap-4"
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          filterOptions={["Type", "With SubCategories", "Without SubCategories"]}
          filterPlaceholder="Type"
        />

        {/* Categories Grid */}
        <div className="grid grid-cols-2 gap-6">
          {loading ? (
            <div className="col-span-2 p-6 text-center text-gray-500">
              Loading...
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="col-span-2 p-6 text-center text-gray-500">
              No categories found
            </div>
          ) : (
            filteredCategories.map((category) => (
              <div
                key={category.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
              >
                {/* Category Header */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Category</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditCategory(category)}
                        className="text-black hover:text-balck transition"
                        title="Edit"
                      >
                        <SquarePen className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(category)}
                        className="text-red-600 hover:text-red-800 transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {category.categoryName}
                  </p>
                </div>

                {/* Sub Categories */}
                <div className="p-4">
                  <button
                    onClick={() => toggleExpand(category.id)}
                    className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 hover:bg-gray-50 p-2 rounded transition"
                  >
                    <span>
                      Sub Categories ({category.subCategories.length})
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        expandedId === category.id ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {expandedId === category.id && (
                    <div className="mt-3 space-y-2">
                      {category.subCategories.map((subCat) => (
                        <div
                          key={subCat.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                        >
                          <span className="text-gray-700">{subCat.name}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditSubCategory(category, subCat)}
                              className="text-black hover:text-blue-600 transition"
                              title="Edit"
                            >
                              <SquarePen className="w-3 h-3 cursor-pointer" />
                            </button>
                            <button
                              onClick={() => handleDeleteSubCategoryClick(category, subCat)}
                              className="text-red-600 hover:text-red-800 transition"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3 cursor-pointer" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Category Dialog */}
        <AddCategoryDialog
          isOpen={addCategoryDialog.isOpen}
          onClose={() =>
            setAddCategoryDialog({ isOpen: false, isEdit: false, data: null })
          }
          onSave={handleSaveCategory}
          initialData={addCategoryDialog.data}
          isEdit={addCategoryDialog.isEdit}
        />

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={deleteDialog.isOpen}
          title="Delete Category"
          message={`Are you sure you want to delete "${deleteDialog.categoryName}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          isDangerous={true}
        />

        {/* Edit SubCategory Dialog */}
        {editSubCategoryDialog.isOpen && (
          <div className="fixed inset-0 bg-black/50  flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Edit SubCategory</h2>
              <input
                type="text"
                defaultValue={editSubCategoryDialog.subCategory?.name || ""}
                id="subCategoryName"
                placeholder="Enter SubCategory name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none mb-4"
              />
              <div className="flex gap-4 justify-end">
                <button
                  onClick={() => setEditSubCategoryDialog({ isOpen: false, categoryId: null, subCategory: null })}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const inputValue = document.getElementById("subCategoryName").value.trim();
                    if (inputValue) {
                      handleSaveSubCategory(inputValue);
                    }
                  }}
                  className="px-4 py-2 bg-[#343434] text-white rounded-lg hover:bg-gray-800 transition"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete SubCategory Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={deleteSubCategoryDialog.isOpen}
          title="Delete SubCategory"
          message={`Are you sure you want to delete "${deleteSubCategoryDialog.subCategoryName}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleConfirmDeleteSubCategory}
          onCancel={handleCancelDeleteSubCategory}
          isDangerous={true}
        />
      </div>
    </SidebarLayout>
  );
};

export default CategoryMaster;
