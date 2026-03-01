import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SidebarLayout from "../../components/SidebarLayout";
import { Calendar, X } from "lucide-react";
import PageHeader from "../../components/PageHeader";
import toast from "react-hot-toast";

const ORDER_STORAGE_KEY = "orderManagement.orders.v1";

const createEmptyItem = () => ({
  size: "",
  pcs: "",
  boxPc: "",
  cartoon: "",
  qtyKg: "",
  finish: "",
});

const formatDateToDisplay = (dateValue) => {
  if (!dateValue) return "";
  const parts = dateValue.split("-");
  if (parts.length !== 3) return dateValue;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

const safeNumberText = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "0";
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? String(parsed) : trimmed;
};

const AddOrder = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedParty = location.state?.selectedParty || null;
  const [orderForm, setOrderForm] = useState({
    partyName: selectedParty?.name || "",
    poDate: "",
    items: [createEmptyItem()],
  });

  const handleOrderChange = (e) => {
    const { name, value } = e.target;
    setOrderForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleItemChange = (index, e) => {
    const { name, value } = e.target;
    setOrderForm((prev) => {
      const updatedItems = [...prev.items];
      updatedItems[index] = {
        ...updatedItems[index],
        [name]: value,
      };
      return {
        ...prev,
        items: updatedItems,
      };
    });
  };

  const addItem = () => {
    setOrderForm((prev) => ({
      ...prev,
      items: [...prev.items, createEmptyItem()],
    }));
  };

  const removeItem = (index) => {
    setOrderForm((prev) => {
      if (prev.items.length === 1) return prev;
      return {
        ...prev,
        items: prev.items.filter((_, itemIndex) => itemIndex !== index),
      };
    });
  };

  const handleSave = () => {
    const partyName = orderForm.partyName.trim();
    if (!partyName) {
      toast.error("Party name is required");
      return;
    }

    const validItems = orderForm.items.filter((item) => {
      return Object.values(item).some((value) => String(value || "").trim() !== "");
    });

    if (validItems.length === 0) {
      toast.error("Add at least one item");
      return;
    }

    const orderId = Date.now();
    const orderDate = formatDateToDisplay(orderForm.poDate);
    const mappedRows = validItems.map((item, index) => {
      const qtyPc = safeNumberText(item.pcs);
      const dispatchPcs = "0";
      const pendingPc = safeNumberText(item.pcs);

      return {
        id: `${orderId}-${index}`,
        orderId,
        partyName,
        date: orderDate,
        size: item.size || "-",
        qtyPc,
        qtyKg: item.qtyKg || "0",
        boxPc: item.boxPc || "0",
        cartoon: item.cartoon || "0",
        dispatchDate: "",
        dispatchPcs,
        pendingPc,
        plating: item.finish || "-",
        platingStatus: false,
        jobWork: "Job Work",
      };
    });

    let existingOrders = [];
    try {
      const raw = localStorage.getItem(ORDER_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      existingOrders = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      existingOrders = [];
    }

    const nextOrders = [...existingOrders, ...mappedRows];
    localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(nextOrders));
    toast.success("Order saved successfully");
    navigate("/order");
  };

  return (
    <SidebarLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="mb-6">
            <PageHeader
              title="Add New Order"
              action={
                <button
                  type="button"
                  onClick={() => navigate("/order")}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400 hover:bg-gray-50 transition"
                  aria-label="Close and go back to invoices"
                >
                  <X className="w-4 h-4" />
                </button>
              }
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            <div>
              <label className="block text-md font-medium text-black mb-2">
                Party Name*
              </label>
              <input
                type="text"
                name="partyName"
                value={orderForm.partyName}
                onChange={handleOrderChange}
                placeholder="Enter Party Name"
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-md focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-md font-medium text-black mb-2">
                P/O Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="poDate"
                  value={orderForm.poDate}
                  onChange={handleOrderChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mb-4">
          {/* <h2 className="text-xl font-medium text-black">Item Details</h2> */}
          <PageHeader title="Item Details" />
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-2 bg-gray-900 text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition"
          >
            Add Item +
          </button>
        </div>
        {/* <div className="mb-8">
          <PageHeader
            title="Item Details"
            action={
              <PrimaryActionButton
                onClick={addItem}
                icon={Plus}
                className="px-3 py-1.5 bg-"
              >
               Add Item
              </PrimaryActionButton>
            }
          />
        </div> */}

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="space-y-6">
            {orderForm.items.map((item, index) => (
              <div key={index} className="">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-md font-medium text-black">
                    Item {index + 1}
                  </h3>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={orderForm.items.length === 1}
                    className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-md font-medium text-black mb-2">
                      Size
                    </label>
                    <input
                      type="text"
                      name="size"
                      value={item.size}
                      onChange={(e) => handleItemChange(index, e)}
                      placeholder="Select Size"
                      className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-md font-medium text-black mb-2">
                      Pcs.
                    </label>
                    <input
                      type="text"
                      name="pcs"
                      value={item.pcs}
                      onChange={(e) => handleItemChange(index, e)}
                      placeholder="Enter Pc."
                      className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-md font-medium text-black mb-2">
                      Box Pc.
                    </label>
                    <input
                      type="text"
                      name="boxPc"
                      value={item.boxPc}
                      onChange={(e) => handleItemChange(index, e)}
                      placeholder="Auto"
                      className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-md font-medium text-black mb-2">
                      Cartoon
                    </label>
                    <input
                      type="text"
                      name="cartoon"
                      value={item.cartoon}
                      onChange={(e) => handleItemChange(index, e)}
                      placeholder="Auto"
                      className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-md font-medium text-black mb-2">
                      Qty Kg
                    </label>
                    <input
                      type="text"
                      name="qtyKg"
                      value={item.qtyKg}
                      onChange={(e) => handleItemChange(index, e)}
                      placeholder="Auto"
                      className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-md font-medium text-black mb-2">
                      Finish
                    </label>
                    <input
                      type="text"
                      name="finish"
                      value={item.finish}
                      onChange={(e) => handleItemChange(index, e)}
                      placeholder="SS + 16"
                      className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                type="button"
                onClick={handleSave}
                className="px-10 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => navigate("/order/select")}
                className="px-10 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
};

export default AddOrder;
