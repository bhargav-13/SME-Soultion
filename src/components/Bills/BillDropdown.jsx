import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

const BillDropdown = ({
  label,
  value,
  options = [],
  placeholder = "Select...",
  onSelect,
  disabled = false,
  required = false,
  labelClassName = "block text-md font-medium text-black mb-2",
  buttonClassName = "w-full border border-gray-300 rounded-md px-3 py-2.5 text-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-400 flex items-center justify-between",
  optionListClassName = "absolute z-20 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg",
}) => {
  const [open, setOpen] = useState(false);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  return (
    <div>
      <label className={labelClassName}>
        {label}
        {required ? <span className="text-red-400">*</span> : null}
      </label>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((prev) => !prev)}
          className={`${buttonClassName} ${disabled ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}`}
        >
          <span className={selectedOption ? "text-black" : "text-gray-500"}>
            {selectedOption?.label || placeholder}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && !disabled && (
          <div className={optionListClassName}>
            {options.length === 0 ? (
              <p className="px-4 py-2 text-sm text-gray-400">No options found</p>
            ) : (
              options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onSelect(option);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition ${
                    option.value === value ? "font-semibold bg-gray-50" : ""
                  }`}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BillDropdown;

