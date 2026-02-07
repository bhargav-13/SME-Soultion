import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

const EditPartyDialog = ({ isOpen, onClose, onSave, initialData = null }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    gstin: "",
    type: "Supplier",
  });
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const PARTY_TYPES = [
    { label: "Customer", value: "CUSTOMER" },
    { label: "Vendor", value: "VENDOR"},
    { label: "Both", value: "BOTH" },
  ];

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        email: initialData.email || "",
        phone: initialData.phone || initialData.contact || "",
        gstin: initialData.gstin || "",
        type: initialData.type || "Supplier",
      });
    }
    setIsTypeOpen(false);
  }, [initialData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert("Please fill in party name");
      return;
    }
    onSave(formData);
    setIsTypeOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50  flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-medium text-black">Edit Party</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4 mb-6">
          {/* Party Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter Party Name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none text-sm"
            />
          </div>

          {/* GSTIN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              GSTIN
            </label>
            <input
              type="text"
              name="gstin"
              value={formData.gstin}
              onChange={handleChange}
              placeholder="Enter GSTIN"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none text-sm"
            />
          </div>

          {/* Contact Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Number
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter Contact Number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none text-sm"
            />
          </div>

          {/* Email ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email ID
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter Email ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none text-sm"
            />
          </div>

          {/* Type */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setIsTypeOpen(!isTypeOpen)}
              className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-gray-500 transition text-sm"
            >
              <span
                className={
                  formData.type === "" ? "text-gray-400" : "text-gray-900"
                }
              >
                {formData.type === "" ? "Select Type" : formData.type}
              </span>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${
                  isTypeOpen ? "rotate-180" : ""
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

            {isTypeOpen && (
              <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                {PARTY_TYPES.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        partyType: item.value, // ✅ saved value
                      }));
                      setIsTypeOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleSave}
            className="bg-black text-white px-12 py-2 rounded-xl hover:bg-gray-900 transition font-medium text-sm"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="border border-blabg-black text-blabg-black px-12 py-2 rounded-xl hover:bg-gray-50 transition font-medium text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditPartyDialog;
