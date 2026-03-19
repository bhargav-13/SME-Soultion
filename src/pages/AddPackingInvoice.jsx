import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import SidebarLayout from "../components/SidebarLayout";
import PageHeader from "../components/PageHeader";
import toast from "react-hot-toast";
import {
  packingInvoiceApi,
  partyApi,
  itemBlueprintApi,
  sizeApi,
  clientInventoryApi,
} from "../services/apiService";
import { X } from "lucide-react";

const columns = [
  { key: "date", label: "Date", type: "date" },
  { key: "invoiceId", label: "Invoice ID", type: "text" },
  { key: "party", label: "Party", type: "party-select" },
  { key: "itemName", label: "Item Name", type: "item-select" },
  { key: "size", label: "Size", type: "size-select" },
  { key: "acDozWeight", label: "Ac. Doz Weight", type: "auto" },
  { key: "cartoonNo", label: "Cartoon No.", type: "text" },
  { key: "finish", label: "Finish", type: "finish-select" },
  { key: "box", label: "Box", type: "number" },
  { key: "pc", label: "Pc.", type: "number" },
  { key: "totalPc", label: "Total Pc", type: "auto" },
  { key: "scrap", label: "Scrap.", type: "number" },
  { key: "labour", label: "Laboure", type: "auto" },
  { key: "rsKg", label: "Rs/Kg", type: "auto" },
  { key: "boxWeight", label: "Box Weight", type: "number" },
  {
    key: "boxWeightAccDozWeight",
    label: "Box Weight / Ac. Doz Weight",
    type: "auto",
  },
  { key: "billCalDozWeight", label: "Bill Cal. Doz Weight", type: "auto" },
  { key: "ratePc", label: "Rate/Pc.", type: "auto" },
  { key: "totalRs", label: "Total Rs.", type: "auto" },
  { key: "totalKg", label: "Total Kg.", type: "auto" },
  { key: "asPerDozWeight", label: "As. Per Doz Weight", type: "auto" },
  { key: "loss", label: "Loss", type: "auto" },
];

const FINISH_KEY_TO_LABEL = {
  sssatinlacq: "S.S & Sartin Lacq",
  antiq: "ANTQ",
  sidegold: "Side Gold",
  zblack: "Z Black",
  grblack: "GR Black",
  mattss: "Matt SS",
  mattantiq: "Matt ANTQ",
  pvdrose: "PVD Rose",
  pvdgold: "PVD Gold",
  pvdblack: "PVD Black",
  rosegold: "Rose Gold",
  clearlacq: "Clear Lacq.",
};

const FINISH_LABEL_TO_KEY = Object.fromEntries(
  Object.entries(FINISH_KEY_TO_LABEL).map(([k, v]) => [v, k]),
);

const createRow = () => ({
  _partyId: null,
  _sizeId: null,
  _itemId: null,
  _clientInventory: null,
  date: "",
  invoiceId: "",
  party: "",
  cartoonNo: "",
  acDozWeight: "",
  itemName: "",
  size: "",
  finish: "",
  box: "",
  pc: "",
  totalPc: "",
  scrap: "",
  labour: "",
  rsKg: "",
  boxWeight: "",
  boxWeightAccDozWeight: "",
  billCalDozWeight: "",
  ratePc: "",
  totalRs: "",
  totalKg: "",
  asPerDozWeight: "",
  loss: "",
});

const calculatedKeys = new Set([
  "totalPc",
  "rsKg",
  "boxWeightAccDozWeight",
  "billCalDozWeight",
  "ratePc",
  "totalRs",
  "totalKg",
  "asPerDozWeight",
  "loss",
]);

const recalcRow = (row) => {
  const num = (v) => {
    if (v === "" || v == null) return 0;
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  };
  const fmt = (v) => (v === 0 ? "" : parseFloat(v.toFixed(4)));

  const box = num(row.box);
  const pc = num(row.pc);
  const scrap = num(row.scrap);
  const labour = num(row.labour);
  const boxWeight = num(row.boxWeight);
  const acDozWeight = num(row.acDozWeight);

  const totalPc = box * pc;
  const rsKg = scrap + labour;
  const boxWeightAccDozWeight = pc > 0 ? (boxWeight / pc) * 12 : 0;
  const billCalDozWeight = acDozWeight;
  const ratePc = (billCalDozWeight * rsKg) / 12;
  const totalRs = ratePc * totalPc;
  const totalKg = boxWeight * box;
  const asPerDozWeight = (acDozWeight / 12) * totalPc;
  const loss = totalKg - asPerDozWeight;

  return {
    ...row,
    totalPc: fmt(totalPc),
    rsKg: fmt(rsKg),
    boxWeightAccDozWeight: fmt(boxWeightAccDozWeight),
    billCalDozWeight: fmt(billCalDozWeight),
    ratePc: fmt(ratePc),
    totalRs: fmt(totalRs),
    totalKg: fmt(totalKg),
    asPerDozWeight: fmt(asPerDozWeight),
    loss: fmt(loss),
  };
};

