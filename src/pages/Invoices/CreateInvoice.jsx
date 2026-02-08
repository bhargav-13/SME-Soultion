import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, X } from "lucide-react";
import SidebarLayout from "../../components/SidebarLayout";
import toast from "react-hot-toast";

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
import { invoiceApi } from "../../services/apiService";

const CreateInvoice = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState('create'); 
  const [invoiceId, setInvoiceId] = useState(null);

  const [formData, setFormData] = useState({
    // Exporter
    exporterCompanyName: "",
    exporterContactNo: "",
    exporterAddress: "",

    // Bill To (Importer)
    billToCountry: "",
    billToToTheOrder: "",
    billToName: "",
    billToContactNo: "",
    billToAddress: "",

    // Ship To (Importer)
    shipToCountry: "",
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

  const [items, setItems] = useState([{
    itemNo: "", itemDescription: "", hsCode: "", itemQty: "",
    unitPrice: "", currency: "EUR", currencyCurrentPrice: "",
  }]);

  const [packings, setPackings] = useState([{
    packingItemNo: "", packingDescription: "", totalQtyPcs: "",
    qtyInEachCarton: "", noOfCarton: "", grossWeight: "",
    netWeight: "", totalCartonWith: "", woodenPallet: "",
  }]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemsChange = (newItems) => setItems(newItems);
  
  const handleAddItem = () => {
    setItems((prev) => [...prev, {
      itemNo: "", itemDescription: "", hsCode: "", itemQty: "",
      unitPrice: "", currency: "EUR", currencyCurrentPrice: "",
    }]);
  };

  const handlePackingsChange = (newPackings) => setPackings(newPackings);

  const handleAddPacking = () => {
    setPackings((prev) => [...prev, {
      packingItemNo: "", packingDescription: "", totalQtyPcs: "",
      qtyInEachCarton: "", noOfCarton: "", grossWeight: "",
      netWeight: "", totalCartonWith: "", woodenPallet: "",
    }]);
  };

  // ✅ FIXED USE EFFECT: Correctly maps ALL fields including Country and To The Order
  useEffect(() => {
    const invoice = location?.state?.invoice;
    const modeFromState = location?.state?.mode || 'create';
    
    setMode(modeFromState);
    const incomingId = invoice?.id ?? invoice?.invoiceId ?? invoice?._id ?? null;
    if (incomingId != null) setInvoiceId(Number(incomingId));

    if (!invoice) return;

    console.log("VIEW MODE DATA:", invoice); // 🔍 Check Console to see if 'billToCountry' exists here

    setFormData((prev) => ({
      ...prev,
      // Exporter
      exporterCompanyName: invoice.exporterCompanyName || "",
      exporterContactNo: invoice.exporterContactNo || "",
      exporterAddress: invoice.exporterAddress || "",

      // Bill To - ✅ Added Missing Fields
      billToCountry: invoice.billToCountry || "", 
      billToToTheOrder: invoice.billToToTheOrder || "", 
      billToName: invoice.billToName || "",
      billToContactNo: invoice.billToContactNo || "",
      billToAddress: invoice.billToAddress || "",

      // Ship To - ✅ Added Missing Fields
      shipToCountry: invoice.shipToCountry || "",
      shipToToTheOrder: invoice.shipToToTheOrder || "",
      shipToName: invoice.shipToName || "",
      shipToContactNo: invoice.shipToContactNo || "",
      shipToAddress: invoice.shipToAddress || "",

      // General Details
      invoiceNo: invoice.invoiceNo || "",
      invoiceDate: invoice.invoiceDate || invoice.createdAt || "",
      gstNo: invoice.gstNo || "",
      iecCode: invoice.iecCode || "",
      poNo: invoice.poNo || "",
      incoterms: invoice.incoterms || "",
      paymentTerms: invoice.paymentTerms || "",
      preCarriage: invoice.preCarriage || "",
      countryOfOrigin: invoice.countryOfOrigin || "",
      countryOfFinalDestination: invoice.countryOfFinalDestination || "",
      portOfLoading: invoice.portOfLoading || "",
      portOfDischarge: invoice.portOfDischarge || "",

      // Charges & Bank
      freightCost: invoice.freightCost || "",
      insuranceCost: invoice.insuranceCost || "",
      otherCharges: invoice.otherCost || "",
      beneficiaryName: invoice.beneficiaryName || "",
      beneficiaryBank: invoice.bankName || "",
      branch: invoice.branch || "",
      beneficiaryAcNo: invoice.accountNo || "",
      switchCode: invoice.swiftCode || "",

      // Text Fields
      arnNo: invoice.arnNo || "",
      rodtep: invoice.rodtep || "",
      rexNo: invoice.rexNo || "",
    }));

    // Map items
    if (Array.isArray(invoice.items) && invoice.items.length > 0) {
      const mappedItems = invoice.items.map((it) => ({
        itemNo: it.itemNo || "",
        itemDescription: it.description || "",
        hsCode: it.hsCode || "",
        itemQty: it.quantity != null ? String(it.quantity) : "",
        unitPrice: it.unitPriceUsd != null ? String(it.unitPriceUsd) : "",
        currency: it.currency || "USD",
        currencyCurrentPrice: it.currencyCurrentPrice != null ? String(it.currencyCurrentPrice) : "",
      }));
      setItems(mappedItems);
    }

    // Map packing details
    if (Array.isArray(invoice.packingDetails) && invoice.packingDetails.length > 0) {
      const mappedPackings = invoice.packingDetails.map((p) => ({
        packingItemNo: p.itemNo || "",
        packingDescription: p.description || "",
        totalQtyPcs: p.totalQty != null ? String(p.totalQty) : "",
        qtyInEachCarton: p.qtyPerCarton != null ? String(p.qtyPerCarton) : "",
        noOfCarton: p.noOfCartons != null ? String(p.noOfCartons) : "",
        grossWeight: p.grossWeightKg != null ? String(p.grossWeightKg) : "",
        netWeight: p.netWeightKg != null ? String(p.netWeightKg) : "",
        totalCartonWith: "",
        woodenPallet: p.woodenPallets != null ? String(p.woodenPallets) : "",
      }));
      setPackings(mappedPackings);
    }
  }, [location]);

  // Helper to download a specific PDF type
  // 1. Helper function to handle the download
  const downloadPdf = async (id, type, fileName) => {
    try {
      const response = await invoiceApi.getInvoicePdf(id, type, { responseType: 'blob' });
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      
      // Append to body, click, and clean up
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return true; // Success
    } catch (error) {
      console.error(`Failed to download ${type}:`, error);
      return false; // Failed
    }
  };

  // 2. Main Submit Function
  const handleSubmit = async () => {
    try {
      // --- Validation ---
      if (!formData.invoiceNo) return toast.error("Invoice Number is required");
      if (!formData.exporterCompanyName) return toast.error("Exporter Company Name is required");
      if (items.length === 0 || !items[0].itemDescription) return toast.error("At least one item is required");

      // --- Prepare Data (Your existing mapping logic) ---
      const formattedItems = items.map(item => ({
        itemNo: item.itemNo || "",
        description: item.itemDescription || "",
        hsCode: item.hsCode || "",
        quantity: item.itemQty ? parseInt(item.itemQty) : 0,
        unitPriceUsd: item.unitPrice ? parseFloat(item.unitPrice) : 0,
        currencyCurrentPrice: item.currencyCurrentPrice ? parseFloat(item.currencyCurrentPrice) : 0
      }));

      const formattedPackings = packings.map(packing => ({
        itemNo: packing.packingItemNo || "",
        description: packing.packingDescription || "",
        totalQty: packing.totalQtyPcs ? parseInt(packing.totalQtyPcs) : 0,
        qtyPerCarton: packing.qtyInEachCarton ? parseInt(packing.qtyInEachCarton) : 0,
        noOfCartons: packing.noOfCarton ? parseInt(packing.noOfCarton) : 0,
        grossWeightKg: packing.grossWeight ? parseFloat(packing.grossWeight) : 0,
        netWeightKg: packing.netWeight ? parseFloat(packing.netWeight) : 0,
        woodenPallets: packing.woodenPallet ? parseInt(packing.woodenPallet) : 0
      }));

      const invoicePayload = {
        exporterCompanyName: formData.exporterCompanyName,
        exporterContactNo: formData.exporterContactNo,
        exporterAddress: formData.exporterAddress,
        billToCountry: formData.billToCountry,
        billToToTheOrder: formData.billToToTheOrder,
        billToName: formData.billToName,
        billToContactNo: formData.billToContactNo,
        billToAddress: formData.billToAddress,
        shipToCountry: formData.shipToCountry,
        shipToToTheOrder: formData.shipToToTheOrder,
        shipToName: formData.shipToName,
        shipToContactNo: formData.shipToContactNo,
        shipToAddress: formData.shipToAddress,
        currency: "USD",
        invoiceNo: formData.invoiceNo,
        invoiceDate: formData.invoiceDate || new Date().toISOString().split('T')[0],
        gstNo: formData.gstNo,
        iecCode: formData.iecCode,
        poNo: formData.poNo,
        incoterms: formData.incoterms,
        paymentTerms: formData.paymentTerms,
        preCarriage: formData.preCarriage,
        countryOfOrigin: formData.countryOfOrigin,
        countryOfFinalDestination: formData.countryOfFinalDestination,
        portOfLoading: formData.portOfLoading,
        portOfDischarge: formData.portOfDischarge,
        items: formattedItems,
        packingDetails: formattedPackings,
        beneficiaryName: formData.beneficiaryName,
        bankName: formData.beneficiaryBank,
        branch: formData.branch,
        accountNo: formData.beneficiaryAcNo,
        swiftCode: formData.switchCode,
        freightCost: formData.freightCost ? parseFloat(formData.freightCost) : 0,
        insuranceCost: formData.insuranceCost ? parseFloat(formData.insuranceCost) : 0,
        otherCost: formData.otherCharges ? parseFloat(formData.otherCharges) : 0,
        arnNo: formData.arnNo || null,
        rodtep: formData.rodtep || null,
        rexNo: formData.rexNo || null
      };

      // --- API Calls ---
      let savedInvoiceId = invoiceId;

      if (mode === 'edit') {
        if (!savedInvoiceId) return toast.error("Invoice ID not found for update");
        await invoiceApi.updateInvoice(savedInvoiceId, invoicePayload);
        toast.success("Invoice Updated!");
      } else {
        const response = await invoiceApi.createInvoice(invoicePayload);
        // Handle array response if necessary
        const responseData = Array.isArray(response.data) ? response.data[0] : response.data;
        savedInvoiceId = responseData.id || responseData.invoiceId || responseData._id;
        toast.success("Invoice Saved!");
      }

      // --- SEQUENTIAL DOWNLOADS (The Fix) ---
      if (savedInvoiceId) {
        const baseFilename = `Invoice-${formData.invoiceNo}`;
        toast.loading("Downloading files...");

        // 1. Download Export Invoice
        await downloadPdf(savedInvoiceId, 'EXPORT', `${baseFilename}-Export.pdf`);
        
        // 2. Wait 500ms
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 3. Download Commercial Invoice
        await downloadPdf(savedInvoiceId, 'COMMERCIAL', `${baseFilename}-Commercial.pdf`);

        // 4. Wait 500ms
        await new Promise(resolve => setTimeout(resolve, 500));

        // 5. Download Packing List
        await downloadPdf(savedInvoiceId, 'PACKAGING_LIST', `${baseFilename}-PackingList.pdf`);
        
        toast.dismiss();
        toast.success("All files downloaded!");
      }

      // Navigate back after downloads
      setTimeout(() => {
        navigate("/invoices");
      }, 1000);

    } catch (error) {
      console.error("Error submitting invoice:", error);
      toast.dismiss();
      const errMsg = error.response?.data?.message || "Failed to save/download";
      toast.error(errMsg);
    }
  };
  return (
    <SidebarLayout>
      <div className="space-y-6">
        {/* Exporter Section */}
        <FormSection title="Exporter" isClose={true} >
          <ExporterSection formData={formData} onChange={handleChange} />
        </FormSection>

        <FormSection title="Importer (Bill To)">
          <ImporterSection
            title="Bill To"
            prefix="billTo"
            formData={formData}
            onChange={handleChange}
            disabled={mode === 'view'}
          />
        </FormSection>

        <FormSection title="Importer (Ship To)">
          <ImporterSection
            title="Ship To"
            prefix="shipTo"
            formData={formData}
            onChange={handleChange}
            disabled={mode === 'view'}
          />
        </FormSection>

        <FormSection title="Invoice Details">
          <InvoiceDetailsSection formData={formData} onChange={handleChange} disabled={mode === 'view'} />
        </FormSection>

        <FormSection title="Items Details" action={
            mode !== 'view' && (
              <button type="button" onClick={handleAddItem} className="inline-flex items-center gap-2 bg-gray-900 text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition">
                Add Item <Plus className="w-3 h-3" />
              </button>
            )
          }
        >
          <ItemsDetailsSection items={items} onItemsChange={handleItemsChange} disabled={mode === 'view'} />
        </FormSection>

        <FormSection title="Packing Details" action={
            mode !== 'view' && (
              <button type="button" onClick={handleAddPacking} className="inline-flex items-center gap-2 bg-gray-900 text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition">
                Add Item <Plus className="w-3 h-3" />
              </button>
            )
          }
        >
          <PackingDetailsSection packings={packings} onPackingsChange={handlePackingsChange} disabled={mode === 'view'} />
        </FormSection>

        <FormSection title="Extra Changes">
          <AdditionalChargesSection formData={formData} onChange={handleChange} disabled={mode === 'view'} />
        </FormSection>

        <FormSection title="Bank Details">
          <BankDetailsSection formData={formData} onChange={handleChange} disabled={mode === 'view'} />
        </FormSection>

        <FormSection title="ARN No">
          <TextAreaSection title="Enter ARN No." name="arnNo" value={formData.arnNo} onChange={handleChange} placeholder="ARN..." disabled={mode === 'view'} />
        </FormSection>

        <FormSection title="RoDTEP">
          <TextAreaSection title="Enter RoDTEP" name="rodtep" value={formData.rodtep} onChange={handleChange} placeholder="RoDTEP..." disabled={mode === 'view'} />
        </FormSection>

        <FormSection title="REX No.">
          <TextAreaSection title="Enter REX No." name="rexNo" value={formData.rexNo} onChange={handleChange} placeholder="REX..." disabled={mode === 'view'} />
        </FormSection>

        <div className="flex justify-center gap-4 pt-4">
           {mode !== 'view' && (
             <button onClick={handleSubmit} className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition">
              {mode === 'edit' ? 'Update Invoice' : 'Save & Download'}
             </button>
           )}
          <button onClick={() => navigate("/invoices")} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition">
            {mode === 'view' ? 'Back' : 'Cancel'}
          </button>
        </div>
      </div>
    </SidebarLayout>
  );
};

export default CreateInvoice;