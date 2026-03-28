import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import SidebarLayout from "../components/SidebarLayout";
import PageHeader from "../components/PageHeader";
import toast from "react-hot-toast";
import { partyApi } from "../services/apiService";
import { loadGresRecords, upsertGresRecord } from "../utils/gresStorage";

const EMPTY_FORM = {
  vendorName: "",
  vendorId: "",
  chithiNo: "",
  date: "",
  time: "",
};

const ELEMENT_TYPE_OPTIONS = ["Peti", "Drum", "Bag", "Heavy Peti"];
const FORM_LABEL_CLASS = "block text-md font-medium text-black mb-2";
const FORM_INPUT_CLASS =
  "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none placeholder:text-sm placeholder:text-gray-400";
const FORM_SELECT_CLASS =
  "w-full h-10 px-3 border border-gray-300 rounded-lg bg-white text-sm flex items-center justify-between focus:ring-2 focus:ring-gray-500 outline-none";

const createItemRow = (seed = {}) => ({
  itemName: "",
  size: "",
  qtyPc: "",
  qtyKg: "",
  unitType: "Kgs",
  element: "",
  elementType: "Peti",
  elementWeightGm: "900",
  ratePerKg: "",
  totalAmount: "",
  ...seed,
});

const normalizeDateForInput = (value) => {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return "";
};

const buildChithiNo = () => {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  return `I/I/Gres.Fill/01-${mm}-${yyyy}`;
};

const round3 = (n) => Math.round(n * 1000) / 1000;
const parseNumber = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const calcTotalAmount = (qtyKg, ratePerKg) => {
  const qty = parseNumber(qtyKg);
  const rate = parseNumber(ratePerKg);
  if (qty === null || rate === null) return "";
  return String(round3(qty * rate));
};

