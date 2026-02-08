import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X } from "lucide-react";
import SidebarLayout from "../../components/SidebarLayout";

// Reusable UI Components
import FormSection from "../../components/InvoiceForm/FormSection";

// Section Components
import ExporterSection from "../../components/InvoiceForm/sections/ExporterSection";
import ImporterSection from "../../components/InvoiceForm/sections/ImporterSection";
import InvoiceDetailsSection from "../../components/InvoiceForm/sections/InvoiceDetailsSection";
import ItemsDetailsSection from "../../components/InvoiceForm/sections/ItemsDetailsSection";
import PackingDetailsSection from "../../components/InvoiceForm/sections/PackingDetailsSection";
import AdditionalChargesSection from "../../components/InvoiceForm/sections/AdditionalChargesSection";
import BankDetailsSection from "../../components/InvoiceForm/sections/BankDetailsSection";
import TextAreaSection from "../../components/InvoiceForm/sections/TextAreaSection";

const CreateInvoice = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    // Exporter
    exporterCompanyName: "",
    exporterContactNo: "",
    exporterAddress: "",

    // Bill To (Importer)
    billToToTheOrder: "",
    billToName: "",
    billToContactNo: "",
    billToAddress: "",

    // Ship To (Importer)
    shipToToTheOrder: "",
    shipToName: "",
    shipToContactNo: "",
    shipToAddress: "",

    // Invoice Details
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

    // Additional Charges
    freightCost: "",
    insuranceCost: "",
    otherCharges: "",

    // Bank Details
    beneficiaryName: "",
    beneficiaryBank: "",
    branch: "",
    beneficiaryAcNo: "",
    switchCode: "",

    // Text Sections
    arnNo: "",
    rodtep: "",
    rexNo: "",
  });

  const [items, setItems] = useState([
    {
      itemNo: "",
      itemDescription: "",
      hsCode: "",
      itemQty: "",
      unitPrice: "",
      currency: "EUR",
      currencyCurrentPrice: "",
    },
  ]);

  const [packings, setPackings] = useState([
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
  ]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleItemsChange = (newItems) => {
    setItems(newItems);
  };

  const handleAddItem = () => {
    const newItem = {
      itemNo: "",
      itemDescription: "",
      hsCode: "",
      itemQty: "",
      unitPrice: "",
      currency: "EUR",
      currencyCurrentPrice: "",
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handlePackingsChange = (newPackings) => {
    setPackings(newPackings);
  };

  const handleAddPacking = () => {
    const newPacking = {
      packingItemNo: "",
      packingDescription: "",
      totalQtyPcs: "",
      qtyInEachCarton: "",
      noOfCarton: "",
      grossWeight: "",
      netWeight: "",
      totalCartonWith: "",
      woodenPallet: "",
    };
    setPackings((prev) => [...prev, newPacking]);
  };

  const handleSubmit = () => {
    const formattedDate = formatDateForList(formData.invoiceDate);
    const partyName =
      formData.billToName || formData.exporterCompanyName || "Unknown Party";
    const invoiceNo = formData.invoiceNo || "NA";

    const invoiceTypes = ["Export", "Commercial", "Packing List"];
    const newInvoices = invoiceTypes.map((invoiceType, index) => ({
      id: `local-${Date.now()}-${index}`,
      invoiceNo,
      date: formattedDate,
      partyName,
      invoiceType,
      details: {
        formData: { ...formData },
        items: items.map((item) => ({ ...item })),
        packings: packings.map((packing) => ({ ...packing })),
      },
    }));

    const existingInvoices = getStoredInvoices();
    localStorage.setItem(
      "invoices",
      JSON.stringify([...existingInvoices, ...newInvoices])
    );

    downloadInvoicePdf({
      formData,
      items,
      packings,
      partyName,
      invoiceNo,
      formattedDate,
    });

    navigate("/invoices");
  };

  const getStoredInvoices = () => {
    try {
      const raw = localStorage.getItem("invoices");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const formatDateForList = (dateValue) => {
    if (!dateValue) return "";
    const [year, month, day] = dateValue.split("-");
    if (!year || !month || !day) return dateValue;
    return `${day}/${month}/${year}`;
  };

  const downloadInvoicePdf = ({
    formData: invoiceForm,
    items: invoiceItems,
    packings: invoicePackings,
    partyName,
    invoiceNo,
    formattedDate,
  }) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const itemsRows = invoiceItems
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${item.itemDescription || "-"}</td>
            <td>${item.hsCode || "-"}</td>
            <td>${item.itemQty || "-"}</td>
            <td>${item.unitPrice || "-"}</td>
          </tr>
        `
      )
      .join("");

    const packingsRows = invoicePackings
      .map(
        (packing, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${packing.packingDescription || "-"}</td>
            <td>${packing.totalQtyPcs || "-"}</td>
            <td>${packing.noOfCarton || "-"}</td>
            <td>${packing.grossWeight || "-"}</td>
          </tr>
        `
      )
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Invoice ${invoiceNo}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111; padding: 32px; }
            h1 { margin: 0 0 8px; font-size: 24px; }
            p { margin: 4px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
            th { background: #f3f4f6; text-align: left; }
            .section { margin-top: 24px; }
          </style>
        </head>
        <body>
          <h1>Invoice ${invoiceNo}</h1>
          <p><strong>Date:</strong> ${formattedDate || "-"}</p>
          <p><strong>Party:</strong> ${partyName}</p>
          <p><strong>Exporter:</strong> ${
            invoiceForm.exporterCompanyName || "-"
          }</p>
          <p><strong>Bill To:</strong> ${invoiceForm.billToName || "-"}</p>
          <p><strong>Ship To:</strong> ${invoiceForm.shipToName || "-"}</p>

          <div class="section">
            <h2>Items</h2>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Description</th>
                  <th>HS Code</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                </tr>
              </thead>
              <tbody>${itemsRows || "<tr><td colspan='5'>No items</td></tr>"}</tbody>
            </table>
          </div>

          <div class="section">
            <h2>Packing</h2>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Description</th>
                  <th>Total Qty</th>
                  <th>Cartons</th>
                  <th>Gross Wt</th>
                </tr>
              </thead>
              <tbody>${packingsRows || "<tr><td colspan='5'>No packing details</td></tr>"}</tbody>
            </table>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => navigate("/invoices")}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400 hover:bg-gray-50 transition"
            aria-label="Close and go back to invoices"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Exporter Section */}
        <FormSection title="Exporter" isClose={true} >
          <ExporterSection formData={formData} onChange={handleChange} />
        </FormSection>

        {/* Bill To Section */}
        <FormSection title="Importer (Bill To)">
          <ImporterSection
            title="Bill To"
            prefix="billTo"
            formData={formData}
            onChange={handleChange}
          />
        </FormSection>

        {/* Ship To Section */}
        <FormSection title="Importer (Ship To)">
          <ImporterSection
            title="Ship To"
            prefix="shipTo"
            formData={formData}
            onChange={handleChange}
          />
        </FormSection>

        {/* Invoice Details Section */}
        <FormSection title="Invoice Details">
          <InvoiceDetailsSection
            formData={formData}
            onChange={handleChange}
          />
        </FormSection>

        {/* Items Details Section */}
        <FormSection
          title="Items Details"
          action={
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-2 bg-gray-900 text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition cursor-pointer"
            >
              Add Item
              <Plus className="w-3 h-3" />
            </button>
          }
        >
          <ItemsDetailsSection
            items={items}
            onItemsChange={handleItemsChange}
          />
        </FormSection>

        {/* Packing Details Section */}
        <FormSection
          title="Packing Details"
          action={
            <button
              type="button"
              onClick={handleAddPacking}
              className="inline-flex items-center gap-2 bg-gray-900 text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition cursor-pointer"
            >
              Add Item
              <Plus className="w-3 h-3" />
            </button>
          }
        >
          <PackingDetailsSection
            packings={packings}
            onPackingsChange={handlePackingsChange}
          />
        </FormSection>

        {/* Additional Charges Section */}
        <FormSection title="Extra Changes">
          <AdditionalChargesSection
            formData={formData}
            onChange={handleChange}
          />
        </FormSection>

        {/* Bank Details Section */}
        <FormSection title="Bank Details">
          <BankDetailsSection formData={formData} onChange={handleChange} />
        </FormSection>

        {/* ARN No Section */}
        <FormSection title="ARN No">
          <TextAreaSection
            title="Enter ARN No."
            name="arnNo"
            value={formData.arnNo}
            onChange={handleChange}
            placeholder="SUPPLY MEANT FOR EXPORT UNDER BOND OR LUT WITHOUT PAYMENT OF INTEGRATED TAX (IGST), LUT ARN..."
          />
        </FormSection>

        {/* RoDTEP Section */}
        <FormSection title="RoDTEP">
          <TextAreaSection
            title="Enter RoDTEP"
            name="rodtep"
            value={formData.rodtep}
            onChange={handleChange}
            placeholder="WE INTEND TO CLAIM REWARDS UNDER THE 'REMISSION OF DUTIES AND TAXES ON EXPORTED PRODUCT (RoDTEP)' SCHEME."
          />
        </FormSection>

        {/* REX No Section */}
        <FormSection title="REX No.">
          <TextAreaSection
            title="Enter REX No."
            name="rexNo"
            value={formData.rexNo}
            onChange={handleChange}
            placeholder="Ishita Industries having REX reg n [NREXEJP]xxxxx of the products covered by this document declares that, except..."
          />
        </FormSection>

{/* Submit Button */}
        <div className="flex justify-center gap-4 pt-4">
           <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition cursor-pointer"
          >
           Save & Download
          </button>
          <button
            onClick={() => navigate("/invoices")}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition cursor-pointer"
          >
            Cancel
          </button>
         
        </div>
        </div>
    </SidebarLayout>
  );
};

export default CreateInvoice;
