import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

const TYPE_OPTIONS = ["JOB_WORK", "INHOUSE", "OUTSIDE"];
const TYPE_LABEL = { JOB_WORK: "Job Work", INHOUSE: "In-House", OUTSIDE: "Outside" };

const JobWorkTypeDropdown = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 px-4 py-1.5 border border-gray-300 rounded-md bg-white text-sm font-medium text-black transition hover:border-gray-400"
      >
        {TYPE_LABEL[value] || value}
        <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${value === opt ? "font-semibold" : ""}`}
            >
              {TYPE_LABEL[opt]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default JobWorkTypeDropdown;
