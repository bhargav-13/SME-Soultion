import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { itemBlueprintApi, inventoryApi, clientInventoryApi } from "../../services/apiService";
import { applyFinish, fallbackRules } from "../../services/pricingRulesApi";

// Editable price fields (client field key + label). Base inventory uses `ss` for S.S.
const PRICE_FIELDS = [
  { key: "sssatinlacq", label: "S.S.", base: "ss" },
  { key: "antiq",       label: "Antq." },
  { key: "sidegold",    label: "Side Gold" },
  { key: "sartinlacq",  label: "Sartin Lacqur" },
  { key: "zblack",      label: "Z Black" },
  { key: "grblack",     label: "Gr. Black" },
  { key: "mattss",      label: "Matt S.S." },
  { key: "mattantiq",   label: "Matt Antq." },
  { key: "pvdrose",     label: "PVD Rose Gold" },
  { key: "pvdgold",     label: "PVD Gold" },
  { key: "pvdblack",    label: "PVD Black" },
  { key: "rosegold",    label: "Rose Gold" },
  { key: "clearlacq",   label: "Clear Lacqur" },
];

const PACKING_FIELDS = [
  { key: "pcsPerBox",    label: "Box / Pcs",            int: true },
  { key: "boxPerCarton", label: "Box / Cartoon",        int: true },
  { key: "pcsPerCarton", label: "Total Pcs / Cartoon",  int: true },
  { key: "cartonWeight", label: "Total Cartoon Weight" },
];

// Finish keys whose value is auto-derived from S.S. (everything except S.S. itself)
const FINISH_KEYS = PRICE_FIELDS.filter((f) => f.key !== "sssatinlacq").map((f) => f.key);

const ALL_KEYS = [...PACKING_FIELDS, ...PRICE_FIELDS].map((f) => f.key);

const emptyForm = () => ALL_KEYS.reduce((acc, k) => ({ ...acc, [k]: "" }), {});

