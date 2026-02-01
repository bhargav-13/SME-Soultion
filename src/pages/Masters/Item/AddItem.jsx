import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, X } from "lucide-react";
import SidebarLayout from "../../../components/SidebarLayout";
import ItemsTable from "../../../components/Item/ItemsTable";
import ConfirmationDialog from "../../../components/ConfirmationDialog";
import ViewItemDialog from "../../../components/Item/ViewItemDialog";
import EditItemDialog from "../../../components/Item/EditItemDialog";
import ItemsData from "../../../Data/itemdata";
import SearchFilter from "../../../components/SearchFilter";

const AddItem = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    sizeInch: "",
    sizeMM: "",
    category: "",
    subCategory: "",
    itemKg: "",
    weightPerPL: "",
    weightUnit: "Kg",
    totalPL: "",
    dozenWeight: "",
    lowStockWarning: "",
  });
  const [items, setItems] = useState(ItemsData);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
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
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = () => {
    try {
      setLoading(true);
      setItems([...ItemsData]);
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (
        !formData.sizeInch.trim() ||
        !formData.category.trim() ||
        !formData.itemKg.trim()
      ) {
        alert("Please fill in all required fields");
        setLoading(false);
        return;
      }

      const newItem = {
        id: Math.max(...items.map((i) => i.id), 0) + 1,
        sizeInch: formData.sizeInch,
        sizeMM: formData.sizeMM,
        category: formData.category,
        subCategory: formData.subCategory,
        totalKg: formData.itemKg,
        dozenWeight: formData.dozenWeight,
        lowStock: "In Stock",
        itemKg: formData.itemKg,
        weightPerPL: formData.weightPerPL,
        weightUnit: formData.weightUnit,
        totalPL: formData.totalPL,
        lowStockWarning: formData.lowStockWarning,
      };

      setItems([...items, newItem]);
      setMessage("Item added successfully!");
      setFormData({
        sizeInch: "",
        sizeMM: "",
        category: "",
        subCategory: "",
        itemKg: "",
        weightPerPL: "",
        weightUnit: "Kg",
        totalPL: "",
        dozenWeight: "",
        lowStockWarning: "",
      });
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("Error adding item: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      sizeInch: "",
      sizeMM: "",
      category: "",
      subCategory: "",
      itemKg: "",
      weightPerPL: "",
      weightUnit: "Kg",
      totalPL: "",
      dozenWeight: "",
      lowStockWarning: "",
    });
    setMessage("");
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

  const handleConfirmDelete = () => {
    try {
      setItems(items.filter((i) => i.id !== deleteDialog.itemId));
      setMessage("Item deleted successfully!");
      setDeleteDialog({ isOpen: false, itemId: null, itemName: "" });
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error deleting item:", error);
      setMessage("Error deleting item: " + error.message);
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

  const handleSaveEdit = (formData) => {
    const updatedItems = items.map((item) =>
      item.id === editDialog.data.id ? { ...item, ...formData } : item
    );
    setItems(updatedItems);
    setEditDialog({ isOpen: false, data: null });
    setMessage("Item updated successfully!");
    setTimeout(() => setMessage(""), 3000);
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
            Create and define item specifications including size, weight, category, and stock thresholds.
          </p>
        </div>

        {/* Message Alert */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center justify-between ${
              message.includes("Error")
                ? "bg-red-50 text-red-800 border border-red-200"
                : "bg-green-50 text-green-800 border border-green-200"
            }`}
          >
            <span>{message}</span>
            <button
              onClick={() => setMessage("")}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave} className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
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

            {/* Row 2 */}
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
                        formData.category === ""
                          ? "text-gray-400"
                          : "text-gray-900"
                      }
                    >
                      {formData.category === ""
                        ? "Select Category"
                        : formData.category}
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
                    <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                      {["Butt Hinges", "Door Hinges"].map((category) => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              category: category,
                            }));
                            setIsCategoryOpen(false);
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sub Category
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsSubCategoryOpen(!isSubCategoryOpen)}
                    className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-gray-500 transition"
                  >
                    <span
                      className={
                        formData.subCategory === ""
                          ? "text-gray-400"
                          : "text-gray-900"
                      }
                    >
                      {formData.subCategory === ""
                        ? "Select Sub Category"
                        : formData.subCategory}
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
                    <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                      {["Medium Butt", "Heavy Butt"].map((subCategory) => (
                        <button
                          key={subCategory}
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              subCategory: subCategory,
                            }));
                            setIsSubCategoryOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition"
                        >
                          {subCategory}
                        </button>
                      ))}
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
                  Total Pc.<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="totalPL"
                  value={formData.totalPL}
                  onChange={handleChange}
                  placeholder="Enter Pc."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dozen Weight<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="dozenWeight"
                  value={formData.dozenWeight}
                  onChange={handleChange}
                  placeholder="Enter Dozen Weight"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none"
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
                className="px-8 py-2 bg-[#343434] text-white rounded-full hover:bg-gray-800 transition font-medium disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-8 py-2 border-2 border-gray-900 text-gray-900 rounded-full hover:bg-gray-50 transition font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>

        {/* Search and Filter */}
        {/* <div className="mb-6 flex gap-4 ">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search by size or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
                {categoryFilter === "" ? "All Categories" : categoryFilter}
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
                {["All Categories", "Butt Hinges", "Door Hinges"].map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => {
                      setCategoryFilter(category === "All Categories" ? "" : category);
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
        </div> */}
<SearchFilter
  className="mb-6 flex gap-4"
  searchQuery={searchQuery}
  setSearchQuery={setSearchQuery}
  typeFilter={categoryFilter}
  setTypeFilter={setCategoryFilter}
  filterOptions={["All Categories", "Butt Hinges", "Door Hinges"]}
  filterPlaceholder="Type"
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
