import React from "react";

const FormInput = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  className = "",
  colSpan = "1",
  disabled = false,
}) => {
  return (
    <div className={colSpan}>
      <label className=" block text-black font-medium mb-2">
        {label}
        {required && <span className="text-black">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 placeholder:text-gray-500 transition${
          disabled ? "bg-gray-100 text-gray-600 cursor-not-allowed" : ""
        } ${className}`}
      />
    </div>
  );
};

export default FormInput;

