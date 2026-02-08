import React from "react";
import FormInput from "../FormInput";

const BankDetailsSection = ({ formData, onChange, disabled = false }) => {
  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        <FormInput
          label="Beneficiary Name"
          name="beneficiaryName"
          value={formData.beneficiaryName}
          onChange={onChange}
          placeholder="Ishita Industries"
          disabled={disabled}
        />
        <FormInput
          label="Beneficiary Bank"
          name="beneficiaryBank"
          value={formData.beneficiaryBank}
          onChange={onChange}
          placeholder="HDFC Bank"
          disabled={disabled}
        />
        <FormInput
          label="Branch"
          name="branch"
          value={formData.branch}
          onChange={onChange}
          placeholder="Dared"
          disabled={disabled}
        />
        <div className="col-span-2">
          <FormInput
            label="Beneficiary A/C No."
          name="beneficiaryAcNo"
          value={formData.beneficiaryAcNo}
          onChange={onChange}
          placeholder="50100469121007"
          disabled={disabled}
          />
        </div>
        <FormInput
          label="Switch Code"
          name="switchCode"
          value={formData.switchCode}
          onChange={onChange}
          placeholder="HDFCINBB"
          disabled={disabled}
        />
      </div>
    </>
  );
};

export default BankDetailsSection;

