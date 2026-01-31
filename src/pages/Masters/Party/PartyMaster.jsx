import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, ChevronRight, X } from "lucide-react";
import SidebarLayout from "../../../components/SidebarLayout";
import ConfirmationDialog from "../../../components/ConfirmationDialog";
import PartiesTable from "../../../components/Party/PartiesTable";
import EditPartyDialog from "../../../components/Party/EditPartyDialog";
import PartiesData from "../../../Data/partydata";

const PartyMaster = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [parties, setParties] = useState(PartiesData);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [stats, setStats] = useState({
    customers: 0,
    vendors: 0,
    total: 0,
  });
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    partyId: null,
    partyName: "",
  });
  const [editDialog, setEditDialog] = useState({
    isOpen: false,
    data: null,
  });
  const [message, setMessage] = useState("");

  // Fetch parties data on component mount
  useEffect(() => {
    fetchParties();
  }, []);

  const fetchParties = () => {
    try {
      setLoading(true);
      // Use mock data instead of API
      setParties([...PartiesData]);
      // Calculate stats
      const customers = PartiesData.filter((p) => p.type === "Customer").length;
      const vendors = PartiesData.filter((p) => p.type === "Vendor").length;
      setStats({
        customers,
        vendors,
        total: PartiesData.length,
      });
    } catch (error) {
      console.error("Error fetching parties:", error);
      setStats({
        customers: 32,
        vendors: 24,
        total: 56,
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter parties based on search and type
  const filteredParties = parties.filter((party) => {
    const matchesSearch =
      party.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      party.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      party.gstin.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType =
      !typeFilter ||
      party.type.toLowerCase().includes(typeFilter.toLowerCase());

    return matchesSearch && matchesType;
  });

  const handleEdit = (party) => {
    setEditDialog({
      isOpen: true,
      data: party,
    });
  };

  const handleSaveEdit = (formData) => {
    const updatedParties = parties.map((party) =>
      party.id === editDialog.data.id
        ? {
            ...party,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            contact: formData.phone,
            gstin: formData.gstin,
            type: formData.type,
          }
        : party
    );
    setParties(updatedParties);
    setEditDialog({ isOpen: false, data: null });
    setMessage("Party updated successfully!");
    setTimeout(() => setMessage(""), 3000);
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
      // Remove party from mock data
      setParties(parties.filter(p => p.id !== deleteDialog.partyId));
      setMessage("Party deleted successfully!");
      setDeleteDialog({ isOpen: false, partyId: null, partyName: "" });
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error deleting party:", error);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialog({ isOpen: false, partyId: null, partyName: "" });
  };

  return (
    <SidebarLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Party Master</h1>
              <p className="text-gray-600 text-md">
                Centralised management of customers and vendors with GST, contact, and role details.
              </p>
            </div>
            <button
              onClick={() => navigate("/masters/party/add")}
              className="flex items-center gap-2 bg-white text-gray-800 border-2 border-gray-900 px-6 py-2 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              <Plus className="w-5 h-5" />
              Add Party
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border-2 border-gray-200">
            <h3 className="text-gray-500 font-medium mb-3">Total Customers</h3>
            <p className="text-4xl font-bold text-gray-900">{stats.customers}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border-2 border-gray-200">
            <h3 className="text-gray-500 font-medium mb-3">Total Vendors</h3>
            <p className="text-4xl font-bold text-gray-900">{stats.vendors}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border-2 border-gray-200">
            <h3 className="text-gray-500 font-medium mb-3">Total Parties</h3>
            <p className="text-4xl font-bold text-gray-900">{stats.total}</p>
          </div>
        </div>

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

        {/* Message Alert */}
        {message && (
          <div className="mt-6 p-4 rounded-lg bg-green-50 text-green-800 border border-green-200 flex items-center justify-between">
            <span>{message}</span>
            <button
              onClick={() => setMessage("")}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

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

export default PartyMaster;
