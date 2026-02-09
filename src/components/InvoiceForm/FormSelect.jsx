import React, { useState } from "react";

const FormSelect = ({
  label,
  name,
  value,
  onChange,
  options = [],
  required = false,
  colSpan = "1",
  placeholder = "Select...",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  const renderOptionLabel = (option) => {
    if (!option.iconText) return option.label;

    return (
      <span className="flex items-center gap-2">
        <span>{option.iconText}</span>
        <span>{option.label}</span>
      </span>
    );
  };

  const handleSelect = (optionValue) => {
    onChange({ target: { name, value: optionValue } });
    setIsOpen(false);
  };

  return (
    <div className={colSpan}>
      <label className="text-sm text-black font-medium">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>

      <div className="relative mt-7">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full text-sm flex items-center justify-between px-4 py-2.5 border border-gray-300 rounded-lg ${
            disabled ? "bg-gray-50 text-gray-600 text-sm" : "bg-white"
          } focus:ring-1 focus:ring-black transition`}
        > 
          <span
            className={`flex items-center gap-2 ${
              selectedOption ? "text-black" : "text-gray-400"
            }`}
          >
            {selectedOption ? renderOptionLabel(selectedOption) : placeholder}
          </span>

          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {!disabled && isOpen && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 transition"
              >
                {renderOptionLabel(option)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FormSelect;
