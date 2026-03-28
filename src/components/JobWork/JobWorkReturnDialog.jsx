import React, { useEffect, useState } from "react";
import { X, ChevronDown } from "lucide-react";

const EMPTY_FORM = {
  returnKg: "",
  ghati: "",
  returnElement: "",
  returnType: "Peti",
  elementWeightGm: "900",
};

const JobWorkReturnDialog = ({
  isOpen,
  mode = "edit",
  initialData,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isReturnTypeOpen, setIsReturnTypeOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsReturnTypeOpen(false);
    setFormData({
      returnKg: initialData?.returnKgInput || "",
      ghati: initialData?.ghatiInput || "",
      returnElement: initialData?.returnElementInput || "",
      returnType: initialData?.returnType || "Peti",
      elementWeightGm: initialData?.returnType === "Drum" ? "" : "900",
    });
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const isViewMode = mode === "view";

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    if (isViewMode) {
      onClose();
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-xl border border-gray-200">
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="w-full text-center text-xl font-medium text-black">
            Job Work Return
          </h2>
          <button type="button" onClick={onClose} aria-label="Close dialog">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-12 py-6">
          <div className="space-y-4">
            <div>
              <label className="block text-md font-medium text-black mb-2">Return Kg.</label>
              <input
                type="text"
                value={formData.returnKg}
                onChange={(e) => handleChange("returnKg", e.target.value)}
                placeholder="Enter Kg"
                disabled={isViewMode}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-[#343434] outline-none transition placeholder:text-sm placeholder:text-gray-500 "
              />
            </div>

            <div>
              <label className="block text-md font-medium text-black mb-2">Ghati</label>
              <input
                type="text"
                value={formData.ghati}
                onChange={(e) => handleChange("ghati", e.target.value)}
                placeholder="Enter Kg"
                disabled={isViewMode}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-[#343434] outline-none transition placeholder:text-sm placeholder:text-gray-500 "
              />
            </div>

            <div>
              <label className="block text-md font-medium text-black mb-2">Return Element</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={formData.returnElement}
                  onChange={(e) => handleChange("returnElement", e.target.value)}
                  placeholder="Enter Element"
                  disabled={isViewMode}
                  className="flex-1 h-10 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
                />
                <div className="relative w-28">
                  <button
                    type="button"
                    onClick={() => {
                      if (isViewMode) return;
                      setIsReturnTypeOpen((prev) => !prev);
                    }}
                    disabled={isViewMode}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm bg-white disabled:bg-gray-100 disabled:text-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-400 flex items-center justify-between"
                  >
                    <span>{formData.returnType}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-500 transition-transform ${isReturnTypeOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isReturnTypeOpen && !isViewMode && (
                    <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                      {["Peti", "Drum"].map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            handleChange("returnType", option);
                            handleChange("elementWeightGm", option === "Peti" ? "900" : "");
                            setIsReturnTypeOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.elementWeightGm}
                  onChange={(e) => handleChange("elementWeightGm", e.target.value)}
                  placeholder="gm"
                  disabled={isViewMode || formData.returnType === "Peti"}
                  className={`w-28 h-10 px-3 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500 ${
                    formData.returnType === "Peti" ? "border-gray-200 bg-gray-50" : "border-gray-300 bg-white"
                  }`}
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-5">
            <button
              type="button"
              onClick={handleSubmit}
              className="w-28 h-10 bg-black  text-white rounded-lg hover:bg-gray-700 transition text-sm cursor-pointer"
            >
              {isViewMode ? "Close" : "Save"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-28 h-10 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobWorkReturnDialog;
