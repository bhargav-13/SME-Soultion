import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import SidebarLayout from "../../../components/SidebarLayout";
import ConfirmationDialog from "../../../components/ConfirmationDialog";
import EditItemDialog from "../../../components/Item/EditItemDialog";
import ViewItemDialog from "../../../components/Item/ViewItemDialog";
import ItemsTable from "../../../components/Item/ItemsTable";
import SearchFilter from "../../../components/SearchFilter";
import { itemApi } from "../../../services/apiService";
import toast from "react-hot-toast";

const ItemMaster = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStockItems: 0,
  });
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    itemId: null,
    itemName: "",
  });
  const [editDialog, setEditDialog] = useState({
    isOpen: false,
    data: null,
  });
  const [viewDialog, setViewDialog] = useState({
    isOpen: false,
    data: null,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await itemApi.getAllItems();
      const itemsData = response.data;

      // API returns PaginatedResultItem with data array
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

      const totalItems = itemsData.totalElements || transformedItems.length;
      const lowStockItems = transformedItems.filter(
        (i) => i.lowStock === "Low Stock"
      ).length;
      setStats({ totalItems, lowStockItems });
    } catch (error) {
      console.error("Error fetching items:", error);
      toast.error(error.response?.data?.message || "Failed to fetch items");
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.sizeInch.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.subCategory.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      !categoryFilter ||
      item.category.toLowerCase().includes(categoryFilter.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  const handleAddItem = () => {
    navigate("/masters/item/add");
  };

  const handleEditItem = (item) => {
    setEditDialog({
      isOpen: true,
      data: item,
    });
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
    setEditDialog({
      isOpen: true,
      data: item,
    });
  };

  const handleViewDelete = (item) => {
    setViewDialog({ isOpen: false, data: null });
    handleDeleteClick(item);
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-medium text-black">
              Item Master
            </h1>
            <p className="text-gray-500  text-md mb-2">
              Centralised management of all items with sizes, weights,
              categories, and stock details.
            </p>
          </div>
          <button
            onClick={handleAddItem}
            className="flex items-center gap-2 bg-white border border-gray-800 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            <Plus className="w-5 h-5" />
            Add Item
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 h-[110px] flex flex-col justify-between">
            <p className="text-gray-500 ">Total Items</p>
            <p className="text-2xl font-medium text-black">
              {stats.totalItems}
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 h-[110px] flex flex-col justify-between">
            <p className="text-gray-500 ">Total Low Stock Items</p>
            <p className="text-2xl font-medium text-black">
              {stats.lowStockItems}
            </p>
          </div>
        </div>

        {/* Search and Filter */}
        <SearchFilter
          className="flex gap-4"
          searchQuery={searchTerm}
          setSearchQuery={setSearchTerm}
          typeFilter={categoryFilter}
          setTypeFilter={setCategoryFilter}
          filterOptions={["In Stock", "Low Stock"]}
          filterPlaceholder="Stock Status"
        />

        {/* Items Table */}
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading...</div>
        ) : (
          <ItemsTable
            items={filteredItems}
            onEdit={handleEditItem}
            onView={handleViewItem}
            onDelete={handleDeleteClick}
          />
        )}
      </div>

      {/* Edit Item Dialog */}
      <EditItemDialog
        isOpen={editDialog.isOpen}
        onClose={() => setEditDialog({ isOpen: false, data: null })}
        onSave={handleSaveEdit}
        initialData={editDialog.data}
      />

      {/* View Item Dialog */}
      <ViewItemDialog
        isOpen={viewDialog.isOpen}
        onClose={() => setViewDialog({ isOpen: false, data: null })}
        onEdit={handleViewEdit}
        onDelete={handleViewDelete}
        itemData={viewDialog.data}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Item"
        message={`Are you sure you want to delete "${deleteDialog.itemName}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() =>
          setDeleteDialog({ isOpen: false, itemId: null, itemName: "" })
        }
        isDangerous={true}
      />
    </SidebarLayout>
  );
};

export default ItemMaster;
