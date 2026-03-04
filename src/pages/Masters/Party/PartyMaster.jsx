import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, ChevronRight, X } from "lucide-react";
import SidebarLayout from "../../../components/SidebarLayout";
import ConfirmationDialog from "../../../components/ConfirmationDialog";
import StatsCard from "../../../components/StatsCard";
import PageHeader from "../../../components/PageHeader";
import PrimaryActionButton from "../../../components/PrimaryActionButton";
import PartiesTable from "../../../components/Party/PartiesTable";
import EditPartyDialog from "../../../components/Party/EditPartyDialog";
import { partyApi } from "../../../services/apiService";
import toast from 'react-hot-toast';

const mapPartyTypeToLabel = (partyType) => {
  switch (partyType) {
    case "CUSTOMER":
      return "Customer";
    case "VENDOR":
      return "Vendor";
    case "BOTH":
      return "Both";
    default:
      return partyType || "";
  }
};

const mapPartyTypeToApi = (value) => {
  if (!value) return "";
  if (["CUSTOMER", "VENDOR", "BOTH"].includes(value)) return value;

  const normalized = value.toLowerCase();
  if (normalized === "customer") return "CUSTOMER";
  if (normalized === "vendor") return "VENDOR";
  if (normalized === "both") return "BOTH";
  return "";
};

const PartyMaster = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [parties, setParties] = useState([]);
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

  const fetchParties = async () => {
    try {
      setLoading(true);
      const response = await partyApi.getAllParties();
      const partiesData = response.data;
      
      // Transform API data to match component expectations
      const transformedParties = partiesData.map(party => ({
        id: party.id,
        name: party.name,
        email: party.email,
        phone: party.contactNo,
        contact: party.contactNo,
        gstin: party.gst,
        type: mapPartyTypeToLabel(party.partyType),
        partyType: party.partyType,
      }));
      
      setParties(transformedParties);
      
      // Calculate stats
      const customers = transformedParties.filter(
        (p) => p.partyType === "CUSTOMER" || p.partyType === "BOTH"
      ).length;
      const vendors = transformedParties.filter(
        (p) => p.partyType === "VENDOR" || p.partyType === "BOTH"
      ).length;
      setStats({
        customers,
        vendors,
        total: transformedParties.length,
      });
    } catch (error) {
      console.error("Error fetching parties:", error);
      toast.error(error.response?.data?.message || 'Failed to fetch parties');
      setStats({
        customers: 0,
        vendors: 0,
        total: 0,
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

  const handleSaveEdit = async (formData) => {
    try {
      const updateData = {
        name: formData.name,
        email: formData.email,
        contactNo: formData.phone,
        gst: formData.gstin,
        partyType: mapPartyTypeToApi(formData.partyType || formData.type),
      };
      
      await partyApi.updateParty(editDialog.data.id, updateData);
      
      // Refresh the list
      await fetchParties();
      
      setEditDialog({ isOpen: false, data: null });
      toast.success("Party updated successfully!");
    } catch (error) {
      console.error("Error updating party:", error);
      toast.error(error.response?.data?.message || 'Failed to update party');
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
      
      // Refresh the list
      await fetchParties();
      
      setDeleteDialog({ isOpen: false, partyId: null, partyName: "" });
      toast.success("Party deleted successfully!");
    } catch (error) {
      console.error("Error deleting party:", error);
      toast.error(error.response?.data?.message || 'Failed to delete party');
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialog({ isOpen: false, partyId: null, partyName: "" });
  };

  return (
    <SidebarLayout>
      <div className="mx-auto">
        <div className="mb-8">
          <PageHeader
            title="Party Master"
            description="Centralised management of customers and vendors with GST, contact, and role details."
            action={
              <PrimaryActionButton
                onClick={() => navigate("/masters/party/add")}
                icon={Plus}
              >
                Add Party
              </PrimaryActionButton>
            }
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <StatsCard label="Total Customers" value={stats.customers} />
          <StatsCard label="Total Vendors" value={stats.vendors} />
          <StatsCard label="Total Parties" value={stats.total} />
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
