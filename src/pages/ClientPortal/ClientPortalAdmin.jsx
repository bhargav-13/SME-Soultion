import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, FileDown, KeyRound, X, ShoppingBag } from "lucide-react";
import SidebarLayout from "../../components/SidebarLayout";
import PageHeader from "../../components/PageHeader";
import PrimaryActionButton from "../../components/PrimaryActionButton";
import ConfirmationDialog from "../../components/ConfirmationDialog";
import StatsCard from "../../components/StatsCard";
import { clientPortalAdminApi } from "../../services/apiService";
import toast from "react-hot-toast";

const PAGE_SIZE = 10;

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

const ClientPortalAdmin = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [resetDialog, setResetDialog] = useState({
    isOpen: false,
    partyId: null,
    partyName: "",
  });
  const [credentialsModal, setCredentialsModal] = useState({
    isOpen: false,
    username: "",
    password: "",
  });
  const [pendingCountsByParty, setPendingCountsByParty] = useState({});

  const fetchAccounts = async (pageNum = 0, search = "") => {
    try {
      setLoading(true);
      const response = await clientPortalAdminApi.getAllClientAccounts(
        pageNum,
        PAGE_SIZE,
        search || undefined,
      );
      const result = response.data;
      setAccounts(result?.data || []);
      setTotalPages(result?.totalPages || 0);
      setTotalElements(result?.totalElements || 0);
    } catch (error) {
      console.error("Error fetching client accounts:", error);
      toast.error(error.response?.data?.message || "Failed to fetch client accounts");
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAccounts(page, searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [page, searchQuery]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery]);

  const fetchPendingRequestCounts = async () => {
    try {
      const response = await clientPortalAdminApi.getAllOrderRequests(
        0,
        200,
        undefined,
        undefined,
        undefined,
        "PENDING_APPROVAL",
      );
      const counts = {};
      (response.data?.data || []).forEach((req) => {
        if (req.partyId != null) {
          counts[req.partyId] = (counts[req.partyId] || 0) + 1;
        }
      });
      setPendingCountsByParty(counts);
    } catch (error) {
      console.error("Error fetching pending order request counts:", error);
    }
  };

  useEffect(() => {
    fetchPendingRequestCounts();
  }, [page, searchQuery]);

  const handleExport = async (onlyPending = false) => {
    try {
      const response = await clientPortalAdminApi.exportClientCredentials(onlyPending, {
        responseType: "blob",
      });
      const blob = response.data;
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        onlyPending ? "client-credentials-pending.xlsx" : "client-credentials.xlsx",
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting credentials:", error);
      toast.error(error.response?.data?.message || "Failed to export credentials");
    }
  };

  const handleDownloadCsv = (account) => {
    const csvContent = `username,password\n${account.username},${account.initialPassword || ""}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${account.username}-credentials.csv`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleResetClick = (account) => {
    setResetDialog({
      isOpen: true,
      partyId: account.partyId,
      partyName: account.partyName,
    });
  };

  const handleConfirmReset = async () => {
    try {
      const response = await clientPortalAdminApi.resetClientCredentials(
        resetDialog.partyId,
      );
      const credentials = response.data;
      setResetDialog({ isOpen: false, partyId: null, partyName: "" });
      setCredentialsModal({
        isOpen: true,
        username: credentials?.username || "",
        password: credentials?.password || "",
      });
      await fetchAccounts(page, searchQuery);
      toast.success("Credentials reset successfully!");
    } catch (error) {
      console.error("Error resetting credentials:", error);
      toast.error(error.response?.data?.message || "Failed to reset credentials");
    }
  };

  const pendingCount = accounts.filter((a) => a.credentialsPending).length;

  return (
    <SidebarLayout>
      <div className="mx-auto">
        <div className="mb-8">
          <PageHeader
            title="Client Portal"
            description="Manage party login credentials for the client portal."
            action={
              <div className="flex items-center gap-3">
                <PrimaryActionButton onClick={() => handleExport(true)} icon={Download}>
                  Export Pending
                </PrimaryActionButton>
                <PrimaryActionButton onClick={() => handleExport(false)} icon={Download}>
                  Export All Credentials
                </PrimaryActionButton>
              </div>
            }
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <StatsCard label="Total Client Accounts" value={totalElements} />
          <StatsCard label="Pending Credentials (this page)" value={pendingCount} />
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by party name..."
            className="w-full max-w-sm px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200">
                <th className="px-6 py-4 text-center text-sm font-[550] text-black">
                  Party Name
                </th>
                <th className="px-6 py-4 text-center text-sm font-[550] text-black">
                  Type
                </th>
                <th className="px-6 py-4 text-center text-sm font-[550] text-black">
                  Username
                </th>
                <th className="px-6 py-4 text-center text-sm font-[550] text-black">
                  Email
                </th>
                <th className="px-6 py-4 text-center text-sm font-[550] text-black">
                  Contact
                </th>
                <th className="px-6 py-4 text-center text-sm font-[550] text-black">
                  Status
                </th>
                <th className="px-6 py-4 text-center text-sm font-[550] text-black">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr
                  key={account.partyId}
                  onClick={() =>
                    navigate(
                      `/client-portal/orders?username=${encodeURIComponent(account.username)}&partyName=${encodeURIComponent(account.partyName || "")}`,
                    )
                  }
                  className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                  title="View order requests for this client"
                >
                  <td className="px-6 py-4 text-sm text-gray-900 text-center">
                    <span className="inline-flex items-center gap-2 font-medium">
                      <ShoppingBag className="w-4 h-4 text-gray-400" />
                      {account.partyName}
                      {pendingCountsByParty[account.partyId] > 0 && (
                        <span
                          className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-semibold"
                          title="Pending order requests"
                        >
                          {pendingCountsByParty[account.partyId]}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 text-center uppercase">
                    {mapPartyTypeToLabel(account.partyType)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 text-center">
                    {account.username}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 text-center">
                    {account.email || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 text-center">
                    {account.contactNo || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-center">
                    {account.credentialsPending ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    )}
                  </td>
                  <td
                    className="px-6 py-4 text-sm flex items-center justify-center gap-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {account.credentialsPending && (
                      <button
                        onClick={() => handleDownloadCsv(account)}
                        className="text-black hover:text-black transition inline-flex items-center gap-1"
                        title="Download Credentials (CSV)"
                      >
                        <FileDown className="w-4 h-4" />
                        CSV
                      </button>
                    )}
                    <button
                      onClick={() => handleResetClick(account)}
                      className="text-black hover:text-black transition inline-flex items-center gap-1"
                      title="Reset Credentials"
                    >
                      <KeyRound className="w-4 h-4" />
                      Reset
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && accounts.length === 0 && (
            <div className="p-6 text-center text-gray-500">No client accounts found</div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Reset Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={resetDialog.isOpen}
          title="Reset Credentials"
          message={`This will generate a new password for "${resetDialog.partyName}". The old password will stop working immediately. Continue?`}
          confirmText="Reset"
          cancelText="Cancel"
          onConfirm={handleConfirmReset}
          onCancel={() => setResetDialog({ isOpen: false, partyId: null, partyName: "" })}
          isDangerous={true}
        />

        {/* New Credentials Modal */}
        {credentialsModal.isOpen && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">New Credentials</h2>
                <button
                  onClick={() => setCredentialsModal({ isOpen: false, username: "", password: "" })}
                  className="text-gray-500 hover:text-gray-700 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="px-6 py-4 space-y-3">
                <p className="text-gray-700 text-sm">
                  Share these credentials with the party. The password will not be shown again.
                </p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1">
                  <p className="text-sm">
                    <span className="font-medium">Username:</span> {credentialsModal.username}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Password:</span> {credentialsModal.password}
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setCredentialsModal({ isOpen: false, username: "", password: "" })}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition font-medium text-sm"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
};

export default ClientPortalAdmin;