const rowToPayload = (row) => {
  const parseNum = (v) => {
    if (v === "" || v == null) return undefined;
    const n = parseFloat(v);
    return isNaN(n) ? undefined : n;
  };

  return {
    invoiceDate: row.date || new Date().toISOString().split("T")[0],
    partyId: row._partyId,
    items: [
      {
        sizeId: row._sizeId,
        finish: row.finish || undefined,
        box: parseNum(row.box),
        pc: parseNum(row.pc),
        totalPc: parseNum(row.totalPc),
        scrap: parseNum(row.scrap),
        laboure: parseNum(row.labour),
        rsKg: parseNum(row.rsKg),
        boxWeight: parseNum(row.boxWeight),
        boxWeightAcDocWeight: parseNum(row.boxWeightAccDozWeight),
        billCalDocWeight: parseNum(row.billCalDozWeight),
        ratePc: parseNum(row.ratePc),
        totalRs: parseNum(row.totalRs),
        totalKg: parseNum(row.totalKg),
        asPerDocWeight: parseNum(row.asPerDozWeight),
        loss: parseNum(row.loss),
      },
    ],
  };
};

const AddPackingInvoice = () => {
  const { id: routeId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isEditMode = Boolean(routeId);
  const editingId = routeId ? Number(routeId) : null;
  const [form, setForm] = useState(() => createRow());
  const [saving, setSaving] = useState(false);
  const [loadingForm, setLoadingForm] = useState(false);
  const [partyOptions, setPartyOptions] = useState([]);
  const [itemOptions, setItemOptions] = useState([]);
  const [sizesByItem, setSizesByItem] = useState({});

  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [partiesRes, itemsRes] = await Promise.all([
          partyApi.getAllParties(),
          itemBlueprintApi.getAllItems(),
        ]);

        const partiesList = Array.isArray(partiesRes.data)
          ? partiesRes.data
          : [];
        setPartyOptions(partiesList);

        const items = Array.isArray(itemsRes.data) ? itemsRes.data : [];
        setItemOptions(items);

        const sizesMap = {};
        await Promise.all(
          items.map(async (item) => {
            try {
              const res = await sizeApi.getSizesByItemId(item.id);
              sizesMap[item.id] = Array.isArray(res.data) ? res.data : [];
            } catch {
              sizesMap[item.id] = [];
            }
          }),
        );
        setSizesByItem(sizesMap);
      } catch {
        toast.error("Failed to load form data");
      }
    };

    loadDropdowns();
  }, []);

  useEffect(() => {
    const prefillForm = async () => {
      if (!isEditMode || !editingId) return;
      setLoadingForm(true);
      try {
        let source = location.state?.invoiceRow || null;
        if (!source) {
          const res = await packingInvoiceApi.getPackingInvoiceById(editingId);
          const inv = res.data;
          const item = inv?.items?.[0] || {};
          const sizeObj = item?.size || null;
          const sizeLabel = sizeObj
            ? `${sizeObj.sizeInInch || ""}${sizeObj.dozenWeight ? " - " + sizeObj.dozenWeight : ""}`
            : "";
          source = {
            id: inv?.id,
            _partyId: inv?.party?.id || null,
            _sizeId: sizeObj?.id || null,
            _itemId: null,
            _clientInventory: null,
            date: inv?.invoiceDate || "",
            invoiceId: inv?.invoiceNo || "",
            party: inv?.party?.name || "",
            cartoonNo: inv?.cartoonNo || "",
            acDozWeight: sizeObj?.dozenWeight ?? "",
            itemName: "",
            size: sizeLabel,
            finish: item?.finish ?? "",
            box: item?.box ?? "",
            pc: item?.pc ?? "",
            totalPc: item?.totalPc ?? "",
            scrap: item?.scrap ?? "",
            labour: item?.laboure ?? "",
            rsKg: item?.rsKg ?? "",
            boxWeight: item?.boxWeight ?? "",
            boxWeightAccDozWeight: item?.boxWeightAcDocWeight ?? "",
            billCalDozWeight: item?.billCalDocWeight ?? "",
            ratePc: item?.ratePc ?? "",
            totalRs: item?.totalRs ?? "",
            totalKg: item?.totalKg ?? "",
            asPerDozWeight: item?.asPerDocWeight ?? "",
            loss: item?.loss ?? "",
          };
        }

        setForm((prev) =>
          recalcRow({
            ...prev,
            ...source,
            _partyId: source?._partyId ?? source?.partyId ?? null,
            _sizeId: source?._sizeId ?? null,
            _itemId: source?._itemId ?? null,
            _clientInventory: null,
          }),
        );
      } catch {
        toast.error("Failed to load packing invoice");
      } finally {
        setLoadingForm(false);
      }
    };

    prefillForm();
  }, [editingId, isEditMode, location.state]);

  useEffect(() => {
    if (!form._sizeId || form._itemId) return;
    for (const item of itemOptions) {
      const sizes = sizesByItem[item.id] || [];
      const matched = sizes.find((s) => Number(s.id) === Number(form._sizeId));
      if (matched) {
        const label = `${matched.sizeInInch || ""}${matched.dozenWeight ? " - " + matched.dozenWeight : ""}`;
        setForm((prev) => ({
          ...prev,
          _itemId: item.id,
          itemName: prev.itemName || item.itemName,
          size: prev.size || label,
          acDozWeight: prev.acDozWeight || matched.dozenWeight || "",
        }));
        break;
      }
    }
  }, [form._sizeId, form._itemId, itemOptions, sizesByItem]);

  const fetchClientInventory = useCallback(async (partyId, sizeId) => {
    if (!partyId || !sizeId) return;
    try {
      const res = await clientInventoryApi.getInventoryByClient(
        partyId,
        sizeId,
      );
      const data = res.data?.data || res.data;
      const inventory = Array.isArray(data) ? data[0] : data;
      setForm((prev) => {
        if (!inventory) return prev;
        const finishKey = FINISH_LABEL_TO_KEY[prev.finish];
        const labourValue =
          finishKey && inventory
            ? (inventory[finishKey] ?? prev.labour)
            : prev.labour;
        return recalcRow({
          ...prev,
          _clientInventory: inventory,
          labour: labourValue,
        });
      });
    } catch {
      // ignore missing inventory
    }
  }, []);

  const handleChange = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      return calculatedKeys.has(key) ? next : recalcRow(next);
    });
  };

  const handleDateChange = async (dateValue) => {
    handleChange("date", dateValue);
    if (!dateValue) return;

    try {
      const res = await packingInvoiceApi.getAllPackingInvoices(
        undefined,
        undefined,
        undefined,
        0,
        200,
      );
      const data = res.data;
      const invoices = Array.isArray(data?.data) ? data.data : [];
      const matching = invoices.filter((inv) => inv.invoiceDate === dateValue);
      if (matching.length === 0) return;

      const latest = [...matching].sort((a, b) => (b.id || 0) - (a.id || 0))[0];
      const scrapFromPrevious = latest?.items?.[0]?.scrap;
      if (scrapFromPrevious == null || scrapFromPrevious === "") return;

      setForm((prev) => {
        const preservedRsKg = prev.rsKg;
        const next = recalcRow({
          ...prev,
          date: dateValue,
          scrap: String(scrapFromPrevious),
        });
        return { ...next, rsKg: preservedRsKg };
      });
    } catch {
      // keep manual date/scrap entry if lookup fails
    }
  };

  const handlePartySelect = (partyName) => {
    const party = partyOptions.find((p) => p.name === partyName);
    setForm((prev) =>
      recalcRow({
        ...prev,
        party: partyName,
        _partyId: party ? party.id : null,
        _clientInventory: null,
        finish: "",
        labour: "",
      }),
    );
    if (party?.id && form._sizeId) {
      fetchClientInventory(party.id, form._sizeId);
    }
  };

  const handleItemSelect = (itemName) => {
    const item = itemOptions.find((i) => i.itemName === itemName);
    setForm((prev) =>
      recalcRow({
        ...prev,
        itemName,
        _itemId: item ? item.id : null,
        size: "",
        _sizeId: null,
        acDozWeight: "",
        finish: "",
        labour: "",
        _clientInventory: null,
      }),
    );
  };

  const handleSizeSelect = (sizeLabel) => {
    const itemSizes = form._itemId ? sizesByItem[form._itemId] || [] : [];
    const size = itemSizes.find((s) => {
      const label = `${s.sizeInInch || ""}${s.dozenWeight ? " - " + s.dozenWeight : ""}`;
      return label === sizeLabel;
    });

    setForm((prev) =>
      recalcRow({
        ...prev,
        size: sizeLabel,
        _sizeId: size ? size.id : null,
        acDozWeight: size?.dozenWeight ?? "",
        finish: "",
        labour: "",
        _clientInventory: null,
      }),
    );

    if (form._partyId && size?.id) {
      fetchClientInventory(form._partyId, size.id);
    }
  };

  const handleFinishSelect = (finishLabel) => {
    setForm((prev) => {
      const finishKey = FINISH_LABEL_TO_KEY[finishLabel];
      const labourValue =
        finishKey && prev._clientInventory
          ? (prev._clientInventory[finishKey] ?? "")
          : "";
      return recalcRow({ ...prev, finish: finishLabel, labour: labourValue });
    });
  };

  const finishOptions = useMemo(() => {
    if (!form._clientInventory) return Object.values(FINISH_KEY_TO_LABEL);
    return Object.entries(FINISH_KEY_TO_LABEL)
      .filter(
        ([key]) =>
          form._clientInventory[key] != null &&
          form._clientInventory[key] !== 0,
      )
      .map(([, label]) => label);
  }, [form._clientInventory]);

  const handleSave = async () => {
    if (!form._partyId) {
      toast.error("Please select a party");
      return;
    }
    if (!form._sizeId) {
      toast.error("Please select a size");
      return;
    }
    if (!form.date) {
      toast.error("Please select a date");
      return;
    }

    setSaving(true);
    try {
      const payload = rowToPayload(form);
      if (isEditMode && editingId) {
        await packingInvoiceApi.updatePackingInvoice(editingId, payload);
        toast.success("Packing invoice updated successfully!");
      } else {
        await packingInvoiceApi.createPackingInvoice(payload);
        toast.success("Packing invoice saved successfully!");
      }
      navigate("/packing-invoice");
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to save packing invoice",
      );
    } finally {
      setSaving(false);
    }
  };

  const renderField = (col) => {
    if (col.type === "date") {
      return (
        <input
          type="date"
          value={form.date}
          onChange={(e) => handleDateChange(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-md focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
        />
      );
    }

    if (col.type === "party-select") {
      return (
        <select
          value={form.party}
          onChange={(e) => handlePartySelect(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
        >
          <option value="">Select Party</option>
          {partyOptions.map((p) => (
            <option key={p.id} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
      );
    }

    if (col.type === "item-select") {
      return (
        <select
          value={form.itemName}
          onChange={(e) => handleItemSelect(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
        >
          <option value="">Select Item</option>
          {itemOptions.map((item) => (
            <option key={item.id} value={item.itemName}>
              {item.itemName}
            </option>
          ))}
        </select>
      );
    }

    if (col.type === "size-select") {
      const itemSizes = form._itemId ? sizesByItem[form._itemId] || [] : [];
      return (
        <select
          value={form.size}
          onChange={(e) => handleSizeSelect(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
        >
          <option value="">
            {form._itemId ? "Select Size" : "Select Item first"}
          </option>
          {itemSizes.map((s) => {
            const label = `${s.sizeInInch || ""}${s.dozenWeight ? " - " + s.dozenWeight : ""}`;
            return (
              <option key={s.id} value={label}>
                {label}
              </option>
            );
          })}
        </select>
      );
    }

    if (col.type === "finish-select") {
      return (
        <select
          value={form.finish}
          onChange={(e) => handleFinishSelect(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
        >
          <option value="">
            {form._clientInventory
              ? "Select Finish"
              : "Select Party & Size first"}
          </option>
          {finishOptions.map((finish) => (
            <option key={finish} value={finish}>
              {finish}
            </option>
          ))}
        </select>
      );
    }

    const isAuto = col.type === "auto";
    return (
      <input
        type={col.type === "number" || col.type === "auto" ? "number" : "text"}
        step={col.type === "number" || col.type === "auto" ? "any" : undefined}
        value={form[col.key] ?? ""}
        onChange={(e) => handleChange(col.key, e.target.value)}
        readOnly={isAuto}
        className={`w-full border rounded-md px-3 py-2.5 text-md focus:outline-none focus:ring-1 focus:ring-gray-400 ${
          isAuto
            ? "border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
            : "border-gray-300 bg-white"
        }`}
      />
    );
  };

  return (
    <SidebarLayout>
      <div className="mx-auto">
        <PageHeader
          title={isEditMode ? "Edit Packing Invoice" : "Add Packing Invoice"}
          description="Fill all fields and save"
          action={
            <button
              type="button"
              onClick={() => navigate("/packing-invoice")}
              className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400 hover:bg-gray-50 transition cursor-pointer"
              aria-label="Close and go back to invoices"
            >
              <X className="w-4 h-4" />
            </button>
          }
        />

        <div className="mt-6 bg-white rounded-lg border border-gray-200 p-5">
          {loadingForm && (
            <p className="text-sm text-gray-500 mb-4">
              Loading invoice data...
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {columns.map((col) => (
              <div key={col.key}>
                <label className="block text-md font-medium text-black mb-2">
                  {col.label}
                </label>
                {renderField(col)}
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-center gap-4">
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
              onClick={() => navigate("/packing-invoice")}
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

export default AddPackingInvoice;
