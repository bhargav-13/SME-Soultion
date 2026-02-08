import React from "react";

const ImporterSection = ({ title, prefix, formData, onChange, disabled }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      
      {/* 1. Country Field (Likely missing previously) */}
      <div className="md:col-span-2">
        <label className="block font-medium text-black mb-1">
          Country
        </label>
        <input
          type="text"
          name={`${prefix}Country`}
          value={formData[`${prefix}Country`] || ""}
          onChange={onChange}
          disabled={disabled}
          placeholder="e.g. USA, India, UAE"
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100 placeholder:text-gray-500 placeholder:text-sm"
        />
      </div>

      {/* 2. To The Order Field (Likely missing previously) */}
      

      {/* 3. Company / Party Name */}
      <div>
        <label className="block font-medium text-black mb-1">
          {title} Name
        </label>
        <input
          type="text"
          name={`${prefix}Name`}
          value={formData[`${prefix}Name`] || ""}
          onChange={onChange}
          disabled={disabled}
          placeholder="Company Name"
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100 placeholder:text-gray-500 placeholder:text-sm"
        />
      </div>

      {/* 4. Contact Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Contact No.
        </label>
        <input
          type="text"
          name={`${prefix}ContactNo`}
          value={formData[`${prefix}ContactNo`] || ""}
          onChange={onChange}
          disabled={disabled}
          placeholder="Phone Number"
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
        />
      </div>

      {/* 5. Address */}
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Address
        </label>
        <textarea
          name={`${prefix}Address`}
          value={formData[`${prefix}Address`] || ""}
          onChange={onChange}
          disabled={disabled}
          rows="3"
          placeholder="Full Address"
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
        />
      </div>
    </div>
  );
};

export default ImporterSection;