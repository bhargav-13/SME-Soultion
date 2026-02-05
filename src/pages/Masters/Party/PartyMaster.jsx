import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, ChevronRight, X } from "lucide-react";
import SidebarLayout from "../../../components/SidebarLayout";
import ConfirmationDialog from "../../../components/ConfirmationDialog";
import PartiesTable from "../../../components/Party/PartiesTable";
import EditPartyDialog from "../../../components/Party/EditPartyDialog";
import { partyApi } from "../../../services/apiService";
import toast from 'react-hot-toast';

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
        type: party.partyType === 'CUSTOMER' ? 'Customer' : 'Vendor',
      }));
      
      setParties(transformedParties);
      
      // Calculate stats
      const customers = transformedParties.filter((p) => p.type === "Customer").length;
      const vendors = transformedParties.filter((p) => p.type === "Vendor").length;
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
        partyType: formData.type === 'Customer' ? 'CUSTOMER' : 'VENDOR',
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
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 mb-2">
                Party Master
              </h1>
              <p className="text-gray-600 text-md">
                Centralised management of customers and vendors with GST,
                contact, and role details.
              </p>
            </div>
            <button
              onClick={() => navigate("/masters/party/add")}
              className="flex items-center gap-2 bg-white text-gray-800 border border-gray-900 px-6 py-2 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              <Plus className="w-5 h-5" />
              Add Party
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {/* Card 1 */}
          <div className="bg-white px-3 py-2 rounded-lg border border-gray-300 h-[110px] flex flex-col justify-between">
            <p className=" text-gray-500">Total Customers</p>
            <p className="text-2xl font-semibold text-gray-900">
              {stats.customers}
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white px-3 py-2 rounded-lg border border-gray-300 h-[110px] flex flex-col justify-between">
            <p className=" text-gray-500">Total Vendors</p>
            <p className="text-2xl font-semibold text-gray-900">
              {stats.vendors}
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white px-3 py-2 rounded-lg border border-gray-300 h-[110px] flex flex-col justify-between">
            <p className=" text-gray-500">Total Parties</p>
            <p className="text-2xl font-semibold text-gray-900">
              {stats.total}
            </p>
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
