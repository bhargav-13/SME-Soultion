import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import SidebarLayout from "../../../components/SidebarLayout";
import ConfirmationDialog from "../../../components/ConfirmationDialog";
import EditItemDialog from "../../../components/Item/EditItemDialog";
import ViewItemDialog from "../../../components/Item/ViewItemDialog";
import ItemsTable from "../../../components/Item/ItemsTable";
import ItemsData from "../../../Data/itemdata";

const ItemMaster = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState(ItemsData);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalItems: 359,
    lowStockItems: 4,
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
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);

  const filteredItems = items.filter(
    (item) => {
      const matchesSearch =
        item.sizeInch.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.subCategory.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        !categoryFilter || item.category.toLowerCase().includes(categoryFilter.toLowerCase());
      return matchesSearch && matchesCategory;
    }
  );

  const handleAddItem = () => {
    navigate("/masters/item/add");
  };

  const handleEditItem = (item) => {
    setEditDialog({
      isOpen: true,
      data: item,
    });
  };

  const handleSaveEdit = (formData) => {
    const updatedItems = items.map((item) =>
      item.id === editDialog.data.id ? { ...item, ...formData } : item
    );
    setItems(updatedItems);
    setEditDialog({ isOpen: false, data: null });
    setMessage("Item updated successfully!");
    setTimeout(() => setMessage(""), 3000);
  };

  const handleDeleteClick = (item) => {
    setDeleteDialog({
      isOpen: true,
      itemId: item.id,
      itemName: item.sizeInch,
    });
  };

  const handleConfirmDelete = () => {
    setItems(items.filter((item) => item.id !== deleteDialog.itemId));
    setDeleteDialog({ isOpen: false, itemId: null, itemName: "" });
    setMessage("Item deleted successfully!");
    setTimeout(() => setMessage(""), 3000);
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

  const getStockColor = (status) => {
    return status === "Low Stock"
      ? "bg-red-100 text-red-700"
      : "bg-green-100 text-green-700";
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl semi-bold text-gray-900">Item Master</h1>
            <p className="text-gray-600 mt-1 text-md">
              Centralised management of all items with sizes, weights, categories, and stock details.
            </p>
          </div>
          <button
            onClick={handleAddItem}
            className="flex items-center gap-2 bg-white border-2 border-gray-800 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            <Plus className="w-5 h-5" />
            Add Item
          </button>
        </div>

        {/* Success Message */}
        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {message}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <p className="text-gray-600 text-sm">Total Items</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {stats.totalItems}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <p className="text-gray-600 text-sm">Total Low Stock Items</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {stats.lowStockItems}
            </p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4 ">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="relative w-48">
            <button
              type="button"
              onClick={() => setIsCategoryFilterOpen(!isCategoryFilterOpen)}
              className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-gray-500 transition"
            >
              <span className={categoryFilter === "" ? "text-gray-400" : "text-gray-900"}>
                {categoryFilter === "" ? "Type" : categoryFilter}
              </span>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${isCategoryFilterOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isCategoryFilterOpen && (
              <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                {["Type", "Butt Hinges", "Door Hinges"].map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => {
                      setCategoryFilter(category === "Type" ? "" : category);
                      setIsCategoryFilterOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition"
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/*Items Table */}
        <ItemsTable
          items={filteredItems}
          onEdit={handleEditItem}
          onView={handleViewItem}
          onDelete={handleDeleteClick}
        />
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
      />
    </SidebarLayout>
  );
};

export default ItemMaster;
