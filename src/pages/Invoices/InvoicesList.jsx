import React, { useEffect, useMemo, useState } from "react";
import { Plus, Download, SquarePen, Eye, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SidebarLayout from "../../components/SidebarLayout";
import SearchFilter from "../../components/SearchFilter";
import InvoiceData from "../../Data/invoicedata";
import InvoiceViewDialog from "../../components/Invoice/InvoiceViewDialog";
import InvoiceEditDialog from "../../components/Invoice/InvoiceEditDialog";
import ConfirmationDialog from "../../components/ConfirmationDialog";

const defaultFormData = {
  exporterCompanyName: "",
  exporterContactNo: "",
  exporterAddress: "",
  billToToTheOrder: "",
  billToName: "",
  billToContactNo: "",
  billToAddress: "",
  shipToToTheOrder: "",
  shipToName: "",
  shipToContactNo: "",
  shipToAddress: "",
  invoiceNo: "",
  invoiceDate: "",
  gstNo: "",
  iecCode: "",
  poNo: "",
  incoterms: "",
  paymentTerms: "",
  preCarriage: "",
  countryOfOrigin: "",
  countryOfFinalDestination: "",
  portOfLoading: "",
  portOfDischarge: "",
  freightCost: "",
  insuranceCost: "",
  otherCharges: "",
  beneficiaryName: "",
  beneficiaryBank: "",
  branch: "",
  beneficiaryAcNo: "",
  switchCode: "",
  arnNo: "",
  rodtep: "",
  rexNo: "",
};

const defaultItems = [
  {
    itemNo: "",
    itemDescription: "",
    hsCode: "",
    itemQty: "",
    unitPrice: "",
    currency: "EUR",
    currencyCurrentPrice: "",
  },
];

const defaultPackings = [
  {
    packingItemNo: "",
    packingDescription: "",
    totalQtyPcs: "",
    qtyInEachCarton: "",
    noOfCarton: "",
    grossWeight: "",
    netWeight: "",
    totalCartonWith: "",
    woodenPallet: "",
  },
];

const InvoicesList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [storedInvoices, setStoredInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFormData, setEditFormData] = useState(defaultFormData);
  const [editItems, setEditItems] = useState(defaultItems);
  const [editPackings, setEditPackings] = useState(defaultPackings);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("invoices");
      if (raw) {
        setStoredInvoices(JSON.parse(raw));
      } else {
        localStorage.setItem("invoices", JSON.stringify(InvoiceData));
        setStoredInvoices(InvoiceData);
      }
    } catch {
      setStoredInvoices([]);
    }
  }, []);

  const allInvoices = useMemo(() => {
    return storedInvoices;
  }, [storedInvoices]);

  const filteredInvoices = useMemo(() => {
    return allInvoices.filter((invoice) => {
      const matchesSearch =
        invoice.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.partyName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = !typeFilter || invoice.invoiceType === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [allInvoices, searchTerm, typeFilter]);

  const formatDateToInput = (dateValue) => {
    if (!dateValue) return "";
    const parts = dateValue.split("/");
    if (parts.length !== 3) return dateValue;
    const [day, month, year] = parts;
    return `${year}-${month}-${day}`;
  };

  const formatDateForList = (dateValue) => {
    if (!dateValue) return "";
    const [year, month, day] = dateValue.split("-");
    if (!year || !month || !day) return dateValue;
    return `${day}/${month}/${year}`;
  };

  const handleOpenView = (invoice) => {
    setSelectedInvoice(invoice);
    setIsViewOpen(true);
  };

  const handleOpenEdit = (invoice) => {
    const details = invoice.details || {};
    const formData = details.formData || {
      ...defaultFormData,
      invoiceNo: invoice.invoiceNo || "",
      invoiceDate: formatDateToInput(invoice.date),
      billToName: invoice.partyName || "",
    };
    setSelectedInvoice(invoice);
    setEditFormData(formData);
    setEditItems(details.items || defaultItems);
    setEditPackings(details.packings || defaultPackings);
    setIsEditOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditItemsChange = (newItems) => {
    setEditItems(newItems);
  };

  const handleEditPackingsChange = (newPackings) => {
    setEditPackings(newPackings);
  };

  const handleAddEditItem = () => {
    setEditItems((prev) => [...prev, { ...defaultItems[0] }]);
  };

  const handleAddEditPacking = () => {
    setEditPackings((prev) => [...prev, { ...defaultPackings[0] }]);
  };

  const handleSaveEdit = () => {
    if (!selectedInvoice) return;
    const updatedInvoices = storedInvoices.map((invoice) => {
      if (invoice.id !== selectedInvoice.id) return invoice;

      return {
        ...invoice,
        invoiceNo: editFormData.invoiceNo || invoice.invoiceNo,
        date: editFormData.invoiceDate
          ? formatDateForList(editFormData.invoiceDate)
          : invoice.date,
        partyName:
          editFormData.billToName ||
          editFormData.exporterCompanyName ||
          invoice.partyName,
        details: {
          formData: { ...editFormData },
          items: editItems.map((item) => ({ ...item })),
          packings: editPackings.map((packing) => ({ ...packing })),
        },
      };
    });

    setStoredInvoices(updatedInvoices);
    localStorage.setItem("invoices", JSON.stringify(updatedInvoices));
    setIsEditOpen(false);
  };

  const handleOpenDelete = (invoice) => {
    setDeleteTarget(invoice);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const updatedInvoices = storedInvoices.filter(
      (invoice) => invoice.id !== deleteTarget.id
    );
    setStoredInvoices(updatedInvoices);
    localStorage.setItem("invoices", JSON.stringify(updatedInvoices));
    setIsDeleteOpen(false);
    setDeleteTarget(null);
  };

  return (
    <SidebarLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-medium text-black mb-2">Invoices</h1>
              <p className="text-gray-500 text-md">
                Centralised management of invoices with type, date, and download
                options.
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
        {/* Stats */}
        <div className="mb-8">
          <div className="bg-white border border-gray-300 rounded-lg px-3 py-2 h-[110px] flex flex-col justify-between">
            <p className="text-gray-500">Total Invoices</p>
            <p className="text-2xl font-medium text-black">
              {filteredInvoices.length}
            </p>
          </div>
        </div>

        {/* Search Filter */}
        <SearchFilter
          searchQuery={searchTerm}
          setSearchQuery={setSearchTerm}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          filterOptions={["Export", "Commercial", "Packing List"]}
          filterPlaceholder="Type"
        />

        {/* Table */}
        <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200">
                <th className="px-6 py-4 text-center text-sm font-semibold text-bold">
                  Invoice No
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-bold">
                  Date
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-bold">
                  Party Name
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-bold">
                  Invoice Type
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-bold">
                  Get Invoices
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-bold">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredInvoices.map((invoice, index) => {
                const isLastOfGroup =
                  index === filteredInvoices.length - 1 ||
                  filteredInvoices[index + 1].invoiceNo !== invoice.invoiceNo;

                return (
                  <React.Fragment key={invoice.id}>
                    <tr className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4 text-center text-sm font-medium">
                        {invoice.invoiceNo}
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        {invoice.date}
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        {invoice.partyName}
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        {invoice.invoiceType}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button className="inline-flex items-center gap-2 text-gray-800 hover:text-black text-sm">
                          Download
                          <Download className="w-4 h-4" />
                        </button>
                      </td>
                      <td className="px-6 py-4 flex justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(invoice)}
                          className="text-gray-700 hover:text-black"
                        >
                          <SquarePen className="w-4 h-4 cursor-pointer" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenView(invoice)}
                          className="text-gray-700 hover:text-black"
                        >
                          <Eye className="w-4 h-4 cursor-pointer" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(invoice)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4 cursor-pointer" />
                        </button>
                      </td>
                    </tr>

                    {/* 🔹 Group Spacer (THIS IS THE MAGIC) */}
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

        <InvoiceViewDialog
          isOpen={isViewOpen}
          onClose={() => setIsViewOpen(false)}
          onEdit={() => {
            if (!selectedInvoice) return;
            setIsViewOpen(false);
            handleOpenEdit(selectedInvoice);
          }}
          invoice={selectedInvoice}
        />
        <InvoiceEditDialog
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onSave={handleSaveEdit}
          formData={editFormData}
          onChange={handleEditChange}
          items={editItems}
          onItemsChange={handleEditItemsChange}
          onAddItem={handleAddEditItem}
          packings={editPackings}
          onPackingsChange={handleEditPackingsChange}
          onAddPacking={handleAddEditPacking}
        />
        <ConfirmationDialog
          isOpen={isDeleteOpen}
          title="Delete Invoice"
          message={`Are you sure you want to delete invoice ${deleteTarget?.invoiceNo || ""}?`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setIsDeleteOpen(false);
            setDeleteTarget(null);
          }}
          isDangerous
        />
      </div>
    </SidebarLayout>
  );
};

export default InvoicesList;
