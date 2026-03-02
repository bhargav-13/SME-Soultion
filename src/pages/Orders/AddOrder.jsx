import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SidebarLayout from "../../components/SidebarLayout";
import { ChevronDown, X } from "lucide-react";
import PageHeader from "../../components/PageHeader";
import toast from "react-hot-toast";
import {
  itemBlueprintApi,
  sizeApi,
  clientInventoryApi,
  axiosInstance,
} from "../../services/apiService";

// ─── Finish / Plating options ─────────────────────────────────────────────
const FINISH_OPTIONS = [
  "S.S & Sartin Lacq",
  "ANTQ",
  "Side Gold",
  "Z-Black.",
  "Gr. Black.",
  "Matt S.S",
  "Matt ANTQ",
  "PVD Rose",
  "PVD Gold",
  "PVD Black",
  "Rose Gold",
  "Clear Lacq.",
];

// ─── Empty item row ────────────────────────────────────────────────────────
const createEmptyItem = () => ({
  selectedItem: null,
  selectedSize: null,
  sizes: [],
  sizesLoading: false,
  // user inputs
  qtyPc: "",
  finish: "",
  // raw rates from client inventory (used for calculations)
  rawPcPerBox: "",      // pcsPerBox  — the rate, never changes
  rawBoxPerCartoon: "", // boxPerCarton — the rate, never changes
  // calculated display values (derived from qtyPc + raw rates)
  pcPerBox: "",
  boxPerCartoon: "",
  pcPerCartoon: "",
  qtyKg: "",
  clientInventoryLoading: false,
  // item search
  itemSearch: "",
  itemDropdownOpen: false,
});

// ─── Derive box / carton / kg from user's qtyPc input ────────────────────────
// boxes   = ceil(qtyPc / pcPerBox_rate)
// cartons = ceil(boxes / boxPerCartoon_rate)
// qtyKg   = (dozenWeight / 12) × qtyPc
const computeDerived = (qtyPc, rawPcPerBox, rawBoxPerCartoon, dozenWeight) => {
  const qty     = parseFloat(qtyPc)            || 0;
  const pcRate  = parseFloat(rawPcPerBox)       || 0;
  const boxRate = parseFloat(rawBoxPerCartoon)  || 0;
  const dozWt   = parseFloat(dozenWeight)       || 0;

  if (!qty || !pcRate) return { pcPerBox: "", boxPerCartoon: "", qtyKg: "" };

  const boxes   = Math.ceil(qty / pcRate);
  const cartons = boxRate ? Math.ceil(boxes / boxRate) : "";
  const kg      = dozWt ? ((dozWt / 12) * qty).toFixed(3) : "";

  return {
    pcPerBox:      String(boxes),
    boxPerCartoon: cartons !== "" ? String(cartons) : "",
    qtyKg:         kg,
  };
};