const MoveToGres = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [items, setItems] = useState([createItemRow()]);
  const [openElementTypeIndex, setOpenElementTypeIndex] = useState(null);
  const [openUnitTypeIndex, setOpenUnitTypeIndex] = useState(null);
  const [saving, setSaving] = useState(false);
  const [parties, setParties] = useState([]);
  const [partySearch, setPartySearch] = useState("");
  const [isPartyOpen, setIsPartyOpen] = useState(false);
  const partyRef = useRef(null);

  const mode = location.state?.mode === "edit" ? "edit" : "create";
  const editGresId = location.state?.gresId || null;

  useEffect(() => {
    const fetchParties = async () => {
      try {
        const res = await partyApi.getAllParties();
        const data = res.data;
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setParties(list);
      } catch {
        setParties([]);
      }
    };
    fetchParties();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (partyRef.current && !partyRef.current.contains(e.target)) {
        setIsPartyOpen(false);
        setPartySearch("");
      }
    };
    if (isPartyOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isPartyOpen]);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, chithiNo: prev.chithiNo || buildChithiNo() }));
    if (!editGresId) return;

    const existing = loadGresRecords().find((item) => String(item.id) === String(editGresId));
    if (!existing) return;

    const primary = existing.items?.[0] || createItemRow();
    setFormData({
      vendorName: existing.vendorName || "",
      vendorId: existing.vendorId || "",
      chithiNo: existing.chithiNo || buildChithiNo(),
      date: normalizeDateForInput(existing.date),
      time: existing.time || "",
    });
    setItems([
      createItemRow({
        ...primary,
        totalAmount: calcTotalAmount(primary.qtyKg, primary.ratePerKg),
      }),
    ]);
  }, [editGresId]);

  const filteredParties = useMemo(() => {
    const q = partySearch.trim().toLowerCase();
    if (!q) return parties;
    return parties.filter((party) => String(party.name || "").toLowerCase().includes(q));
  }, [parties, partySearch]);

  const addItem = () => setItems((prev) => [...prev, createItemRow()]);
  const removeItem = (index) => setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  const updateItem = (index, patch) => setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const updateItemAuto = (index, patch) =>
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const nextItem = { ...item, ...patch };
        nextItem.totalAmount = calcTotalAmount(nextItem.qtyKg, nextItem.ratePerKg);
        return nextItem;
      })
    );

  const handleSave = () => {
    setSaving(true);
    const primaryItem = items[0] || createItemRow();
    if (!formData.vendorName) {
      toast.error("Please select a vendor");
      setSaving(false);
      return;
    }
    if (!primaryItem.itemName) {
      toast.error("Please add at least one product name");
      setSaving(false);
      return;
    }

    const now = new Date().toISOString();
    const record = {
      id: editGresId || Date.now(),
      vendorName: formData.vendorName,
      vendorId: formData.vendorId,
      chithiNo: formData.chithiNo || buildChithiNo(),
      date: formData.date || now.slice(0, 10),
      time: formData.time || "",
      status: "PENDING",
      gresType: "INHOUSE",
      items: items.map((item) => ({
        ...item,
        totalAmount: calcTotalAmount(item.qtyKg, item.ratePerKg),
      })),
      qtyKg: primaryItem.qtyKg ? Number(primaryItem.qtyKg) : undefined,
      createdAt: now,
      returns: loadGresRecords().find((item) => String(item.id) === String(editGresId))?.returns || [],
    };

    upsertGresRecord(record);
    toast.success(editGresId ? "Gres updated!" : "Gres created!");
    setSaving(false);
    navigate("/gres", { state: { savedGres: { mode, job: record } } });
  };

  return (
    <SidebarLayout>
      <div className="mx-auto">
        <div className="mb-6">
          <PageHeader
            title={mode === "edit" ? "Edit Gres" : "Move to Gres Filling"}
            description="Fill the gres details to create or update the record."
            action={
              <button
                type="button"
                onClick={() => navigate("/gres")}
                className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400 hover:bg-gray-50 transition"
                aria-label="Close and go back to gres list"
              >
                <X className="w-4 h-4" />
              </button>
            }
          />
        </div>

        <div className="mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-5">
            <h3 className="text-2xl font-medium text-black mb-5">{mode === "edit" ? "Edit Gres" : "Move to Gres Filling"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative" ref={partyRef}>
                <label className={FORM_LABEL_CLASS}>Vendor Name</label>
                <div
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-md focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white cursor-pointer flex items-center justify-between"
                  onClick={() => setIsPartyOpen((prev) => !prev)}
                >
                  <span className={formData.vendorName ? "text-black text-md" : "text-md text-gray-500"}>
                    {formData.vendorName || "Enter Vendor"}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isPartyOpen ? "rotate-180" : ""}`} />
                </div>
                {isPartyOpen && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    <div className="px-3 py-2 border-b border-gray-100">
                      <input
                        type="text"
                        value={partySearch}
                        onChange={(e) => setPartySearch(e.target.value)}
                        placeholder="Search vendor..."
                        className={FORM_INPUT_CLASS}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredParties.length === 0 ? (
                        <p className="px-4 py-2 text-sm text-gray-400">No vendors found</p>
                      ) : (
                        filteredParties.map((party) => (
                          <button
                            key={party.id}
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, vendorName: party.name, vendorId: party.id }));
                              setIsPartyOpen(false);
                              setPartySearch("");
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${formData.vendorId === party.id ? "font-semibold bg-gray-50" : ""}`}
                          >
                            {party.name}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className={FORM_LABEL_CLASS}>Chithi No.</label>
                <input
                  value={formData.chithiNo}
                  readOnly
                  className="w-full border border-gray-200 bg-gray-50 rounded-md px-3 py-2.5 text-md text-gray-600 cursor-default"
                />
              </div>
              <div>
                <label className={FORM_LABEL_CLASS}>Chithi Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              </div>
              <div>
                <label className={FORM_LABEL_CLASS}>Time</label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData((prev) => ({ ...prev, time: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-white rounded-lg border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium text-black">Add Items</h4>
            <button
              type="button"
              onClick={addItem}
              className="px-6 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700 transition"
            >
              Add Item
            </button>
          </div>
          {items.map((item, index) => (
            <div key={index} className={`${index > 0 ? "pt-4 mt-4 border-t border-gray-200" : ""}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-md font-medium text-black">Item {index + 1}</h3>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={items.length === 1}
                  className="text-red-500 hover:text-red-600 disabled:text-gray-300 disabled:cursor-not-allowed"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={FORM_LABEL_CLASS}>Product Name</label>
                  <input
                    value={item.itemName}
                    onChange={(e) => updateItem(index, { itemName: e.target.value })}
                    className={FORM_INPUT_CLASS}
                    placeholder="Enter Product"
                  />
                </div>
                <div>
                  <label className={FORM_LABEL_CLASS}>Size</label>
                  <input
                    value={item.size}
                    onChange={(e) => updateItem(index, { size: e.target.value })}
                    className={FORM_INPUT_CLASS}
                    placeholder="Enter Size"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className={FORM_LABEL_CLASS}>Unit Kg/Pcs.</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={item.qtyPc}
                      onChange={(e) => updateItem(index, { qtyPc: e.target.value })}
                      className={FORM_INPUT_CLASS}
                      placeholder="100"
                    />
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setOpenUnitTypeIndex((prev) => (prev === index ? null : index));
                          setOpenElementTypeIndex(null);
                        }}
                        className={FORM_SELECT_CLASS}
                      >
                        <span>{item.unitType || "Select unit"}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${openUnitTypeIndex === index ? "rotate-180" : ""}`} />
                      </button>
                      {openUnitTypeIndex === index && (
                        <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white overflow-hidden shadow">
                          {["Kgs", "Pcs"].map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                updateItem(index, { unitType: option });
                                setOpenUnitTypeIndex(null);
                              }}
                              className="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-100"
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <label className={FORM_LABEL_CLASS}>Element</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      value={item.element}
                      onChange={(e) => updateItem(index, { element: e.target.value })}
                      className={FORM_INPUT_CLASS}
                      placeholder="02"
                    />
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setOpenElementTypeIndex((prev) => (prev === index ? null : index));
                          setOpenUnitTypeIndex(null);
                        }}
                        className={FORM_SELECT_CLASS}
                      >
                          <span className="truncate">{item.elementType}</span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${openElementTypeIndex === index ? "rotate-180" : ""}`} />
                        </button>
                        {openElementTypeIndex === index && (
                          <div className="absolute z-10 mt-1 w-40 rounded-md border border-gray-200 bg-white overflow-hidden shadow">
                          {ELEMENT_TYPE_OPTIONS.map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                updateItem(index, {
                                  elementType: option,
                                  elementWeightGm: option === "Peti" ? "900" : "",
                                });
                                setOpenElementTypeIndex(null);
                              }}
                              className="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-100"
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <input
                      value={item.elementWeightGm}
                      onChange={(e) => updateItem(index, { elementWeightGm: e.target.value })}
                      className={FORM_INPUT_CLASS}
                      placeholder={item.elementType === "Peti" ? "900" : "Enter gm"}
                    />
                  </div>
                </div>
                <div>
                  <label className={FORM_LABEL_CLASS}>Net Weight</label>
                  <input
                    value={item.qtyKg}
                    onChange={(e) => updateItem(index, { qtyKg: e.target.value })}
                    className={FORM_INPUT_CLASS}
                    placeholder="98 KGS"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className={FORM_LABEL_CLASS}>Rate / Kgs</label>
                  <input
                    value={item.ratePerKg}
                    onChange={(e) => updateItemAuto(index, { ratePerKg: e.target.value })}
                    className={FORM_INPUT_CLASS}
                    placeholder="6"
                  />
                </div>
                <div>
                  <label className={FORM_LABEL_CLASS}>Total Amount</label>
                  <input
                    value={item.totalAmount}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 outline-none placeholder:text-sm placeholder:text-gray-400 cursor-not-allowed"
                    placeholder="Auto"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-4 justify-center mt-6">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-12 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/gres")}
            disabled={saving}
            className="px-12 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </SidebarLayout>
  );
};

export default MoveToGres;
