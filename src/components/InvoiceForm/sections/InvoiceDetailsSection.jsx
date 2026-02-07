import React from "react";
import FormInput from "../FormInput";

const InvoiceDetailsSection = ({ formData, onChange, disabled = false }) => {
  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        <FormInput
          label="Invoice No."
          name="invoiceNo"
          value={formData.invoiceNo}
          onChange={onChange}
          disabled={disabled}
          placeholder="01"
        />
        <FormInput
          label="Invoice Date"
          name="invoiceDate"
          type="date"
          value={formData.invoiceDate}
          onChange={onChange}
          disabled={disabled}
        />
        <FormInput
          label="GST No"
          name="gstNo"
          value={formData.gstNo}
          onChange={onChange}
          disabled={disabled}
          placeholder="24AAMCC7842H1ZG"
        />
        <FormInput
          label="IEC Code"
          name="iecCode"
          value={formData.iecCode}
          onChange={onChange}
          disabled={disabled}
          placeholder="AAGFI3929N"
        />
        <FormInput
          label="P/O No."
          name="poNo"
          value={formData.poNo}
          onChange={onChange}
          disabled={disabled}
          placeholder="67937969"
        />
        <FormInput
          label="Incoterms"
          name="incoterms"
          value={formData.incoterms}
          onChange={onChange}
          disabled={disabled}
          placeholder="F.O.B"
        />
        <FormInput
          label="Payment Terms"
          name="paymentTerms"
          value={formData.paymentTerms}
          onChange={onChange}
          disabled={disabled}
          placeholder="T/T Net 15 B/L"
        />
        <FormInput
          label="Pre Carriage"
          name="preCarriage"
          value={formData.preCarriage}
          onChange={onChange}
          disabled={disabled}
          placeholder="Jamnagar"
        />
        <FormInput
          label="Country of Origin"
          name="countryOfOrigin"
          value={formData.countryOfOrigin}
          onChange={onChange}
          disabled={disabled}
          placeholder="India"
        />
        <FormInput
          label="Country of Final Destination"
          name="countryOfFinalDestination"
          value={formData.countryOfFinalDestination}
          onChange={onChange}
          disabled={disabled}
          placeholder="Denmark"
        />
        <FormInput
          label="Port of Loading"
          name="portOfLoading"
          value={formData.portOfLoading}
          onChange={onChange}
          disabled={disabled}
          placeholder="Nhava Sheva"
        />
        <FormInput
          label="Port of Discharge"
          name="portOfDischarge"
          value={formData.portOfDischarge}
          onChange={onChange}
          disabled={disabled}
          placeholder="Dallas Port"
        />
      </div>
    </>
  );
};

export default InvoiceDetailsSection;

