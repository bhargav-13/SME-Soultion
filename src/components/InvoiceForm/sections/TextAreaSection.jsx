import React from "react";

const TextAreaSection = ({ title, name, value, onChange, placeholder, disabled = false }) => {
  return (
    <>
      <label className="text-sm text-black font-medium">
        {title}
      </label>
      <textarea
        rows="3"
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className={`mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 resize-none ${disabled ? 'bg-gray-50 text-gray-600' : ''}`}
      />
    </>
  );
};

export default TextAreaSection;

