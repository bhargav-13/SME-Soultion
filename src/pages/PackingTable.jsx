
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, Download, Plus } from "lucide-react";
import SidebarLayout from "../components/SidebarLayout";
import PageHeader from "../components/PageHeader";
import StatsCard from "../components/StatsCard";
import SearchFilter from "../components/SearchFilter";
import {
  packingInvoiceApi,
  partyApi,
  itemBlueprintApi,
  sizeApi,
  clientInventoryApi,
  axiosInstance,
} from "../services/apiService";
import toast from "react-hot-toast";
import Loader from "../components/Loader";
import PrimaryActionButton from "../components/PrimaryActionButton";

const columns = [
  { key: "date", label: "Date", type: "date" },
  { key: "invoiceId", label: "Invoice ID", type: "text" },
  { key: "party", label: "Party", type: "party-select" },
  { key: "cartoonNo", label: "Cartoon No.", type: "text" },
  { key: "acDozWeight", label: "Ac. Doz Weight", type: "auto" },
  { key: "itemName", label: "Item Name", type: "item-select" },
  { key: "size", label: "Size", type: "size-select" },
  { key: "finish", label: "Finish", type: "finish-select" },
  { key: "box", label: "Box", type: "number" },
  { key: "pc", label: "Pc.", type: "number" },
  { key: "totalPc", label: "Total Pc", type: "auto" },
  { key: "scrap", label: "Scrap.", type: "number" },
  { key: "labour", label: "Laboure", type: "auto" },
  { key: "rsKg", label: "Rs/Kg", type: "auto" },
  { key: "boxWeight", label: "Box Weight", type: "number" },
  { key: "boxWeightAccDozWeight", label: "Box Weight / Ac. Doz Weight", type: "auto" },
  { key: "billCalDozWeight", label: "Bill Cal. Doz Weight", type: "auto" },
  { key: "ratePc", label: "Rate/Pc.", type: "auto" },
  { key: "totalRs", label: "Total Rs.", type: "auto" },
  { key: "totalKg", label: "Total Kg.", type: "auto" },
  { key: "asPerDozWeight", label: "As. Per Doz Weight", type: "auto" },
  { key: "loss", label: "Loss", type: "auto" },
];

// Map client inventory API field keys to display labels
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
  Object.entries(FINISH_KEY_TO_LABEL).map(([k, v]) => [v, k])
);

const getColumnWidthClass = (key) => {
  if (key === "party") return "min-w-[160px]";
  if (key === "itemName") return "min-w-[150px]";
  if (key === "size") return "min-w-[150px]";
  if (key === "finish") return "min-w-[150px]";
  if (key === "date") return "min-w-[110px]";
  if (key === "cartoonNo") return "min-w-[95px]";
  return "min-w-[72px]";
};

