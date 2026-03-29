import React, { useEffect, useState } from "react";
import { Plus, ChevronDown, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SidebarLayout from "../../components/SidebarLayout";
import PageHeader from "../../components/PageHeader";
import PartyDropdown from "../../components/Bills/PartyDropdown";
import toast from "react-hot-toast";
import { partyApi } from "../../services/apiService";

const PURCHASE_ORDERS_KEY = "bills:purchaseOrders";

const createItem = () => ({
  size: "",
  unit: "",
  kgPc: "",
  element: "",
  elementType: "",
  elementWeightGm: "",
  scrap: "",
  labour: "",
});

const AddPurchaseOrder = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    sellerPartyId: "",
    sellerPartyName: "",
    sellerChitthiNo: "",
    sellerChitthiDate: "",
    purchaseNo: "",
    date: "",
    time: "",
  });
  const [items, setItems] = useState([createItem()]);
  const [saving, setSaving] = useState(false);
  const [openTypeIndex, setOpenTypeIndex] = useState(null);
  const [openUnitTypeIndex, setOpenUnitTypeIndex] = useState(null);
  const [partyOptions, setPartyOptions] = useState([]);

  useEffect(() => {
    const loadParties = async () => {
      try {
        const res = await partyApi.getAllParties();
        const data = res.data;
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setPartyOptions(list);
      } catch {
        toast.error("Failed to load party names");
      }
    };
    loadParties();
  }, []);

  const updateItem = (index, patch) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };
  const removeItem = (index) =>
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  const getItemTotal = (item) => (Number(item.scrap) || 0) + (Number(item.labour) || 0);

  const handleSave = async () => {
    if (!form.sellerPartyName) {
      toast.error("Seller party name is required");
      return;
    }
    if (!form.purchaseNo) {
      toast.error("Purchase number is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: Date.now(),
        purchaseNo: form.purchaseNo,
        sellerPartyId: form.sellerPartyId || undefined,
        sellerPartyName: form.sellerPartyName,
        sellerChitthiNo: form.sellerChitthiNo || undefined,
        sellerChitthiDate: form.sellerChitthiDate || undefined,
        date: form.date || undefined,
        time: form.time || undefined,
        items: items.map((item) => ({
          size: item.size || undefined,
          unit: item.unit || undefined,
          unitType: item.kgPc || undefined,
          element: item.element || undefined,
          elementType: item.elementType || undefined,
          elementWeightGm: item.elementWeightGm || undefined,
          scrap: item.scrap ? Number(item.scrap) : undefined,
          labour: item.labour ? Number(item.labour) : undefined,
          total: (Number(item.scrap) || 0) + (Number(item.labour) || 0),
        })),
        createdAt: new Date().toISOString(),
      };

      let existing = [];
      try {
        const raw = localStorage.getItem(PURCHASE_ORDERS_KEY);
        existing = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(existing)) existing = [];
      } catch {
        existing = [];
      }
      existing.unshift(payload);
      localStorage.setItem(PURCHASE_ORDERS_KEY, JSON.stringify(existing));

      toast.success("Purchase order saved successfully!");
      navigate("/bills/purchase");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SidebarLayout>
      <div className="mx-auto">
        <PageHeader
          title="Add New Purchase Order"
          description="Create purchase order details"
           action={
            <button
              type="button"
              onClick={() => navigate("/bills/purchase")}
              className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400 hover:bg-gray-50 transition cursor-pointer"
              aria-label="Close and go back to invoices"
            >
              <X className="w-4 h-4" />
            </button>
          }
          
        />

        <div className="mt-6 bg-white rounded-lg border border-gray-200 p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <PartyDropdown
                label="Seller Party Name"
                value={form.sellerPartyName}
                options={partyOptions}
                placeholder="Select Party"
                onSelect={(party) =>
                  setForm((prev) => ({
                    ...prev,
                    sellerPartyName: party.name,
                    sellerPartyId: party.id ? String(party.id) : "",
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-md font-medium text-black mb-2">Seller Chitthi No.</label>
              <input
                value={form.sellerChitthiNo}
                onChange={(e) => setForm((prev) => ({ ...prev, sellerChitthiNo: e.target.value }))}
                placeholder="Enter seller chitthi no."
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-md focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-md font-medium text-black mb-2">Seller Chitthi Date</label>
              <input
                type="date"
                value={form.sellerChitthiDate}
                onChange={(e) => setForm((prev) => ({ ...prev, sellerChitthiDate: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-md focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-md font-medium text-black mb-2">Purchase No.</label>
              <input
                value={form.purchaseNo}
                onChange={(e) => setForm((prev) => ({ ...prev, purchaseNo: e.target.value }))}
                placeholder="Enter purchase no."
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-md focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-md font-medium text-black mb-2">Date*</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-md focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-md font-medium text-black mb-2">Time</label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm((prev) => ({ ...prev, time: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-md focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
          </div>
        </div>

        <div className="mt-5 bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-medium text-black mb-5s">Add Items</h3>
            <button
              type="button"
              onClick={() => setItems((prev) => [...prev, createItem()])}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>

          {items.map((item, index) => (
            <div
              key={index}
              className={`mb-4 ${
                index > 0 ? "pt-4 mt-4 border-t border-gray-200" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-md font-medium text-black">Item {index + 1}</h3>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={items.length === 1}
                  className="text-red-500 hover:text-red-600 disabled:text-gray-300 disabled:cursor-not-allowed"
                  aria-label={`Remove item ${index + 1}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-md font-medium text-black mb-2">Size</label>
                  <input
                    value={item.size}
                    onChange={(e) => updateItem(index, { size: e.target.value })}
                    placeholder="Enter Pc."
                    className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-md font-medium text-black mb-2">Unit</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={item.unit}
                      onChange={(e) => updateItem(index, { unit: e.target.value })}
                      placeholder="Enter unit"
                      className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                    />
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setOpenUnitTypeIndex((prev) => (prev === index ? null : index));
                          setOpenTypeIndex(null);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-300 rounded-md bg-white text-sm"
                      >
                        <span className="text-gray-500">{item.kgPc || "Select unit"}</span>
                        <ChevronDown
                          className={`w-4 h-4 text-gray-500 transition-transform ${
                            openUnitTypeIndex === index ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {openUnitTypeIndex === index && (
                        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                          {["Kgs", "Gms"].map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                updateItem(index, { kgPc: opt });
                                setOpenUnitTypeIndex(null);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-md font-medium text-black mb-2">Element</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      value={item.element}
                      onChange={(e) => updateItem(index, { element: e.target.value })}
                      placeholder="Count"
                      className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                    />
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setOpenTypeIndex((prev) => (prev === index ? null : index));
                          setOpenUnitTypeIndex(null);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-300 rounded-md bg-white text-sm"
                      >
                        <span className="text-gray-500">{item.elementType || "Select type"}</span>
                        <ChevronDown
                          className={`w-4 h-4 text-gray-500 transition-transform ${
                            openTypeIndex === index ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {openTypeIndex === index && (
                        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                          {["Wooden Peti", "Peti", "Bag", "Heavy Peti"].map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                updateItem(index, {
                                  elementType: opt,
                                  element: opt === "Peti" ? "900" : "",
                                });
                                setOpenTypeIndex(null);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={item.elementWeightGm}
                      onChange={(e) => updateItem(index, { elementWeightGm: e.target.value })}
                      placeholder={item.elementType === "PETI" ? "900" : "Enter gm"}
                      className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-md font-medium text-black mb-2">Scrap</label>
                  <input
                    value={item.scrap}
                    onChange={(e) => updateItem(index, { scrap: e.target.value })}
                    placeholder="Enter scrap"
                    className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-md font-medium text-black mb-2">Labour</label>
                  <input
                    value={item.labour}
                    onChange={(e) => updateItem(index, { labour: e.target.value })}
                    placeholder="Enter labour"
                    className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-md font-medium text-black mb-2">Total</label>
                  <input
                    readOnly
                    value={getItemTotal(item)}
                    placeholder="Auto total"
                    className="w-full border border-gray-200 bg-gray-50 rounded-md px-3 py-2.5 text-sm text-gray-600"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-10 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/bills/purchase")}
            className="px-10 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </SidebarLayout>
  );
};

export default AddPurchaseOrder;