// ─── Searchable dropdown ───────────────────────────────────────────────────
const SearchableDropdown = ({
  id, placeholder, value, options, onSelect,
  searchValue, onSearchChange, isOpen, onOpen, onClose,
  loading = false, disabled = false, getLabel,
}) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose]);

  return (
    <div ref={ref} className="relative">
      <div
        className={`flex items-center border rounded-md overflow-hidden transition
          ${disabled ? "border-gray-200 bg-gray-50 cursor-not-allowed" : "border-gray-300 bg-white hover:border-gray-400"}
          ${isOpen ? "ring-1 ring-gray-400 border-gray-400" : ""}
        `}
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
              <button
                key={i}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onSelect(opt); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-700"
              >
                {getLabel(opt)}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const Label = ({ children }) => (
  <label className="block text-md font-medium text-black mb-2">{children}</label>
);

const AutoInput = ({ value, loading }) => (
  <input
    readOnly
    value={value ?? ""}
    placeholder={loading ? "Loading…" : "Auto"}
    className="w-full border border-gray-200 bg-gray-50 rounded-md px-3 py-2.5 text-md text-gray-600 cursor-default"
  />
);

// ─── Main Component ────────────────────────────────────────────────────────
const AddOrder = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedParty = location.state?.selectedParty || null;

  const [poDate, setPoDate] = useState("");
  const [items, setItems] = useState([createEmptyItem()]);
  const [saving, setSaving] = useState(false);
  const [allItems, setAllItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  useEffect(() => {
    itemBlueprintApi.getAllItems()
      .then((res) => setAllItems(Array.isArray(res.data) ? res.data : []))
      .catch(() => toast.error("Failed to load items"))
      .finally(() => setItemsLoading(false));
    setItemsLoading(true);
  }, []);

  const updateItem = useCallback((index, patch) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }, []);

  // Step 1: item selected → load sizes
  const handleSelectItem = useCallback(async (index, blueprint) => {
    updateItem(index, {
      selectedItem: blueprint,
      selectedSize: null,
      sizes: [], sizesLoading: true,
      pcPerBox: "", boxPerCartoon: "", pcPerCartoon: "", qtyKg: "",
      itemSearch: "", itemDropdownOpen: false,
    });
    try {
      const res = await sizeApi.getSizesByItemId(blueprint.id);
      updateItem(index, { sizes: Array.isArray(res.data) ? res.data : [], sizesLoading: false });
    } catch {
      toast.error("Failed to load sizes");
      updateItem(index, { sizesLoading: false });
    }
  }, [updateItem]);

  // Step 2: size selected → auto-fill from client inventory
  const handleSelectSize = useCallback(async (index, size, currentQtyPc = "") => {
    updateItem(index, {
      selectedSize: size,
      clientInventoryLoading: true,
      pcPerBox: "", boxPerCartoon: "", pcPerCartoon: "", qtyKg: "",
    });

    if (!selectedParty?.id) {
      updateItem(index, { clientInventoryLoading: false });
      return;
    }

    try {
      const res = await clientInventoryApi.getInventoryByClient(
        selectedParty.id, size.id, undefined, 0, 1
      );
      const m = res.data?.data?.[0] ?? null;
      const rawPcPerBox      = m?.pcsPerBox    != null ? String(m.pcsPerBox)    : "";
      const rawBoxPerCartoon = m?.boxPerCarton != null ? String(m.boxPerCarton) : "";
      updateItem(index, {
        clientInventoryLoading: false,
        rawPcPerBox,
        rawBoxPerCartoon,
        pcPerCartoon: m?.pcsPerCarton != null ? String(m.pcsPerCarton) : "",
        // Re-derive using qtyPc that was entered BEFORE size change
        ...computeDerived(
          currentQtyPc,
          rawPcPerBox,
          rawBoxPerCartoon,
          size.dozenWeight
        ),
      });
    } catch {
      updateItem(index, { clientInventoryLoading: false });
    }
  }, [selectedParty, updateItem]);

  const addItem = () => setItems((prev) => [...prev, createEmptyItem()]);
  const removeItem = (idx) =>
    setItems((prev) => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!selectedParty?.id) { toast.error("No party selected"); return; }
    if (!poDate) { toast.error("P/O Date is required"); return; }
    const validItems = items.filter((it) => it.selectedSize);
    if (validItems.length === 0) { toast.error("Select at least one size"); return; }

    setSaving(true);
    try {
      const payload = {
        orderDate: poDate,
        items: validItems.map((it) => ({
          itemSizeId:    it.selectedSize.id,
          plating:       it.finish || null,
          qtyPc:         parseInt(it.qtyPc, 10) || 0,
          qtyKg:         it.qtyKg         !== "" ? parseFloat(it.qtyKg)           : null,
          pcPerBox:      it.pcPerBox       !== "" ? parseInt(it.pcPerBox, 10)      : null,
          boxPerCartoon: it.boxPerCartoon  !== "" ? parseInt(it.boxPerCartoon, 10) : null,
          pcPerCartoon:  it.pcPerCartoon   !== "" ? parseInt(it.pcPerCartoon, 10)  : null,
          stickerQty:    null,
          pendingPc:     null,
          jobActionDone: null,
          platingType:   null,
          jobWorkNo:     null,
        })),
      };

      await axiosInstance.post(`/api/v1/parties/${selectedParty.id}/orders`, payload);
      toast.success("Order placed successfully!");
      navigate("/order");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to place order");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SidebarLayout>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="mb-6">
            <PageHeader
              title="Add New Order"
              action={
                <button
                  type="button"
                  onClick={() => navigate("/order")}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400 hover:bg-gray-50 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              }
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label>Party Name</Label>
              <input
                readOnly
                value={selectedParty?.name || ""}
                className="w-full border border-gray-200 bg-gray-50 rounded-md px-3 py-2.5 text-md text-gray-700 cursor-default"
              />
            </div>
            <div>
              <Label>P/O Date <span className="text-red-400 text-sm">*</span></Label>
              <input
                type="date"
                value={poDate}
                onChange={(e) => setPoDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-md focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Item details header */}
        <div className="flex items-center justify-between">
          <PageHeader title="Item Details" />
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-2 bg-gray-900 text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition text-sm"
          >
            Add Item +
          </button>
        </div>

        {/* Items */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-8">
          {items.map((item, index) => {
            const filtered = allItems.filter((bp) =>
              (bp.itemName || "").toLowerCase().includes((item.itemSearch || "").toLowerCase())
            );

            return (
              <div key={index}>
                {/* Row header */}
                <div className="flex items-center justify-between mb-4">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                  {/* Item Name */}
                  <div>
                    <Label>Item Name</Label>
                    <SearchableDropdown
                      id={`item-${index}`}
                      placeholder="Search & select item…"
                      value={item.selectedItem}
                      options={filtered}
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

                  {/* Size */}
                  <div>
                    <Label>
                      Size
                      {item.sizesLoading && <span className="text-xs text-gray-400 ml-1 font-normal">Loading…</span>}
                    </Label>
                    <select
                      value={item.selectedSize?.id ?? ""}
                      disabled={!item.selectedItem || item.sizesLoading}
                      onChange={(e) => {
                        const sz = item.sizes.find((s) => String(s.id) === e.target.value);
                        if (sz) handleSelectSize(index, sz, item.qtyPc);
                      }}
                      className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-md focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {!item.selectedItem ? "Select item first" : item.sizesLoading ? "Loading…" : "Select size…"}
                      </option>
                      {item.sizes.map((sz) => (
                        <option key={sz.id} value={sz.id}>
                          {sz.sizeInInch}{sz.sizeInMm ? ` (${sz.sizeInMm})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Pcs */}
                  <div>
                    <Label>Pcs.</Label>
                    <input
                      type="number"
                      min="0"
                      value={item.qtyPc}
                      onChange={(e) => {
                        const qtyPc = e.target.value;
                        updateItem(index, {
                          qtyPc,
                          ...computeDerived(
                            qtyPc,
                            item.rawPcPerBox,
                            item.rawBoxPerCartoon,
                            item.selectedSize?.dozenWeight
                          ),
                        });
                      }}
                      placeholder="Enter Pc."
                      className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                    />
                  </div>

                  {/* Finish */}
                  <div>
                    <Label>Finish</Label>
                    <select
                      value={item.finish}
                      onChange={(e) => updateItem(index, { finish: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-md focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white"
                    >
                      <option value="">Select finish…</option>
                      {FINISH_OPTIONS.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  {/* Box Pc — auto */}
                  <div>
                    <Label>Box Pc.</Label>
                    <AutoInput value={item.pcPerBox} loading={item.clientInventoryLoading} />
                  </div>

                  {/* Cartoon — auto */}
                  <div>
                    <Label>Cartoon</Label>
                    <AutoInput value={item.boxPerCartoon} loading={item.clientInventoryLoading} />
                  </div>

                  {/* Qty Kg — auto */}
                  <div>
                    <Label>Qty Kg</Label>
                    <AutoInput value={item.qtyKg} loading={item.clientInventoryLoading} />
                  </div>

                </div>

                {index < items.length - 1 && <hr className="mt-6 border-gray-100" />}
              </div>
            );
          })}

          {/* Actions */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-10 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/order/select")}
              disabled={saving}
              className="px-10 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
};

export default AddOrder;
