import { X } from "lucide-react";
import React from "react";
import { Navigate, useNavigate } from "react-router-dom";

const FormSection = ({ title, children, className = "", action, isClose }) => {
  const navigate = useNavigate();
  return (
    <div className={`space-y-4 ${className}`}>
      {title && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-normal text-black mt-2 ml-2">
              {title}
            </h1>
          </div>
          {action ? <div>{action}</div> : null}
          {isClose && (
            <button
              type="button"
              onClick={() => navigate("/invoices")}
              className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400 hover:bg-gray-50 transition"
              aria-label="Close and go back to invoices"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        {children}
      </div>
    </div>
  );
};

export default FormSection;
