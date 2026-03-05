import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import SidebarLayout from "../../../components/SidebarLayout";
import ConfirmationDialog from "../../../components/ConfirmationDialog";
import EditItemDialog from "../../../components/Item/EditItemDialog";
import ViewItemDialog from "../../../components/Item/ViewItemDialog";
import ItemsTable from "../../../components/Item/ItemsTable";
import SearchFilter from "../../../components/SearchFilter";
import StatsCard from "../../../components/StatsCard";
import PageHeader from "../../../components/PageHeader";
import PrimaryActionButton from "../../../components/PrimaryActionButton";
import { itemApi, categoryApi } from "../../../services/apiService";
import toast from "react-hot-toast";
import Loader from "../../../components/Loader";

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
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoryApi.getAllCategories();
      const categoriesData = response.data;
      setCategories(
        categoriesData.map((cat) => ({
          id: cat.id,
          name: cat.name,
        }))
      );
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

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
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
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
        categoryId: formData.categoryId || editDialog.data.categoryId,
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
        <PageHeader
          title="Item Master"
          description="Centralised management of all items with sizes, weights, categories, and stock details."
          action={
            <PrimaryActionButton
              onClick={handleAddItem}
              icon={Plus}
              className="border-gray-800 text-black px-4"
            >
              Add Item
            </PrimaryActionButton>
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <StatsCard
            label="Total Items"
            value={stats.totalItems}
            className="border-gray-200"
          />
          <StatsCard
            label="Total Low Stock Items"
            value={stats.lowStockItems}
            className="border-gray-200"
          />
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
          <Loader text="Loading items..." />
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
        categories={categories}
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
