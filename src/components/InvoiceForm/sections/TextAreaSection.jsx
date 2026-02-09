import React from "react";

const TextAreaSection = ({ title, name, value, onChange, placeholder, disabled = false }) => {
  return (
    <>
      <label className="text-black font-medium mb-3">
        {title}
      </label>
      <textarea
        rows="1"
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className={`mt-1 w-full border border-gray-200 rounded-lg px-4 py-2  placeholder:text-gray-500 placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 resize-none ${disabled ? 'bg-gray-50 text-gray-600' : ''}`}
      />
    </>
  );
};

export default TextAreaSection;

