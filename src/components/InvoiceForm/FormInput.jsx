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
      <label className="text-sm text-black font-medium">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className={`mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 ${disabled ? 'bg-gray-50 text-gray-600' : ''} ${className}`}
      />
    </div>
  );
};

export default FormInput;

