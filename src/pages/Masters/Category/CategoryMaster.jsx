import React, { useState, useEffect } from "react";
import {
  SquarePen,
  Trash2,
  Plus,
} from "lucide-react";
import SidebarLayout from "../../../components/SidebarLayout";
import ConfirmationDialog from "../../../components/ConfirmationDialog";
import AddCategoryDialog from "../../../components/Category/AddCategoryDialog";
import SearchFilter from "../../../components/SearchFilter";
import StatsCard from "../../../components/StatsCard";
import PageHeader from "../../../components/PageHeader";
import PrimaryActionButton from "../../../components/PrimaryActionButton";
import { categoryApi } from "../../../services/apiService";
import toast from "react-hot-toast";

const CategoryMaster = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
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
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await categoryApi.getAllCategories();
      const categoriesData = response.data;

      const transformedCategories = categoriesData.map((cat) => ({
        id: cat.id,
        categoryName: cat.name,
      }));

      setCategories(transformedCategories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error(error.response?.data?.message || "Failed to fetch categories");
    } finally {
      setLoading(false);
    }
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

  const handleSaveCategory = async (formData) => {
    try {
      if (addCategoryDialog.isEdit) {
        await categoryApi.updateCategory(addCategoryDialog.data.id, {
          name: formData.categoryName,
        });
        toast.success("Category updated successfully!");
      } else {
        await categoryApi.createCategory({ name: formData.categoryName });
        toast.success("Category added successfully!");
      }

      setAddCategoryDialog({ isOpen: false, isEdit: false, data: null });
      await fetchCategories();
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error(error.response?.data?.message || "Failed to save category");
    }
  };

  const handleDeleteClick = (category) => {
    setDeleteDialog({
      isOpen: true,
      categoryId: category.id,
      categoryName: category.categoryName,
    });
  };

  const handleConfirmDelete = async () => {
    try {
      await categoryApi.deleteCategory(deleteDialog.categoryId);
      await fetchCategories();
      setDeleteDialog({ isOpen: false, categoryId: null, categoryName: "" });
      toast.success("Category deleted successfully!");
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error(error.response?.data?.message || "Failed to delete category");
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialog({ isOpen: false, categoryId: null, categoryName: "" });
  };

  // Filter categories based on search
  const filteredCategories = categories.filter((category) =>
    category.categoryName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SidebarLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <PageHeader
            title="Category Master"
            description="Organise items into categories for structured inventory management."
            action={
              <PrimaryActionButton
                onClick={handleAddCategory}
                icon={Plus}
                className="border-black"
              >
                Add Category
              </PrimaryActionButton>
            }
          />
        </div>

        {/* Stats Card */}
        <div className="mb-8">
          <StatsCard
            label="Total Categories"
            value={categories.length}
            className="border-gray-200 max-w-xs"
          />
        </div>

        {/* Search */}
        <SearchFilter
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          filterOptions={[]}
          filterPlaceholder="Filter"
        />

        {/* Categories Grid */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          {loading ? (
            <div className="col-span-3 p-6 text-center text-gray-500">
              Loading...
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="col-span-3 p-6 text-center text-gray-500">
              No categories found
            </div>
          ) : (
            filteredCategories.map((category) => (
              <div
                key={category.id}
                className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex items-center justify-between hover:shadow-sm transition"
              >
                <span className="text-sm font-medium text-gray-800">
                  {category.categoryName}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditCategory(category)}
                    className="text-gray-500 hover:text-gray-800 transition"
                    title="Edit"
                  >
                    <SquarePen className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(category)}
                    className="text-red-500 hover:text-red-700 transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add/Edit Category Dialog */}
        <AddCategoryDialog
          isOpen={addCategoryDialog.isOpen}
          onClose={() =>
            setAddCategoryDialog({ isOpen: false, isEdit: false, data: null })
          }
          onSave={handleSaveCategory}
          initialData={addCategoryDialog.data}
          isEdit={addCategoryDialog.isEdit}
        />

        {/* Delete Confirmation Dialog */}
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
      </div>
    </SidebarLayout>
  );
};

export default CategoryMaster;
