import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SidebarLayout from "../../../components/SidebarLayout";
import ConfirmationDialog from "../../../components/ConfirmationDialog";
import PartiesTable from "../../../components/Party/PartiesTable";
import EditPartyDialog from "../../../components/Party/EditPartyDialog";
import { partyApi } from "../../../services/apiService";
import toast from "react-hot-toast";

const AddParty = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    partyName: "",
    email: "",
    phone: "",
    gstNumber: "",
    partyType: "",
  });

  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [isTypeOpen, setIsTypeOpen] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    partyId: null,
    partyName: "",
  });
  const [editDialog, setEditDialog] = useState({
    isOpen: false,
    data: null,
  });

  useEffect(() => {
    fetchParties();
  }, []);

  const fetchParties = async () => {
    try {
      setLoading(true);
      const response = await partyApi.getAllParties();
      const partiesData = response.data;

      const transformedParties = partiesData.map((party) => ({
        id: party.id,
        name: party.name,
        email: party.email,
        phone: party.contactNo,
        contact: party.contactNo,
        gstin: party.gst,
        type: party.partyType === "CUSTOMER" ? "Customer" : "Vendor",
      }));

      setParties(transformedParties);
    } catch (error) {
      console.error("Error fetching parties:", error);
      toast.error(error.response?.data?.message || "Failed to fetch parties");
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.partyName.trim()) {
      toast.error("Please enter party name");
      return;
    }
    if (!formData.partyType) {
      toast.error("Please select party type");
      return;
    }

    setLoading(true);
    try {
      const createData = {
        name: formData.partyName,
        email: formData.email,
        contactNo: formData.phone,
        gst: formData.gstNumber,
        partyType: formData.partyType === "Customer" ? "CUSTOMER" : "VENDOR",
      };

      await partyApi.createParty(createData);

      toast.success("Party added successfully!");
      setFormData({
        partyName: "",
        email: "",
        phone: "",
        gstNumber: "",
        partyType: "",
      });

      await fetchParties();
    } catch (error) {
      console.error("Error adding party:", error);
      toast.error(error.response?.data?.message || "Failed to add party");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      partyName: "",
      email: "",
      phone: "",
      gstNumber: "",
      partyType: "",
    });
    setIsTypeOpen(false); // Close the dropdown
  };

  const handleEdit = (party) => {
    setEditDialog({
      isOpen: true,
      data: party,
    });
  };

  const handleSaveEdit = async (formData) => {
    try {
      const updateData = {
        name: formData.name,
        email: formData.email,
        contactNo: formData.phone,
        gst: formData.gstin,
        partyType: formData.type === "Customer" ? "CUSTOMER" : "VENDOR",
      };

      await partyApi.updateParty(editDialog.data.id, updateData);
      await fetchParties();

      setEditDialog({ isOpen: false, data: null });
      toast.success("Party updated successfully!");
    } catch (error) {
      console.error("Error updating party:", error);
      toast.error(error.response?.data?.message || "Failed to update party");
    }
  };

  const handleDeleteClick = (party) => {
    setDeleteDialog({
      isOpen: true,
      partyId: party.id,
      partyName: party.name,
    });
  };

  const handleConfirmDelete = async () => {
    try {
      await partyApi.deleteParty(deleteDialog.partyId);
      await fetchParties();

      setDeleteDialog({ isOpen: false, partyId: null, partyName: "" });
      toast.success("Party deleted successfully!");
    } catch (error) {
      console.error("Error deleting party:", error);
      toast.error(error.response?.data?.message || "Failed to delete party");
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialog({ isOpen: false, partyId: null, partyName: "" });
  };

  const filteredParties = parties.filter((party) => {
    const matchesSearch =
      party.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      party.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType =
      !typeFilter ||
      party.type.toLowerCase().includes(typeFilter.toLowerCase());
    return matchesSearch && matchesType;
  });

  return (
    <SidebarLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-gray-900">Add New Party</h1>
          <p className="text-md text-gray-600 mt-1">
            Add and manage customer or vendor information for smooth purchase
            and sales operations.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow p-6 mb-8"
        >
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Party Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="partyName"
                value={formData.partyName}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition"
                placeholder="Enter Party Name"
              />
            </div>

            {/* GSTIN */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GSTIN
              </label>
              <input
                type="text"
                name="gstNumber"
                value={formData.gstNumber}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition"
                placeholder="Enter GSTIN"
              />
            </div>

            {/* Contact Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition"
                placeholder="Enter Contact Number"
              />
            </div>

            {/* Email ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email ID
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition"
                placeholder="Enter Email ID"
              />
            </div>
          </div>

          {/* Type */}
          <div className="mb-8 relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type <span className="text-red-500">*</span>
            </label>

            <button
              type="button"
              onClick={() => setIsTypeOpen(!isTypeOpen)}
              className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-gray-500 transition"
            >
              <span
                className={
                  formData.partyType === ""
                    ? "text-gray-400"
                    : "text-gray-900"
                }
              >
                {formData.partyType === ""
                  ? "Select Type"
                  : formData.partyType}
              </span>

              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${
                  isTypeOpen ? "rotate-180" : ""
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

            {isTypeOpen && (
              <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                {["Customer", "Vendor"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, partyType: type }));
                      setIsTypeOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition"
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <button
              type="submit"
              disabled={loading}
              className="px-12 py-2 bg-[#343434] text-white rounded-2xl hover:bg-gray-900 transition font-medium disabled:opacity-50"
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
        </form>

        {/* Search and Filter */}
        <PartiesTable
          filteredParties={filteredParties}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          handleEdit={handleEdit}
          handleDeleteClick={handleDeleteClick}
          loading={loading}
        />

        {/* Edit Party Dialog */}
        <EditPartyDialog
          isOpen={editDialog.isOpen}
          onClose={() => setEditDialog({ isOpen: false, data: null })}
          onSave={handleSaveEdit}
          initialData={editDialog.data}
        />

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={deleteDialog.isOpen}
          title="Delete Party"
          message={`Are you sure you want to delete "${deleteDialog.partyName}"? This action cannot be undone.`}
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

export default AddParty;