const splitHeaderLabel = (label, maxChars = 8) => {
  const tokens = String(label || "")
    .replace(/\//g, " / ")
    .trim()
    .split(/\s+/)
    .filter((token) => token !== "/");

  const lines = [];
  let current = "";

  tokens.forEach((token) => {
    if (!current) {
      current = token;
      return;
    }
    const next = `${current} ${token}`;
    if (next.length <= maxChars) {
      current = next;
    } else {
      lines.push(current);
      current = token;
    }
  });

  if (current) lines.push(current);
  return lines.length ? lines : [String(label || "")];
};

// Recalculate all auto fields for a row
// Formulas verified against Excel row 16:
//   H=G*F  K=I+J  M=L/G*12  O=N*K/12  P=O*H  Q=L*F  R=C/12*H  S=Q-R
const recalcRow = (row) => {
  const num = (v) => {
    if (v === "" || v == null) return 0;
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  };
  const fmt = (v) => (v === 0 ? "" : parseFloat(v.toFixed(4)));

  const box = num(row.box);                 // F - Box
  const pc = num(row.pc);                   // G - Pcs
  const scrap = num(row.scrap);             // I - Scrap
  const labour = num(row.labour);           // J - Labour
  const boxWeight = num(row.boxWeight);     // L - Box Weight
  const acDozWeight = num(row.acDozWeight); // C - Actual Doz Weight (from size)

  // H: Total Pc = Box * Pcs
  const totalPc = box * pc;

  // K: Rs/Kg = Scrap + Labour
  const rsKg = scrap + labour;

  // M: Box according Doz Weight = BoxWeight / Pcs * 12
  const boxWeightAccDozWeight = pc > 0 ? (boxWeight / pc) * 12 : 0;

  // N: Bill Cal. Doz Weight = Ac. Doz Weight (auto from size)
  const billCalDozWeight = acDozWeight;

  // O: Rate/Pc = BillCalDozWeight * RsKg / 12
  const ratePc = (billCalDozWeight * rsKg) / 12;

  // P: Total Rs = RatePc * TotalPc
  const totalRs = ratePc * totalPc;

  // Q: Total Kgs = BoxWeight * Box
  const totalKg = boxWeight * box;

  // R: As Per Doz Weight = AcDozWeight / 12 * TotalPc
  //    (verified: 4.300 / 12 * 60 = 21.5)
  const asPerDozWeight = (acDozWeight / 12) * totalPc;

  // S: Loss = TotalKgs - AsPerDozWeight
  //    (verified: 21.6 - 21.5 = 0.100)
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

const formatDate = (value) => {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
};

// Map API response to a flat row matching the original table structure
const apiToRow = (inv) => {
  const item = inv.items?.[0] || {};
  const sizeObj = item.size;
  const sizeLabel = sizeObj
    ? `${sizeObj.sizeInInch || ""}${sizeObj.dozenWeight ? " - " + sizeObj.dozenWeight : ""}`
    : "";
  return {
    id: inv.id,
    _isNew: false,
    _partyId: inv.party?.id || null,
    _sizeId: sizeObj?.id || null,
    _itemId: null, // populated from sizeToItem reverse lookup
    _clientInventory: null, // fetched on demand
    date: inv.invoiceDate || "",
    invoiceId: inv.invoiceNo || "",
    party: inv.party?.name || "",
    cartoonNo: inv.cartoonNo || "",
    acDozWeight: sizeObj?.dozenWeight ?? "",
    itemName: "", // populated from sizeToItem reverse lookup
    size: sizeLabel,
    finish: item.finish ?? "",
    box: item.box ?? "",
    pc: item.pc ?? "",
    totalPc: item.totalPc ?? "",
    scrap: item.scrap ?? "",
    labour: item.laboure ?? "",
    rsKg: item.rsKg ?? "",
    boxWeight: item.boxWeight ?? "",
    boxWeightAccDozWeight: item.boxWeightAcDocWeight ?? "",
    billCalDozWeight: item.billCalDocWeight ?? "",
    ratePc: item.ratePc ?? "",
    totalRs: item.totalRs ?? "",
    totalKg: item.totalKg ?? "",
    asPerDozWeight: item.asPerDocWeight ?? "",
    loss: item.loss ?? "",
  };
};

const createRow = (id) => ({
  id,
  _isNew: true,
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

const PackingInvoice = () => {
  const [rows, setRows] = useState([]);
  const [savedRows, setSavedRows] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selectedCell, setSelectedCell] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  // Dropdown data from API
  const [partyOptions, setPartyOptions] = useState([]);
  const [itemOptions, setItemOptions] = useState([]);
  const [sizesByItem, setSizesByItem] = useState({}); // { itemId: [sizes] }
  const [sizeToItem, setSizeToItem] = useState({}); // { sizeId: { id, name } } reverse lookup

  const todayIso = new Date().toISOString().split("T")[0];

  // Load parties, items, and all sizes from API
  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [partiesRes, itemsRes] = await Promise.all([
          partyApi.getAllParties(),
          itemBlueprintApi.getAllItems(),
        ]);
        const partiesList = Array.isArray(partiesRes.data) ? partiesRes.data : [];
        setPartyOptions(partiesList);

        const items = Array.isArray(itemsRes.data) ? itemsRes.data : [];
        setItemOptions(items);

        // Preload all sizes per item and build reverse lookup
        const sizesMap = {};
        const reverseMap = {};
        await Promise.all(
          items.map(async (item) => {
            try {
              const res = await sizeApi.getSizesByItemId(item.id);
              const sizes = Array.isArray(res.data) ? res.data : [];
              sizesMap[item.id] = sizes;
              sizes.forEach((s) => { reverseMap[s.id] = { id: item.id, name: item.itemName }; });
            } catch { /* skip */ }
          })
        );
        setSizesByItem(sizesMap);
        setSizeToItem(reverseMap);
      } catch {
        toast.error("Failed to load dropdown data");
      }
    };
    loadDropdowns();
  }, []);

  // Fetch client inventory when party + size are selected
  const fetchClientInventory = useCallback(async (partyId, sizeId, rowId) => {
    if (!partyId || !sizeId) return;
    try {
      const res = await clientInventoryApi.getInventoryByClient(partyId, sizeId);
      const data = res.data?.data || res.data;
      const inventory = Array.isArray(data) ? data[0] : data;
      if (inventory) {
        setRows((prev) =>
          prev.map((row) =>
            row.id === rowId ? { ...row, _clientInventory: inventory } : row
          )
        );
      }
    } catch {
      // silently fail — inventory may not exist for this combination
    }
  }, []);

  // Load packing invoices from API
  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await packingInvoiceApi.getAllPackingInvoices(
        undefined,
        undefined,
        undefined,
        0,
        200
      );
      const data = res.data;
      const invoices = Array.isArray(data?.data) ? data.data : [];
      const mapped = invoices.map(apiToRow);
      setRows(mapped);
      setSavedRows(mapped);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load packing invoices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // Enrich existing rows with item info from reverse lookup once sizeToItem is ready
  useEffect(() => {
    if (Object.keys(sizeToItem).length === 0) return;
    setRows((prev) => {
      let changed = false;
      const updated = prev.map((row) => {
        if (row._itemId || !row._sizeId) return row;
        const itemInfo = sizeToItem[row._sizeId];
        if (!itemInfo) return row;
        changed = true;
        return { ...row, _itemId: itemInfo.id, itemName: itemInfo.name };
      });
      return changed ? updated : prev;
    });
  }, [sizeToItem]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesSearch =
        !searchQuery ||
        (row.invoiceId || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (row.party || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (row.size || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (row.finish || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = !typeFilter || row.finish === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [rows, searchQuery, typeFilter]);

  const stats = useMemo(() => {
    return {
      todaysInvoices: rows.filter((row) => row.date === todayIso).length,
      totalInvoices: rows.filter((row) => row.invoiceId).length,
    };
  }, [rows, todayIso]);

  const hasChanges = useMemo(
    () => JSON.stringify(rows) !== JSON.stringify(savedRows),
    [rows, savedRows],
  );

  const updateCell = (rowId, key, value) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const nextRow = { ...row, [key]: value };
        return calculatedKeys.has(key) ? nextRow : recalcRow(nextRow);
      }),
    );
  };

  const handleDateChange = (rowId, dateValue) => {
    setRows((prev) => {
      const rowIndex = prev.findIndex((row) => row.id === rowId);
      if (rowIndex < 0) return prev;

      const currentRow = prev[rowIndex];
      const previousRow = rowIndex > 0 ? prev[rowIndex - 1] : null;
      const shouldAutofillFromPrevious =
        currentRow._isNew &&
        !currentRow.date &&
        dateValue &&
        previousRow &&
        previousRow.date === dateValue;

      let nextRow = { ...currentRow, date: dateValue };

      if (shouldAutofillFromPrevious) {
        const { id: _prevId, _isNew: _prevIsNew, ...copyData } = previousRow;
        nextRow = {
          ...nextRow,
          ...copyData,
          date: dateValue,
        };
      }

      nextRow = recalcRow(nextRow);

      return prev.map((row, idx) => (idx === rowIndex ? nextRow : row));
    });
  };

  const handleAddRow = () => {
    setRows((prev) => [...prev, createRow(Date.now())]);
  };

  // Save all changed rows to API
  const handleSaveAll = async () => {
    // Find rows that changed
    const changedRows = rows.filter((row, idx) => {
      const saved = savedRows[idx];
      return !saved || JSON.stringify(row) !== JSON.stringify(saved);
    });

    if (changedRows.length === 0) return;

    // Validate required fields
    for (const row of changedRows) {
      if (!row._partyId) {
        toast.error(`Please select a party for all rows`);
        return;
      }
      if (!row._sizeId) {
        toast.error(`Please select a size for all rows`);
        return;
      }
      if (!row.date) {
        toast.error(`Please select a date for all rows`);
        return;
      }
    }

    setSaving(true);
    try {
      for (const row of changedRows) {
        const payload = rowToPayload(row);
        if (row._isNew) {
          await packingInvoiceApi.createPackingInvoice(payload);
        } else {
          await packingInvoiceApi.updatePackingInvoice(row.id, payload);
        }
      }
      toast.success("Saved successfully!");
      await loadInvoices();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = () => {
    loadInvoices();
    setSelectedCell(null);
    setEditingCell(null);
  };

  const handleCellClick = (cellId) => {
    if (editingCell === cellId) return;
    if (selectedCell === cellId) {
      setEditingCell(cellId);
      return;
    }
    setSelectedCell(cellId);
    setEditingCell(null);
  };

  const handleCellBlur = (cellId) => {
    setEditingCell(null);
    setSelectedCell(cellId);
  };

  const handleLastCellTab = (event, rowIndex, colIndex, totalRows) => {
    if (
      event.key === "Tab" &&
      !event.shiftKey &&
      rowIndex === totalRows - 1 &&
      colIndex === columns.length - 1
    ) {
      event.preventDefault();
      setRows((prev) => [...prev, createRow(Date.now())]);
      setEditingCell(null);
    }
  };

  // Handle party select — store both name (for display) and id (for API)
  // Also re-fetch inventory if size is already selected
  const handlePartySelect = (rowId, partyName) => {
    const party = partyOptions.find((p) => p.name === partyName);
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const updated = { ...row, party: partyName, _partyId: party ? party.id : null, _clientInventory: null, finish: "", labour: "" };
        return recalcRow(updated);
      })
    );
    // Fetch inventory if size already selected
    if (party?.id) {
      const row = rows.find((r) => r.id === rowId);
      if (row?._sizeId) fetchClientInventory(party.id, row._sizeId, rowId);
    }
  };

  // Handle item select — store item id and name, reset size/finish/labour
  const handleItemSelect = (rowId, itemName) => {
    const item = itemOptions.find((i) => i.itemName === itemName);
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        return recalcRow({
          ...row,
          itemName,
          _itemId: item ? item.id : null,
          size: "",
          _sizeId: null,
          acDozWeight: "",
          finish: "",
          labour: "",
          _clientInventory: null,
        });
      })
    );
  };

  // Handle size select — store both label (for display) and id (for API), then recalc
  // Also fetch client inventory for the party + size combination
  const handleSizeSelect = (rowId, sizeLabel) => {
    const row = rows.find((r) => r.id === rowId);
    const itemSizes = row?._itemId ? (sizesByItem[row._itemId] || []) : [];
    const size = itemSizes.find((s) => {
      const label = `${s.sizeInInch || ""}${s.dozenWeight ? " - " + s.dozenWeight : ""}`;
      return label === sizeLabel;
    });
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? recalcRow({
              ...r,
              size: sizeLabel,
              _sizeId: size ? size.id : null,
              acDozWeight: size?.dozenWeight ?? r.acDozWeight,
              finish: "",
              labour: "",
              _clientInventory: null,
            })
          : r
      )
    );
    // Fetch client inventory
    if (row?._partyId && size?.id) {
      fetchClientInventory(row._partyId, size.id, rowId);
    }
  };

  // Handle finish select — look up the labour value from client inventory
  const handleFinishSelect = (rowId, finishLabel) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const finishKey = FINISH_LABEL_TO_KEY[finishLabel];
        const labourValue = finishKey && row._clientInventory ? (row._clientInventory[finishKey] ?? "") : "";
        return recalcRow({ ...row, finish: finishLabel, labour: labourValue });
      })
    );
  };

  // Download PDF via export API
  const handleDownload = async (row) => {
    if (row._isNew || !row.id) {
      toast.error("Please save the invoice first");
      return;
    }
    setDownloadingId(row.id);
    try {
      const res = await axiosInstance.get(
        `/api/v1/packing-invoices/${row.id}/pdf`,
        {
          responseType: "blob",
          headers: { Accept: "application/pdf,application/json" },
        }
      );
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `packing-invoice-${row.invoiceId || row.id}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("PDF downloaded!");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to download PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  const renderCellValue = (row, col) => {
    if (col.key === "date") {
      return row.date ? (
        formatDate(row.date)
      ) : (
        <span className="inline-flex items-center justify-center text-black">
          <Calendar className="w-4 h-4" />
        </span>
      );
    }
    return row[col.key] || "";
  };

  const renderEditableCell = (
    row,
    col,
    rowIndex,
    colIndex,
    totalRows,
    cellId,
    autoFocusEnabled = true,
  ) => {
    if (col.type === "date") {
      return (
        <input
          autoFocus={autoFocusEnabled}
          type="date"
          value={row.date}
          onChange={(e) => handleDateChange(row.id, e.target.value)}
          onKeyDown={(e) => handleLastCellTab(e, rowIndex, colIndex, totalRows)}
          onBlur={() => handleCellBlur(cellId)}
          className="w-full bg-transparent text-center text-sm focus:outline-none"
        />
      );
    }

    if (col.type === "party-select") {
      return (
        <select
          autoFocus={autoFocusEnabled}
          value={row[col.key]}
          onChange={(e) => handlePartySelect(row.id, e.target.value)}
          onKeyDown={(e) => handleLastCellTab(e, rowIndex, colIndex, totalRows)}
          onBlur={() => handleCellBlur(cellId)}
          className="w-full bg-transparent text-center text-sm focus:outline-none"
        >
          <option value="">Select Party Name</option>
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
          autoFocus={autoFocusEnabled}
          value={row[col.key] || ""}
          onChange={(e) => handleItemSelect(row.id, e.target.value)}
          onKeyDown={(e) => handleLastCellTab(e, rowIndex, colIndex, totalRows)}
          onBlur={() => handleCellBlur(cellId)}
          className="w-full bg-transparent text-center text-sm focus:outline-none"
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
      const itemSizes = row._itemId ? (sizesByItem[row._itemId] || []) : [];
      return (
        <select
          autoFocus={autoFocusEnabled}
          value={row[col.key]}
          onChange={(e) => handleSizeSelect(row.id, e.target.value)}
          onKeyDown={(e) => handleLastCellTab(e, rowIndex, colIndex, totalRows)}
          onBlur={() => handleCellBlur(cellId)}
          className="w-full bg-transparent text-center text-sm focus:outline-none"
        >
          <option value="">{row._itemId ? "Select Size" : "Select Item first"}</option>
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
      // Build finish options from client inventory — only show finishes that have a value
      const inventory = row._clientInventory;
      const finishOptions = inventory
        ? Object.entries(FINISH_KEY_TO_LABEL)
            .filter(([key]) => inventory[key] != null && inventory[key] !== 0)
            .map(([, label]) => label)
        : Object.values(FINISH_KEY_TO_LABEL);
      return (
        <select
          autoFocus={autoFocusEnabled}
          value={row[col.key] || ""}
          onChange={(e) => handleFinishSelect(row.id, e.target.value)}
          onKeyDown={(e) => handleLastCellTab(e, rowIndex, colIndex, totalRows)}
          onBlur={() => handleCellBlur(cellId)}
          className="w-full bg-transparent text-center text-sm focus:outline-none"
        >
          <option value="">{row._clientInventory ? "Select Finish" : "Select Party & Size first"}</option>
          {finishOptions.map((finish) => (
            <option key={finish} value={finish}>
              {finish}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        autoFocus={autoFocusEnabled}
        type={col.type === "number" || col.type === "auto" ? "number" : "text"}
        step={col.type === "number" || col.type === "auto" ? "any" : undefined}
        value={row[col.key]}
        onChange={(e) => updateCell(row.id, col.key, e.target.value)}
        onKeyDown={(e) => handleLastCellTab(e, rowIndex, colIndex, totalRows)}
        onBlur={() => handleCellBlur(cellId)}
        className="w-full bg-transparent text-center text-sm focus:outline-none"
      />
    );
  };

  return (
    <SidebarLayout>
      <div className="mx-auto">
        <PageHeader
          title="Packing Invoice"
          description="Add packing Invoice and other details"
           action={
                        <PrimaryActionButton
                          onClick={() => navigate("/")}
                          icon={Plus}
                        >
                          Add Packing
                        </PrimaryActionButton>
                      }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 mb-4">
          <StatsCard label="Today's Invoices" value={stats.todaysInvoices} />
          <StatsCard label="Total Invoice" value={stats.totalInvoices} />
        </div>

        <SearchFilter
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          filterOptions={["Type"]}
          filterPlaceholder="Type"
        />

        <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
          <div className="max-h-[460px] overflow-auto scrollbar-thin">
            <table className="w-max min-w-full table-auto">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`sticky top-0 z-10 whitespace-normal px-3 py-3 text-center text-sm font-[550] text-gray-900 border-r border-gray-200 bg-gray-100 ${getColumnWidthClass(
                        col.key
                      )}`}
                    >
                      <span className="inline-flex flex-col items-center leading-tight">
                        {splitHeaderLabel(col.label).map((line, idx) => (
                          <span key={`${col.key}-${idx}`}>{line}</span>
                        ))}
                      </span>
                    </th>
                  ))}
                  <th className="sticky top-0 z-10 whitespace-nowrap px-3 py-3 text-center text-sm font-[550] text-gray-900 bg-gray-100 min-w-[92px] border-r border-gray-200">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={columns.length + 1}>
                      <Loader text="Loading invoices..." />
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, rowIndex) => (
                    <tr key={row.id} className="border-b border-gray-200 hover:bg-gray-50">
                      {columns.map((col, colIndex) => {
                        const cellId = `${row.id}-${col.key}`;
                        const isSelected = selectedCell === cellId;
                        const isEditing = editingCell === cellId;
                        const isAlwaysDropdown =
                          col.type === "party-select" ||
                          col.type === "item-select" ||
                          col.type === "size-select" ||
                          col.type === "finish-select";
                        return (
                          <td
                            key={cellId}
                            onClick={() => handleCellClick(cellId)}
                            className={`h-10 px-2 py-1 text-center border-r text-sm text-bllack border-gray-200 cursor-pointer ${
                              getColumnWidthClass(col.key)
                            } ${isSelected ? "ring-2 ring-gray-400 ring-inset" : ""}`}
                          >
                            {isEditing || isAlwaysDropdown
                              ? renderEditableCell(
                                  row,
                                  col,
                                  rowIndex,
                                  colIndex,
                                  filteredRows.length,
                                  cellId,
                                  isEditing,
                                )
                              : renderCellValue(row, col)}
                          </td>
                        );
                      })}
                      <td className="h-12 px-3 py-1 text-center">
                        <button
                          type="button"
                          disabled={downloadingId === row.id || row._isNew}
                          onClick={() => handleDownload(row)}
                          className="inline-flex items-center gap-2 px-3 py-1 text-sm border border-gray-300 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {downloadingId === row.id ? "Downloading..." : "Download"}
                          <Download className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs text-gray-500 text-right mb-2">
            Press Tab on last cell to add a new row.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={!hasChanges || saving}
              className={`px-10 py-2 rounded-lg transition text-sm font-medium ${
                hasChanges && !saving
                  ? "bg-gray-900 text-white hover:bg-gray-800"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={handleAddRow}
              className="flex items-center gap-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Row
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
};

export default PackingInvoice;
