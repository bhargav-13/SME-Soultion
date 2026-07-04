import React, { useEffect, useMemo, useState } from "react";
import { ShoppingCart, Search, Plus, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import SidebarLayout from "../../components/SidebarLayout";
import PageHeader from "../../components/PageHeader";
import CartDrawer from "../../components/ClientPortal/CartDrawer";
import { useAuth } from "../../context/AuthContext";
import { clientPortalClientApi } from "../../services/apiService";
import {
  getCart,
  addToCart,
  removeFromCart,
  clearCart,
} from "../../utils/clientShop";

// Native <select> with the default arrow removed and a custom chevron, so
// long option labels (e.g. plating finishes) truncate cleanly instead of
// overlapping the dropdown arrow.
const SelectField = ({ value, onChange, options, getLabel = (o) => o, getValue = (o) => o }) => (
  <div className="relative">
    <select
      value={value}
      onChange={onChange}
      className="w-full appearance-none truncate text-sm border border-gray-300 rounded-lg pl-2 pr-7 py-1.5 focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
    >
      {options.map((opt) => (
        <option key={getValue(opt)} value={getValue(opt)}>
          {getLabel(opt)}
        </option>
      ))}
    </select>
    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
  </div>
);

const UNIT_PCS = "Pcs";
const UNIT_BOX = "Box";
const UNIT_CARTON = "Carton";

// Preferred order shown in the unit dropdown: Carton first, then Box, then Pcs.
const UNIT_ORDER = [UNIT_CARTON, UNIT_BOX, UNIT_PCS];

// Units available for a size — Pcs always; Box/Carton only when their packing is defined.
const unitsForSize = (size) => {
  const pcsPerBox = size?.pcsPerBox || 0;
  const pcsPerCarton = size?.pcsPerCarton || 0;
  return UNIT_ORDER.filter(
    (u) =>
      u === UNIT_PCS ||
      (u === UNIT_BOX && pcsPerBox > 0) ||
      (u === UNIT_CARTON && pcsPerCarton > 0)
  );
};

const ProductSelector = ({ item, onAdd }) => {
  const [sizeId, setSizeId] = useState(item.sizes[0]?.id || "");
  const [plating, setPlating] = useState(item.platings[0] || "");
  const [qty, setQty] = useState("");

  const selectedSize = item.sizes.find((s) => String(s.id) === String(sizeId));
  const pcsPerBox = selectedSize?.pcsPerBox || 0;
  const pcsPerCarton = selectedSize?.pcsPerCarton || 0;

  const unitOptions = unitsForSize(selectedSize);
  // Default to the first available unit (Carton > Box > Pcs).
  const [unit, setUnit] = useState(unitOptions[0] || UNIT_PCS);

  const computeQtyPc = (enteredQty, selectedUnit) => {
    const n = Number(enteredQty) || 0;
    if (selectedUnit === UNIT_BOX) return n * pcsPerBox;
    if (selectedUnit === UNIT_CARTON) return n * pcsPerCarton;
    return n;
  };

  const handleSizeChange = (newSizeId) => {
    setSizeId(newSizeId);
    const newSize = item.sizes.find((s) => String(s.id) === String(newSizeId));
    const avail = unitsForSize(newSize);
    // Keep the chosen unit if still valid, else fall back to the best available.
    if (!avail.includes(unit)) setUnit(avail[0] || UNIT_PCS);
  };

  const handleAdd = () => {
    const enteredQty = Number(qty);
    if (!sizeId) {
      toast.error("Please select a size");
      return;
    }
    if (!plating) {
      toast.error("Please select a plating/finish");
      return;
    }
    if (!enteredQty || enteredQty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    const qtyPc = computeQtyPc(enteredQty, unit);
    onAdd({
      itemId: item.id,
      sizeId: selectedSize?.id,
      itemName: item.itemName,
      category: item.category,
      sizeInInch: selectedSize?.sizeInInch || "",
      sizeInMm: selectedSize?.sizeInMm || "",
      plating,
      qtyPc,
      orderUnit: unit,
      orderQty: enteredQty,
    });
    setQty("");
  };

  const previewPc = computeQtyPc(qty, unit);
  const hasUnitChoice = unitOptions.length > 1;

  return (
    <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
      <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
        <Field label="Size">
          <SelectField
            value={sizeId}
            onChange={(e) => handleSizeChange(e.target.value)}
            options={item.sizes}
            getValue={(s) => s.id}
            getLabel={(s) => `${s.sizeInInch}${s.sizeInMm && s.sizeInMm !== "—" ? ` (${s.sizeInMm})` : ""}`}
          />
        </Field>
        <Field label="Finish">
          <SelectField
            value={plating}
            onChange={(e) => setPlating(e.target.value)}
            options={item.platings}
          />
        </Field>
        {hasUnitChoice && (
          <Field label="Unit">
            <SelectField
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              options={unitOptions}
            />
          </Field>
        )}
        <Field label="Quantity" className={hasUnitChoice ? "" : "col-span-2"}>
          <input
            type="number"
            min="1"
            placeholder="0"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
          />
        </Field>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-gray-500 truncate">
          {unit !== UNIT_PCS && previewPc > 0 ? `= ${previewPc.toLocaleString()} pcs` : " "}
        </span>
        <button
          onClick={handleAdd}
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 active:scale-[0.98] transition"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>
    </div>
  );
};

// A labeled form control used inside the product card's selector grid.
const Field = ({ label, className = "", children }) => (
  <div className={className}>
    <label className="block text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-1">
      {label}
    </label>
    {children}
  </div>
);

const ProductCatalog = () => {
  const { user } = useAuth();
  const username = user?.email;

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState(() => getCart(username));
  const [cartOpen, setCartOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [catalogItems, setCatalogItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        setLoading(true);
        const response = await clientPortalClientApi.getMyCatalog();
        setCatalogItems(response.data || []);
      } catch (error) {
        console.error("Error fetching catalog:", error);
        toast.error(error.response?.data?.message || "Failed to fetch product catalog");
        setCatalogItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, []);

  const categories = useMemo(
    () => [...new Set(catalogItems.map((i) => i.category).filter(Boolean))],
    [catalogItems]
  );

  const filteredItems = useMemo(() => {
    return catalogItems.filter((item) => {
      const matchesCategory = category === "All" || item.category === category;
      const matchesSearch = (item.itemName || "").toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [catalogItems, search, category]);

  const handleAddToCart = (entry) => {
    const updated = addToCart(username, entry);
    setCart(updated);
    toast.success(`${entry.itemName} added to your order`);
  };

  const handleRemove = (cartId) => {
    const updated = removeFromCart(username, cartId);
    setCart(updated);
  };

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    try {
      setSubmitting(true);
      const newOrderRequest = {
        orderDate: new Date().toISOString().slice(0, 10),
        items: cart.map((item) => ({
          itemId: item.itemId,
          sizeId: item.sizeId,
          itemName: item.itemName,
          category: item.category,
          sizeInInch: item.sizeInInch,
          sizeInMm: item.sizeInMm,
          plating: item.plating,
          qtyPc: item.qtyPc,
          qtyKg: item.qtyKg,
        })),
      };
      await clientPortalClientApi.submitOrderRequest(newOrderRequest);
      clearCart(username);
      setCart([]);
      setCartOpen(false);
      toast.success("Order request submitted! Track it from My Orders.");
    } catch (error) {
      console.error("Error submitting order request:", error);
      toast.error(error.response?.data?.message || "Failed to submit order request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SidebarLayout>
      <div className="mx-auto">
        <div className="mb-8">
          <PageHeader
            title="Product Catalog"
            description="Browse available products and place an order request."
            action={
              <button
                onClick={() => setCartOpen(true)}
                className="relative inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                <ShoppingCart className="w-4 h-4" />
                Cart
                {cart.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-gray-900 text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </button>
            }
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full p-4 py-3 border bg-white border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>
          <div className="relative w-full sm:w-64">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full appearance-none border bg-white border-gray-300 rounded-lg p-4 py-3 pr-9 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="text-center text-gray-500 py-10">Loading...</div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-10 text-center text-gray-500">
            No products found
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col hover:shadow-md hover:border-gray-300 transition"
              >
                {item.category && (
                  <span className="self-start mb-2 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    {item.category}
                  </span>
                )}
                <h3 className="text-base font-semibold text-gray-900 leading-snug">{item.itemName}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {item.sizes.length} size{item.sizes.length === 1 ? "" : "s"} ·{" "}
                  {item.platings.length} finish{item.platings.length === 1 ? "" : "es"}
                </p>
                <ProductSelector item={item} onAdd={handleAddToCart} />
              </div>
            ))}
          </div>
        )}
      </div>

      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        onRemove={handleRemove}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </SidebarLayout>
  );
};

export default ProductCatalog;
