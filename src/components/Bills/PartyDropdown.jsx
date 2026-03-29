import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

const PartyDropdown = ({
  label,
  value,
  options = [],
  placeholder = "Select Party",
  onSelect,
  required = false,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);

  const selectedParty = options.find(
    (party) => party.name === value || String(party.id) === String(value)
  );

  return (
    <div>
      <label className="block text-md font-medium text-black mb-2">
        {label}
        {required ? <span className="text-red-400">*</span> : null}
      </label>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((prev) => !prev)}
          className={`w-full border border-gray-300 rounded-md px-3 py-2.5 text-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-400 flex items-center justify-between ${
            disabled ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""
          }`}
        >
          <span className={selectedParty ? "text-black" : "text-gray-500"}>
            {selectedParty?.name || placeholder}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && !disabled && (
          <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
            {options.length === 0 ? (
              <p className="px-4 py-2 text-sm text-gray-400">No options found</p>
            ) : (
              options.map((party) => (
                <button
                  key={party.id}
                  type="button"
                  onClick={() => {
                    onSelect(party);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition ${
                    selectedParty?.id === party.id ? "font-semibold bg-gray-50" : ""
                  }`}
                >
                  {party.name}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PartyDropdown;

