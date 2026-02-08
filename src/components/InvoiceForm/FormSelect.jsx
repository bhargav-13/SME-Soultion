import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

const FormSelect = ({
  label,
  name,
  value,
  onChange,
  options = [],
  required = false,
  colSpan = "1",
  placeholder = "Select...",
  showIcon = false,
  iconText = "M",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

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
      <div className="relative mt-8">
        {showIcon && (
          <span className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full text-lg font-normal flex items-center justify-center">
            {iconText}
          </span>
        )}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full text-sm flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg ${disabled ? 'bg-gray-50 text-gray-600' : 'bg-white'} focus:ring-1 focus:ring-black transition ${showIcon ? "pl-8" : ""}`}
        >
          <span className={selectedOption ? "text-black" : "text-gray-400"}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform  ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {!disabled && isOpen && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 transition"
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FormSelect;

