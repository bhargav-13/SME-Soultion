import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import SidebarLayout from "../components/SidebarLayout";
import PageHeader from "../components/PageHeader";
import toast from "react-hot-toast";
import { partyApi, gresFillingApi, itemBlueprintApi, sizeApi } from "../services/apiService";

// ---- Inline dropdown components (same pattern as AddOrder) ----
const SearchableDropdown = ({
  id, placeholder, value, options, onSelect,
  searchValue, onSearchChange, isOpen, onOpen, onClose,
  loading = false, disabled = false, getLabel,
}) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose]);

  return (
    <div ref={ref} className="relative">
      <div className={`flex items-center border rounded-md overflow-hidden transition
        ${disabled ? "border-gray-200 bg-gray-50 cursor-not-allowed" : "border-gray-300 bg-white hover:border-gray-400"}
        ${isOpen ? "ring-1 ring-gray-400 border-gray-400" : ""}`}
      >
        <input
          id={id}
          type="text"
          value={isOpen ? searchValue : (value ? getLabel(value) : "")}
          onChange={(e) => onSearchChange(e.target.value)}
          onClick={() => !disabled && onOpen()}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={!isOpen}
          className="flex-1 px-3 py-2.5 text-md focus:outline-none bg-transparent text-gray-800 placeholder-gray-400 disabled:cursor-not-allowed"
        />
        <ChevronDown
          onClick={() => !disabled && (isOpen ? onClose() : onOpen())}
          className={`w-4 h-4 text-gray-400 mr-2 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""} ${disabled ? "opacity-40" : "cursor-pointer"}`}
        />
      </div>
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-52 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-3 text-sm text-gray-400">Loading…</div>
          ) : options.length === 0 ? (
            <div className="px-3 py-3 text-sm text-gray-400">No options found.</div>
          ) : (
            options.map((opt, i) => (
              <button key={i} type="button"
                onMouseDown={(e) => { e.preventDefault(); onSelect(opt); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-700">
                {getLabel(opt)}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const ButtonDropdown = ({ value, placeholder, options, onSelect, disabled = false, loading = false }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" disabled={disabled} onClick={() => !disabled && setOpen((p) => !p)}
        className={`w-full border border-gray-300 rounded-md px-3 py-2.5 text-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-400 flex items-center justify-between ${disabled ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}`}>
        <span className={selectedOption ? "text-black" : "text-gray-500"}>{selectedOption?.label || placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && !disabled && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-52 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-3 text-sm text-gray-400">Loading…</div>
          ) : options.length === 0 ? (
            <div className="px-3 py-3 text-sm text-gray-400">No options found.</div>
          ) : (
            options.map((opt) => (
              <button key={opt.value} type="button"
                onMouseDown={(e) => { e.preventDefault(); setOpen(false); onSelect(opt); }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-700 ${String(opt.value) === String(value) ? "font-medium bg-gray-50" : ""}`}>
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
// ---- End dropdown components ----

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
  selectedItem: null,
  selectedSize: null,
  sizes: [],
  sizesLoading: false,
  itemSearch: "",
  itemDropdownOpen: false,
  qtyPc: "",
  unitType: "Kgs",
  element: "",
  elementType: "Peti",
  elementWeightGm: "900",
  qtyKg: "",
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

const calcNetWeight = (qtyPc, element, elementWeightGm) => {
  const unitKg = parseNumber(qtyPc);
  const count = parseNumber(element);
  const gmWeight = parseNumber(elementWeightGm);
  if (unitKg === null || count === null || gmWeight === null || count <= 0) return "";
  const net = round3(count * (unitKg - gmWeight / 1000));
  return net > 0 ? String(net) : "";
};

const toApiElementType = (uiType) => (uiType === "Drum" ? "DRUM" : "PETI");

const MoveToGres = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formStatus, setFormStatus] = useState("PENDING");
  const [items, setItems] = useState([createItemRow()]);
  const [openElementTypeIndex, setOpenElementTypeIndex] = useState(null);
  const [openUnitTypeIndex, setOpenUnitTypeIndex] = useState(null);
  const [saving, setSaving] = useState(false);
  const [parties, setParties] = useState([]);
  const [partySearch, setPartySearch] = useState("");
  const [isPartyOpen, setIsPartyOpen] = useState(false);
  const [allItems, setAllItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
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
      } catch { setParties([]); }
    };
    const fetchItems = async () => {
      setItemsLoading(true);
      try {
        const res = await itemBlueprintApi.getAllItems();
        const data = res.data;
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setAllItems(list);
      } catch { setAllItems([]); }
      finally { setItemsLoading(false); }
    };
    fetchParties();
    fetchItems();
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

    const fetchForEdit = async () => {
      try {
        const res = await gresFillingApi.getGresFillingById(editGresId);
        const existing = res.data;
        if (!existing) return;

        setFormStatus(existing.status || "PENDING");
        setFormData({
          vendorName: existing.party?.name || "",
          vendorId: existing.party?.id || "",
          chithiNo: existing.chitthiNo || buildChithiNo(),
          date: normalizeDateForInput(existing.chitthiDate),
          time: existing.orderTime || "",
        });

        const apiItems = existing.items || [];
        if (apiItems.length > 0) {
          const mapped = apiItems.map((item) => {
            const qtyPc = item.unitKg != null ? String(item.unitKg) : "";
            const element = item.elementCount != null ? String(item.elementCount) : "";
            const elementWeightGm = "900";
            const qtyKg = item.netWeight != null ? String(item.netWeight) : "";
            return createItemRow({
              selectedSize: item.size ? { id: item.size.id, sizeInInch: item.size.sizeInInch, sizeInMm: item.size.sizeInMm } : null,
              sizes: item.size ? [item.size] : [],
              qtyPc,
              qtyKg,
              unitType: item.unitType || "Kgs",
              element,
              elementType: item.elementType === "DRUM" ? "Drum" : "Peti",
              elementWeightGm,
              ratePerKg: item.ratePerKg != null ? String(item.ratePerKg) : "",
              totalAmount: item.totalAmount != null ? String(item.totalAmount) : calcTotalAmount(qtyKg, item.ratePerKg),
            });
          });
          setItems(mapped);
        }
      } catch {
        toast.error("Failed to load gres record for editing");
      }
    };
    fetchForEdit();
  }, [editGresId]);

  const filteredParties = useMemo(() => {
    const q = partySearch.trim().toLowerCase();
    if (!q) return parties;
    return parties.filter((p) => String(p.name || "").toLowerCase().includes(q));
  }, [parties, partySearch]);

  const updateItem = useCallback((index, patch) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }, []);

  const addItem = () => setItems((prev) => [...prev, createItemRow()]);
  const removeItem = (index) => setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));

  const handleSelectItem = useCallback(async (index, blueprint) => {
    updateItem(index, {
      selectedItem: blueprint,
      selectedSize: null,
      sizes: [],
      sizesLoading: true,
      itemSearch: "",
      itemDropdownOpen: false,
      qtyKg: "",
    });
    try {
      const res = await sizeApi.getSizesByItemId(blueprint.id);
      updateItem(index, { sizes: Array.isArray(res.data) ? res.data : [], sizesLoading: false });
    } catch {
      toast.error("Failed to load sizes");
      updateItem(index, { sizesLoading: false });
    }
  }, [updateItem]);

  const handleSelectSize = useCallback((index, size) => {
    updateItem(index, { selectedSize: size });
  }, [updateItem]);

  const updateItemWithAutoCalc = useCallback((index, patch) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it;
        const next = { ...it, ...patch };
        next.qtyKg = calcNetWeight(next.qtyPc, next.element, next.elementWeightGm);
        next.totalAmount = calcTotalAmount(next.qtyKg, next.ratePerKg);
        return next;
      })
    );
  }, []);

  const handleSave = async () => {
    if (!formData.vendorName) {
      toast.error("Please select a vendor");
      return;
    }
    if (!formData.date) {
      toast.error("Please enter a chithi date");
      return;
    }

    setSaving(true);
    const payload = {
      partyId: Number(formData.vendorId),
      chitthiDate: formData.date,
      orderTime: formData.time || undefined,
      status: formStatus,
      items: items.map((item) => ({
        sizeId: item.selectedSize?.id || undefined,
        unitKg: item.qtyPc ? Number(item.qtyPc) || undefined : undefined,
        unitType: item.unitType || "Kgs",
        elementCount: item.element ? Number(item.element) || undefined : undefined,
        elementType: toApiElementType(item.elementType),
        netWeight: item.qtyKg ? Number(item.qtyKg) || undefined : undefined,
        ratePerKg: item.ratePerKg ? Number(item.ratePerKg) || undefined : undefined,
        totalAmount: item.totalAmount ? Number(item.totalAmount) || undefined : undefined,
      })),
    };

    try {
      if (mode === "edit" && editGresId) {
        await gresFillingApi.updateGresFilling(editGresId, payload);
        toast.success("Gres updated!");
      } else {
        await gresFillingApi.createGresFilling(payload);
        toast.success("Gres created!");
      }
      navigate("/gres");
    } catch {
      toast.error(mode === "edit" ? "Failed to update gres" : "Failed to create gres");
    } finally {
      setSaving(false);
    }
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
          {items.map((item, index) => {
            const filteredItems = allItems.filter((opt) =>
              !item.itemSearch || String(opt.itemName || "").toLowerCase().includes(item.itemSearch.toLowerCase())
            );
            return (
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
                    <SearchableDropdown
                      id={`item-${index}`}
                      placeholder="Search & select item…"
                      value={item.selectedItem}
                      options={filteredItems}
                      getLabel={(opt) => opt.itemName}
                      searchValue={item.itemSearch}
                      onSearchChange={(v) => updateItem(index, { itemSearch: v, itemDropdownOpen: true })}
                      isOpen={item.itemDropdownOpen}
                      onOpen={() => updateItem(index, { itemDropdownOpen: true, itemSearch: "" })}
                      onClose={() => updateItem(index, { itemDropdownOpen: false, itemSearch: "" })}
                      loading={itemsLoading}
                      onSelect={(opt) => handleSelectItem(index, opt)}
                    />
                  </div>
                  <div>
                    <label className={FORM_LABEL_CLASS}>Size</label>
                    <ButtonDropdown
                      value={item.selectedSize?.id ?? ""}
                      placeholder={!item.selectedItem ? "Select item first" : item.sizesLoading ? "Loading…" : "Select size…"}
                      options={item.sizes.map((sz) => ({
                        value: sz.id,
                        label: `${sz.sizeInInch}${sz.sizeInMm ? ` (${sz.sizeInMm})` : ""}`,
                        raw: sz,
                      }))}
                      disabled={!item.selectedItem || item.sizesLoading}
                      loading={item.sizesLoading}
                      onSelect={(opt) => handleSelectSize(index, opt.raw)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className={FORM_LABEL_CLASS}>Unit Kg/Pcs.</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={item.qtyPc}
                        onChange={(e) => updateItemWithAutoCalc(index, { qtyPc: e.target.value })}
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
                                onClick={() => { updateItem(index, { unitType: option }); setOpenUnitTypeIndex(null); }}
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
                        onChange={(e) => updateItemWithAutoCalc(index, { element: e.target.value })}
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
                                  updateItemWithAutoCalc(index, {
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
                        onChange={(e) => updateItemWithAutoCalc(index, { elementWeightGm: e.target.value })}
                        className={FORM_INPUT_CLASS}
                        placeholder={item.elementType === "Peti" ? "900" : "Enter gm"}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={FORM_LABEL_CLASS}>Net Weight</label>
                    <input
                      value={item.qtyKg}
                      readOnly
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 outline-none placeholder:text-sm placeholder:text-gray-400 cursor-not-allowed"
                      placeholder="Auto calculated"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className={FORM_LABEL_CLASS}>Rate / Kgs</label>
                    <input
                      value={item.ratePerKg}
                      onChange={(e) => {
                        const ratePerKg = e.target.value;
                        updateItem(index, {
                          ratePerKg,
                          totalAmount: calcTotalAmount(item.qtyKg, ratePerKg),
                        });
                      }}
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
            );
          })}
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
