import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

const STATUS_OPTIONS = ["PENDING", "COMPLETE", "REJECT"];
const STATUS_LABEL = { PENDING: "Pending", COMPLETE: "Complete", REJECT: "Reject" };
const STATUS_COLOR = {
  COMPLETE: "bg-[#D1FFE2] text-green-800",
  PENDING: "bg-[#fde68a] text-yellow-800",
  REJECT: "bg-[#fecaca] text-red-800",
};

const JobWorkStatusDropdown = ({ value, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const colorClass = STATUS_COLOR[value] || "bg-gray-100 text-gray-700";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition ${colorClass} ${disabled ? "opacity-70 cursor-not-allowed" : ""}`}
      >
        {STATUS_LABEL[value] || value}
        {!disabled && <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>
      {open && !disabled && (
        <div className="absolute z-20 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${value === opt ? "font-semibold" : ""}`}
            >
              {STATUS_LABEL[opt]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default JobWorkStatusDropdown;