const ClientAddItemDialog = ({ isOpen, clientId, clientName, ssRules, onClose, onAdded }) => {
  const rules = ssRules || fallbackRules();
  const [loading, setLoading] = useState(false);
  const [sizeOptions, setSizeOptions] = useState([]); // [{ sizeId, itemName, sizeInInch, sizeInMm, dozenWeight, pcsWeight, base:{...} }]
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  // Load stock-master sizes + base inventory once when opened
  useEffect(() => {
    if (!isOpen) return;
    setSearch("");
    setSelected(null);
    setForm(emptyForm());

    const load = async () => {
      setLoading(true);
      try {
        const itemsRes = await itemBlueprintApi.getAllItems();
        const items = Array.isArray(itemsRes.data) ? itemsRes.data : [];

        // Base inventory per item (mirrors the Stock Master page approach)
        const invResults = await Promise.allSettled(
          items.map((it) =>
            inventoryApi.getAllInventory(Number(it.id), undefined, undefined, undefined, undefined, 0, 1000)
          )
        );

        const options = [];
        items.forEach((item, i) => {
          const sizes = item.sizes || [];
          const invList =
            invResults[i].status === "fulfilled"
              ? Array.isArray(invResults[i].value.data?.data)
                ? invResults[i].value.data.data
                : Array.isArray(invResults[i].value.data)
                ? invResults[i].value.data
                : []
              : [];
          const invBySize = new Map(
            invList.map((inv) => [
              `${(inv.sizeInInch || "").trim()}|${(inv.sizeInMm || "").trim()}`,
              inv,
            ])
          );

          sizes.forEach((s) => {
            if (!s.id) return;
            const base = invBySize.get(`${(s.sizeInInch || "").trim()}|${(s.sizeInMm || "").trim()}`) || {};
            options.push({
              sizeId: s.id,
              itemName: item.itemName || "",
              sizeInInch: s.sizeInInch || "",
              sizeInMm: s.sizeInMm || "",
              dozenWeight: s.dozenWeight,
              pcsWeight: s.pcsWeight,
              base,
            });
          });
        });
        setSizeOptions(options);
      } catch {
        toast.error("Failed to load stock master sizes");
        setSizeOptions([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sizeOptions.slice(0, 50);
    return sizeOptions
      .filter((o) =>
        `${o.itemName} ${o.sizeInInch} ${o.sizeInMm}`.toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [search, sizeOptions]);

  // Pick a size → pre-fill the form with base (default) values; admin edits afterwards
  const handleSelect = (opt) => {
    setSelected(opt);
    const b = opt.base || {};
    const next = emptyForm();
    PACKING_FIELDS.forEach((f) => {
      if (b[f.key] != null) next[f.key] = String(b[f.key]);
    });
    PRICE_FIELDS.forEach((f) => {
      const baseKey = f.base || f.key;
      if (b[baseKey] != null) next[f.key] = String(b[baseKey]);
    });
    setForm(next);
  };

  const handleField = (key, value) => {
    setForm((prev) => {
      const updated = { ...prev, [key]: value };
      if (key === "sssatinlacq") {
        const ss = parseFloat(value);
        if (!isNaN(ss)) {
          FINISH_KEYS.forEach((f) => {
            const result = applyFinish(ss, rules[f]);
            if (result != null) updated[f] = String(result);
          });
        }
      }
      return updated;
    });
  };

  const handleAdd = async () => {
    if (!clientId || !selected) {
      toast.error("Please select a size");
      return;
    }
    const toNum = (v) => {
      const n = parseFloat(v);
      return isNaN(n) ? undefined : n;
    };
    const toInt = (v) => {
      const n = parseInt(v, 10);
      return isNaN(n) ? undefined : n;
    };
    const payload = { sizeId: selected.sizeId };
    PACKING_FIELDS.forEach((f) => {
      const v = f.int ? toInt(form[f.key]) : toNum(form[f.key]);
      if (v !== undefined) payload[f.key] = v;
    });
    PRICE_FIELDS.forEach((f) => {
      const v = toNum(form[f.key]);
      if (v !== undefined) payload[f.key] = v;
    });

    setSaving(true);
    try {
      await clientInventoryApi.createClientInventory(clientId, payload);
      toast.success("Item added");
      onAdded?.();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to add item");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Add Item</h2>
        <p className="text-sm text-gray-500 mb-4">
          {clientName ? `For ${clientName}. ` : ""}
          Pick a size — packing & prices are pre-filled from stock master. Edit any value, then add.
        </p>

        {/* Size picker */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
          {selected ? (
            <div className="flex items-center justify-between border border-gray-300 rounded-lg px-3 py-2">
              <span className="text-sm text-gray-800">
                <span className="font-medium">{selected.itemName || "-"}</span>
                {"  "}· {selected.sizeInInch || "-"} · {selected.sizeInMm || "-"}
              </span>
              <button
                type="button"
                onClick={() => { setSelected(null); setForm(emptyForm()); }}
                className="text-xs text-blue-600 hover:underline"
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by item or size…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <ul className="mt-1 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                {loading ? (
                  <li className="px-3 py-2 text-sm text-gray-400">Loading sizes…</li>
                ) : filteredOptions.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-gray-400">No sizes found</li>
                ) : (
                  filteredOptions.map((o) => (
                    <li
                      key={o.sizeId}
                      onClick={() => handleSelect(o)}
                      className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 flex justify-between"
                    >
                      <span className="font-medium text-gray-800">{o.itemName || "-"}</span>
                      <span className="text-xs text-gray-500">{o.sizeInInch} · {o.sizeInMm}</span>
                    </li>
                  ))
                )}
              </ul>
            </>
          )}
        </div>

        {/* Editable fields (only after a size is chosen) */}
        {selected && (
          <>
            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Packing</p>
              <div className="grid grid-cols-2 gap-2">
                {PACKING_FIELDS.map((f) => (
                  <label key={f.key} className="text-xs text-gray-600">
                    {f.label}
                    <input
                      type="number"
                      step="any"
                      value={form[f.key]}
                      onChange={(e) => handleField(f.key, e.target.value)}
                      className="mt-0.5 w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Pricing</p>
              <div className="grid grid-cols-2 gap-2">
                {PRICE_FIELDS.map((f) => (
                  <label key={f.key} className="text-xs text-gray-600">
                    {f.label}
                    <input
                      type="number"
                      step="any"
                      value={form[f.key]}
                      onChange={(e) => handleField(f.key, e.target.value)}
                      className="mt-0.5 w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                    />
                  </label>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-gray-400">
                Editing S.S. auto-fills the finish prices. A row appears in the list only when a price
                differs from the base stock.
              </p>
            </div>
          </>
        )}

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={saving || !selected}
            className="px-5 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Adding…" : "Add Item"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientAddItemDialog;
