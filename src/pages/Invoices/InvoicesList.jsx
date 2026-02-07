import React, { useMemo, useState, useEffect } from "react";
import { Plus, Download, SquarePen, Eye, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SidebarLayout from "../../components/SidebarLayout";
import SearchFilter from "../../components/SearchFilter";
import ConfirmationDialog from "../../components/ConfirmationDialog";
import { invoiceApi } from "../../services/apiService";
import toast from "react-hot-toast";

const InvoicesList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedToDelete, setSelectedToDelete] = useState(null);

   const getApiInvoiceType = (uiType) => {
    switch (uiType) {
      case "Export": return "EXPORT";
      case "Commercial": return "COMMERCIAL";
      case "Packing List": return "PACKAGING_LIST";
      default: return undefined; // Send undefined to show all
    }
  };

  // Update fetchInvoices to accept filters
  const fetchInvoices = async (search = "", type = "") => {
    try {
      setLoading(true);
      
      // Convert UI filter to API Enum
      const apiType = getApiInvoiceType(type);

      // Call API with search and type filters
      const response = await invoiceApi.getAllInvoice(
        apiType,             // filterByType
        search || undefined, // search text
        0,                   // page
        100                  // size
      );
      
      const invoiceData = response.data?.data || [];

      const mapped = invoiceData.map((inv) => ({
        id: inv.id || inv.invoiceId || inv._id,
        invoiceNo: inv.invoiceNo || "N/A",
        date: inv.invoiceDate || inv.createdAt || "N/A",
        partyName: inv.exporterCompanyName || inv.billToName || "N/A",
        invoiceType: inv.invoiceType || "EXPORT",
      }));

      setInvoices(mapped);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load invoices');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Debounce: Wait 500ms after user stops typing to call API
    const timer = setTimeout(() => {
      fetchInvoices(searchTerm, typeFilter);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, typeFilter]);

  


 

  const openDeleteConfirm = (id, invoiceNo) => {
    setSelectedToDelete({ id, invoiceNo });
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      const id = selectedToDelete?.id;
     console.log(id);
     
      await invoiceApi.deleteInvoice(id);
      toast.success('Invoice deleted');
      setConfirmOpen(false);
      setSelectedToDelete(null);
      await fetchInvoices();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete invoice');
    }
  };

  const handleEditInvoice = async (id) => {
    try {
      
      const resp = await invoiceApi.getInvoiceById(id);
      const invoice = resp.data;
      navigate('/invoices/create', { state: { invoice, mode: 'edit' } });
    } catch (err) {
      console.error(err);
      toast.error('Failed to open editor');
    }
  };

  const handleViewInvoice = async (id) => {
    try {
      
      const resp = await invoiceApi.getInvoiceById(id);
      const invoice = resp.data;
      
      navigate('/invoices/create', { state: { invoice, mode: 'view' } });
      console.log(invoice);
    } catch (err) {
      console.error(err);
      toast.error('Failed to open viewer');
    }
  };

  const handleDownload = async (id, invoiceType, invoiceNo) => {
    try {
      
      const resp = await invoiceApi.getInvoicePdf(id, invoiceType, { responseType: 'blob' });
      const blob = resp.data;
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoiceNo || id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error(err);
      toast.error('Failed to download PDF');
    }
  };


  return (
    <SidebarLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-medium text-black mb-2">Invoices</h1>
              <p className="text-gray-500 text-md">
                Centralised management of invoices with type, date, and download options.
              </p>
            </div>

            <button
              onClick={() => navigate("/invoices/create")}
              className="flex items-center gap-2 bg-white border border-gray-900 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              <Plus className="w-5 h-5" />
              Create Invoice
            </button>
          </div>
        </div>
        
        <div className="mb-8">
          <div className="bg-white border border-gray-300 rounded-lg px-3 py-2 h-[110px] flex flex-col justify-between">
            <p className="text-gray-500">Total Invoices</p>
            <p className="text-3xl font-medium text-black">
              {invoices.length}
            </p>
          </div>
        </div>

        <SearchFilter
          searchQuery={searchTerm}
          setSearchQuery={setSearchTerm}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          filterOptions={["Export", "Commercial", "Packing List"]}
          filterPlaceholder="Type"
        />

        <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200">
                <th className="px-6 py-4 text-center text-sm font-semibold">Invoice No</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Date</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Party Name</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Invoice Type</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Get Invoices</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Action</th>
              </tr>
            </thead>

            <tbody>
              {invoices.map((invoice, index) => {
                const isLastOfGroup =
                  index === invoices.length - 1 ||
                  invoices[index + 1].invoiceNo !== invoice.invoiceNo;

                return (
                  <React.Fragment key={invoice.id}>
                    <tr className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4 text-center text-sm font-medium">
                        {invoice.invoiceNo}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">
                        {invoice.date}
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        {invoice.partyName}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">
                        {invoice.invoiceType}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleDownload(invoice.id, invoice.invoiceType, invoice.invoiceNo)}
                          className="inline-flex items-center gap-2 text-gray-800 hover:text-black"
                        >
                          Download
                          <Download className="w-4 h-4" />
                        </button>
                      </td>
                      <td className="px-6 py-4 flex justify-center gap-3">
                        <SquarePen
                          className="w-4 h-4 cursor-pointer"
                          onClick={() => handleEditInvoice(invoice.id)}
                          title="Edit"
                        />
                        <Eye
                          className="w-4 h-4 cursor-pointer"
                          onClick={() => handleViewInvoice(invoice.id)}
                          title="View"
                        />
                        <Trash2
                          className="w-4 h-4 cursor-pointer text-red-600"
                          onClick={() => openDeleteConfirm(invoice.id, invoice.invoiceNo)}
                          title="Delete"
                        />
                      </td>
                    </tr>

                    {isLastOfGroup && (
                      <tr>
                        <td colSpan={6} className="h-4 bg-gray-50"></td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={confirmOpen}
        onCancel={() => setConfirmOpen(false)} // Changed from onClose to onCancel
        onConfirm={handleConfirmDelete}
        title="Delete Invoice"
        message={`Are you sure you want to permanently delete invoice ${selectedToDelete?.invoiceNo}? This action cannot be undone.`}
        isDangerous={true} // Makes it red
        confirmText="Delete"
        cancelText="Cancel"
      />
    </SidebarLayout>
  );
};

export default InvoicesList;