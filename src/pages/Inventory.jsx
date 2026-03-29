import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, X, Eye, Search, Check, ChevronDown } from "lucide-react";
import SidebarLayout from "../components/SidebarLayout";
import SearchFilter from "../components/SearchFilter";
import StatsCard from "../components/StatsCard";
import PageHeader from "../components/PageHeader";
import PrimaryActionButton from "../components/PrimaryActionButton";
import ConfirmationDialog from "../components/ConfirmationDialog";
import BillDropdown from "../components/Bills/BillDropdown";
import { itemBlueprintApi, sizeApi, inventoryApi, axiosInstance, categoryApi, itemApi } from "../services/apiService";
import AddStockDialog from "../components/Inventory/AddStockDialog";
import toast from "react-hot-toast";
import Loader from "../components/Loader";

const columns = [
  { key: "itemName", label: "Item Name", type: "dropdown" },
  { key: "sizeInInch", label: "Size in Inch", type: "suggest" },
  { key: "sizeInMm", label: "In MM", type: "suggest" },
  { key: "dozenWeight", label: "Dozen Wt.", type: "suggest" },
  { key: "stockStatus", label: "Stock Status", type: "status" },
  { key: "pcsPerBox", label: "Pc./Box", type: "number" },
  { key: "boxPerCarton", label: "Box/Carton", type: "number" },
  { key: "pcsPerCarton", label: "Pcs/Carton", type: "number" },
  { key: "cartonWeight", label: "Carton Wt.", type: "number" },
  { key: "sssatinlacq", label: "S.S & Sartin Lacq", type: "number" },
  { key: "antiq", label: "ANTQ", type: "number" },
  { key: "sidegold", label: "Side Gold", type: "number" },
  { key: "zblack", label: "Z-Black.", type: "number" },
  { key: "grblack", label: "Gr. Black.", type: "number" },
  { key: "mattss", label: "Matt S.S", type: "number" },
  { key: "mattantiq", label: "Matt ANTQ", type: "number" },
  { key: "pvdrose", label: "PVD Rose", type: "number" },
  { key: "pvdgold", label: "PVD Gold", type: "number" },
  { key: "pvdblack", label: "PVD Black", type: "number" },
  { key: "rosegold", label: "Rose Gold", type: "number" },
  { key: "clearlacq", label: "Clear Lacq.", type: "number" },
];

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

const numericFields = [
  "pcsPerBox", "boxPerCarton", "pcsPerCarton", "cartonWeight",
  "sssatinlacq", "antiq", "sidegold", "zblack", "grblack",
  "mattss", "mattantiq", "pvdrose", "pvdgold", "pvdblack",
  "rosegold", "clearlacq",
];

const createEmptyRow = () => {
  const row = { _itemId: "", _inventoryId: null, _sizes: [], _isNew: true, _editing: true };
  columns.forEach((col) => {
    row[col.key] = "";
  });
  return row;
};

// Convert API inventory row to table row format
const apiRowToTableRow = (inv, itemId, sizes) => {
  const row = {
    _itemId: String(itemId),
    _inventoryId: inv.id,
    _sizes: sizes || [],
    _isNew: false,
    _editing: false,
  };
  columns.forEach((col) => {
    if (col.key === "itemName") {
      row[col.key] = inv.itemName || "";
    } else {
      row[col.key] = inv[col.key] != null ? String(inv[col.key]) : "";
    }
  });
  return row;
};

// Autocomplete input with portal-based dropdown (renders outside table overflow)
const SuggestInput = ({
  value,
  suggestions,
  onChange,
  onSelect,
  onBlur,
  onKeyDown,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dropdownPos, setDropdownPos] = useState(null);
  const inputRef = useRef(null);

  const filtered = suggestions.filter((s) => {
    const sStr = String(s.label).toLowerCase();
    const vStr = String(value).toLowerCase();
    return sStr.includes(vStr);
  });

  const shouldShow = showSuggestions && filtered.length > 0;

  const updatePosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 240),
      });
    }
  }, []);

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        autoFocus
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowSuggestions(true);
          updatePosition();
        }}
        onFocus={() => {
          setShowSuggestions(true);
          updatePosition();
        }}
        onBlur={() => {
          setTimeout(() => {
            setShowSuggestions(false);
            onBlur();
          }, 180);
        }}
        onKeyDown={onKeyDown}
        className="w-full rounded text-center text-sm focus:outline-none"
      />
      {shouldShow &&
        dropdownPos &&
        ReactDOM.createPortal(
          <div
            style={{
              position: "fixed",
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
              zIndex: 9999,
            }}
            className="bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto"
          >
            {filtered.map((s, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(s);
                  setShowSuggestions(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition"
              >
                <span className="font-medium text-gray-900">{s.label}</span>
                <span className="ml-2 text-xs text-gray-400">
                  {s.display.replace(s.label, "").trim()}
                </span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
};



const TableDropdown = ({ value, options = [], placeholder = "Select...", onSelect, disabled = false }) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const buttonRef = useRef(null);
  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    const handleOutsideClick = (e) => {
      if (buttonRef.current && !buttonRef.current.parentElement?.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={`w-full rounded-md px-2 py-1.5 text-sm bg-white flex items-center justify-between ${
          disabled ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""
        }`}
      >
        <span className={selectedOption ? "text-black" : "text-gray-500"}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && !disabled && position &&
        ReactDOM.createPortal(
          <div
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: position.width,
              zIndex: 9999,
            }}
            className="bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto"
          >
            {options.length === 0 ? (
              <p className="px-4 py-2 text-sm text-gray-400">No options found</p>
            ) : (
              options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelect(option);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition ${
                    String(option.value) === String(value) ? "font-semibold bg-gray-50" : ""
                  }`}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>,
          document.body
        )}
    </div>
  );
};

const Inventory = () => {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [tableData, setTableData] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [editingCell, setEditingCell] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const [addItemDialog, setAddItemDialog] = useState(false);
  const [viewItemsDialog, setViewItemsDialog] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategoryId, setNewItemCategoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [addingItem, setAddingItem] = useState(false);

  // View Items dialog state
  const [viewItemSearch, setViewItemSearch]       = useState("");
  const [editingItemId, setEditingItemId]         = useState(null);
  const [editingItemName, setEditingItemName]     = useState("");
  const [itemActionLoading, setItemActionLoading] = useState(false);
  const [deleteItemTarget, setDeleteItemTarget]   = useState(null); // {id, name}

  const [saving, setSaving] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState({ open: false, rowIndex: null });
  const [deleting, setDeleting] = useState(false);

  // Add Inventory dialog state
  const [addInventoryDialog, setAddInventoryDialog] = useState(false);
  const [invBlueprintSizes, setInvBlueprintSizes]   = useState([]);
  const [addingInventory, setAddingInventory]         = useState(false);

  // Add Stock popup state
  const [stockDialogRow, setStockDialogRow] = useState(null);

  useEffect(() => {
    loadAll();
    loadCategories();
  }, []);

  // Check if there are any dirty (editing) rows that can be saved
  const hasEditingRows = useMemo(() => {
    return tableData.some((row) => row._editing && row._itemId);
  }, [tableData]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const response = await itemBlueprintApi.getAllItems();
      const itemsData = Array.isArray(response.data) ? response.data : [];
      setItems(itemsData);

      // Fetch all stock entries once to compute stock status per row
      let allStockEntries = [];
      try {
        const stockRes = await itemApi.getAllItems(undefined, undefined, 0, 1000);
        const stockPage = stockRes.data;
        allStockEntries = Array.isArray(stockPage?.data)
          ? stockPage.data
          : Array.isArray(stockPage)
          ? stockPage
          : [];
      } catch {
        /* ignore — stock status will show as empty */
      }

      // Fetch inventory for each item
      const allRows = [];
      for (const item of itemsData) {
        try {
          const invResponse = await inventoryApi.getAllInventory(
            Number(item.id), undefined, undefined, undefined, undefined, 0, 1000
          );
          const invData = invResponse.data?.data || invResponse.data || [];
          const invList = Array.isArray(invData) ? invData : [];
          const sizes = item.sizes || [];
          for (const inv of invList) {
            const row = apiRowToTableRow(inv, item.id, sizes);

            // Match stock entry via size to compute stock status
            const inch = (inv.sizeInInch || "").trim();
            const mm = (inv.sizeInMm || "").trim();
            const matchedSize = sizes.find(
              (s) =>
                (s.sizeInInch || "").trim() === inch &&
                (s.sizeInMm || "").trim() === mm
            );
            if (matchedSize?.id) {
              const stockEntry = allStockEntries.find(
                (st) => Number(st.sizeId) === Number(matchedSize.id)
              );
              if (stockEntry) {
                const totalPc = parseFloat(stockEntry.totalPc) || 0;
                const lowWarn = parseFloat(stockEntry.lowStockWarning) || 0;
                if (totalPc <= 0) {
                  row.stockStatus = "OUT_OF_STOCK";
                } else if (lowWarn > 0 && totalPc <= lowWarn) {
                  row.stockStatus = "LOW";
                } else {
                  row.stockStatus = "IN_STOCK";
                }
              }
            }

            allRows.push(row);
          }
        } catch (err) {
          console.error(`Error fetching inventory for item ${item.id}:`, err);
        }
      }

      // Add one empty row at the end for new entry
      allRows.push(createEmptyRow());
      setTableData(allRows);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error(error.response?.data?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await categoryApi.getAllCategories();
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  const handleAddItem = async () => {
    if (!newItemName.trim()) {
      toast.error("Item name is required");
      return;
    }
    if (!newItemCategoryId) {
      toast.error("Please select a category");
      return;
    }
    try {
      setAddingItem(true);
      await itemBlueprintApi.createItem({ itemName: newItemName.trim(), categoryId: Number(newItemCategoryId) });
      toast.success("Item added successfully!");
      setAddItemDialog(false);
      setNewItemName("");
      setNewItemCategoryId("");
      await loadAll();
    } catch (error) {
      console.error("Error adding item:", error);
      toast.error(error.response?.data?.message || "Failed to add item");
    } finally {
      setAddingItem(false);
    }
  };

  const handleItemChange = async (rowIndex, itemId) => {
    const selectedItem = items.find((i) => String(i.id) === String(itemId));
    setTableData((prev) =>
      prev.map((row, idx) => {
        if (idx !== rowIndex) return row;
        return {
          ...row,
          _itemId: itemId,
          _sizes: [],
          itemName: selectedItem?.itemName || "",
          sizeInInch: "",
          sizeInMm: "",
          dozenWeight: "",
        };
      })
    );

    if (!itemId) return;

    try {
      let sizes = selectedItem?.sizes || [];
      if (sizes.length === 0) {
        const response = await sizeApi.getSizesByItemId(Number(itemId));
        sizes = Array.isArray(response.data) ? response.data : [];
      }
      setTableData((prev) =>
        prev.map((row, idx) => {
          if (idx !== rowIndex) return row;
          return { ...row, _sizes: sizes };
        })
      );
    } catch (error) {
      console.error("Error fetching sizes:", error);
    }
  };

  const handleSizeSuggestionSelect = (rowIndex, size) => {
    setTableData((prev) =>
      prev.map((row, idx) => {
        if (idx !== rowIndex) return row;
        return {
          ...row,
          sizeInInch: size.sizeInInch || "",
          sizeInMm: size.sizeInMm || "",
          dozenWeight: size.dozenWeight != null ? String(size.dozenWeight) : "",
        };
      })
    );
  };

  const updateCell = (rowIndex, key, value) => {
    setTableData((prev) =>
      prev.map((row, idx) => (idx === rowIndex ? { ...row, [key]: value } : row))
    );
  };

  const handleCellClick = (rowIndex, colIndex) => {
    const row = tableData[rowIndex];
    if (!row._editing) return;

    const cellId = `${rowIndex}-${colIndex}`;
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

  const handleLastCellTab = () => {
    const nextRowIndex = tableData.length;
    setTableData((prev) => [...prev, createEmptyRow()]);
    setSelectedCell(`${nextRowIndex}-0`);
    setEditingCell(`${nextRowIndex}-0`);
  };

  // Start editing an existing row
  const handleEditRow = (rowIndex) => {
    setTableData((prev) =>
      prev.map((row, idx) =>
        idx === rowIndex ? { ...row, _editing: true, _backup: { ...row } } : row
      )
    );
  };

  // Cancel editing an existing row — restore backup
  const handleCancelEditRow = (rowIndex) => {
    setTableData((prev) =>
      prev.map((row, idx) => {
        if (idx !== rowIndex) return row;
        if (row._isNew) {
          return createEmptyRow();
        }
        const backup = row._backup;
        if (backup) {
          const restored = { ...backup, _editing: false };
          delete restored._backup;
          return restored;
        }
        return { ...row, _editing: false };
      })
    );
    setEditingCell(null);
    setSelectedCell(null);
  };

  // Build payload from a row
  const buildPayload = (row) => {
    const inchVal = (row.sizeInInch || "").trim();
    const mmVal = (row.sizeInMm || "").trim();
    const dozenVal = row.dozenWeight ? parseFloat(row.dozenWeight) : null;

    const payload = {};
    if (inchVal) payload.sizeInInch = inchVal;
    if (mmVal) payload.sizeInMm = mmVal;
    if (dozenVal !== null) payload.dozenWeight = dozenVal;

    numericFields.forEach((field) => {
      if (row[field] !== "" && row[field] !== undefined) {
        payload[field] = ["pcsPerBox", "boxPerCarton", "pcsPerCarton"].includes(field)
          ? parseInt(row[field], 10)
          : parseFloat(row[field]);
      }
    });

    return { payload, inchVal, mmVal, dozenVal };
  };

  // Save all editing rows
  const handleSaveAll = async () => {
    const rowsToSave = tableData
      .map((row, idx) => ({ row, idx }))
      .filter(({ row }) => row._editing && row._itemId);

    if (rowsToSave.length === 0) {
      toast.error("No rows to save. Select an item for each row.");
      return;
    }

    setSaving(true);
    let successCount = 0;
    let errorCount = 0;

    for (const { row } of rowsToSave) {
      try {
        const { payload, inchVal, mmVal, dozenVal } = buildPayload(row);
        const hasSizeData = inchVal && mmVal;

        // If size fields are filled, check existing or create new
        if (hasSizeData) {
          const existingSizes = row._sizes || [];
          const matchingSize = existingSizes.find((s) => {
            const inchMatch = (s.sizeInInch || "").trim() === inchVal;
            const mmMatch = (s.sizeInMm || "").trim() === mmVal;
            const dozenMatch = dozenVal === null
              ? (s.dozenWeight == null || s.dozenWeight === 0)
              : s.dozenWeight === dozenVal;
            return inchMatch && mmMatch && dozenMatch;
          });

          if (!matchingSize) {
            const newSizePayload = { sizeInInch: inchVal, sizeInMm: mmVal };
            if (dozenVal !== null) {
              newSizePayload.dozenWeight = dozenVal;
            }
            await sizeApi.createSize(Number(row._itemId), newSizePayload);
          }
        }

        if (row._inventoryId) {
          await inventoryApi.updateInventory(
            Number(row._itemId),
            Number(row._inventoryId),
            payload
          );
        } else {
          await inventoryApi.createInventory(Number(row._itemId), payload);
        }
        successCount++;
      } catch (error) {
        console.error("Error saving row:", error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} row(s) saved successfully!`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} row(s) failed to save.`);
    }

    await loadAll();
    setSaving(false);
    setEditingCell(null);
    setSelectedCell(null);
  };

  // Delete a row
  const handleDeleteRow = async () => {
    const rowIndex = deleteDialog.rowIndex;
    if (rowIndex == null) return;

    const row = tableData[rowIndex];

    // If it's a new unsaved row, just remove it from the table
    if (row._isNew || !row._inventoryId) {
      setTableData((prev) => {
        const updated = prev.filter((_, idx) => idx !== rowIndex);
        return updated.length === 0 ? [createEmptyRow()] : updated;
      });
      setDeleteDialog({ open: false, rowIndex: null });
      return;
    }

    setDeleting(true);
    try {
      const itemId = Number(row._itemId);
      const invId = Number(row._inventoryId);
      await inventoryApi.deleteInventory(itemId, invId);
      toast.success("Row deleted successfully!");
      await loadAll();
    } catch (error) {
      console.error("Error deleting row:", error);
      toast.error(
        error.response?.data?.message ||
        error.response?.data?.detail ||
        "Failed to delete row."
      );
    } finally {
      setDeleting(false);
      setDeleteDialog({ open: false, rowIndex: null });
    }
  };

  const handleRefresh = () => {
    loadAll();
    setEditingCell(null);
    setSelectedCell(null);
  };

  // ── Add Inventory Dialog handlers ─────────────────────────────────
  const openAddInventoryDialog = () => {
    setInvForm(defaultInvForm);
    setInvBlueprintSizes([]);
    setAddInventoryDialog(true);
  };

  const handleInvBlueprintSelect = async (blueprintId) => {
    setInvForm(prev => ({ ...prev, selectedBlueprintId: blueprintId, sizeInInch: "", sizeInMm: "", dozenWeight: "" }));
    if (!blueprintId) { setInvBlueprintSizes([]); return; }
    try {
      const found = items.find(i => String(i.id) === String(blueprintId));
      let sizes = found?.sizes || [];
      if (sizes.length === 0) {
        const res = await sizeApi.getSizesByItemId(Number(blueprintId));
        sizes = Array.isArray(res.data) ? res.data : [];
      }
      setInvBlueprintSizes(sizes);
    } catch (err) { console.error("Error loading sizes:", err); }
  };

  const handleInvSizeSelect = (size) => {
    setInvForm(prev => ({
      ...prev,
      sizeInInch: size.sizeInInch || "",
      sizeInMm: size.sizeInMm || "",
      dozenWeight: size.dozenWeight != null ? String(size.dozenWeight) : "",
    }));
  };

  const handleSaveInventory = async () => {
    const isNewBlueprint = invForm.blueprintMode === "new";
    if (isNewBlueprint && !invForm.newBlueprintName.trim()) {
      toast.error("Item name is required"); return;
    }
    if (isNewBlueprint && !invForm.newBlueprintCategoryId) {
      toast.error("Please select a category"); return;
    }
    if (!isNewBlueprint && !invForm.selectedBlueprintId) {
      toast.error("Please select a blueprint"); return;
    }
    if (!invForm.sizeInInch.trim() || !invForm.sizeInMm.trim()) {
      toast.error("Size In Inch and Size In MM are required"); return;
    }
    try {
      setAddingInventory(true);
      // 1. Get or create blueprint
      let blueprintId;
      if (isNewBlueprint) {
        const res = await itemBlueprintApi.createItem({
          itemName: invForm.newBlueprintName.trim(),
          categoryId: Number(invForm.newBlueprintCategoryId),
        });
        blueprintId = res.data?.id;
      } else {
        blueprintId = Number(invForm.selectedBlueprintId);
      }
      if (!blueprintId) throw new Error("Blueprint ID missing");

      // 2. Create size if not already exists
      const existingSizes = invBlueprintSizes;
      const inchVal = invForm.sizeInInch.trim();
      const mmVal = invForm.sizeInMm.trim();
      const dozenVal = invForm.dozenWeight ? parseFloat(invForm.dozenWeight) : null;
      const matchingSize = existingSizes.find(s =>
        (s.sizeInInch || "").trim() === inchVal &&
        (s.sizeInMm || "").trim() === mmVal
      );
      if (!matchingSize) {
        const sizePayload = { sizeInInch: inchVal, sizeInMm: mmVal };
        if (dozenVal !== null) sizePayload.dozenWeight = dozenVal;
        await sizeApi.createSize(blueprintId, sizePayload);
      }

      // 3. Build inventory payload
      const payload = {};
      payload.sizeInInch = inchVal;
      payload.sizeInMm = mmVal;
      if (dozenVal !== null) payload.dozenWeight = dozenVal;
      const invNumericFields = [
        "pcsPerBox", "boxPerCarton", "pcsPerCarton", "cartonWeight",
        "sssatinlacq", "antiq", "sidegold", "zblack", "grblack",
        "mattss", "mattantiq", "pvdrose", "pvdgold", "pvdblack",
        "rosegold", "clearlacq",
      ];
      invNumericFields.forEach(field => {
        if (invForm[field] !== "" && invForm[field] !== undefined) {
          payload[field] = ["pcsPerBox", "boxPerCarton", "pcsPerCarton"].includes(field)
            ? parseInt(invForm[field], 10)
            : parseFloat(invForm[field]);
        }
      });

      // 4. Create inventory
      await inventoryApi.createInventory(blueprintId, payload);
      toast.success("Inventory added successfully!");
      setAddInventoryDialog(false);
      setInvForm(defaultInvForm);
      setInvBlueprintSizes([]);
      await loadAll();
    } catch (error) {
      console.error("Error saving inventory:", error);
      toast.error(error.response?.data?.message || "Failed to add inventory");
    } finally {
      setAddingInventory(false);
    }
  };

  // Stock "+" button — open stock popup dialog for this row
  const handleAddStockRow = (row) => {
    setStockDialogRow(row);
  };

  const filteredRows = useMemo(() => {
    return tableData
      .map((row, originalIndex) => ({ ...row, _originalIndex: originalIndex }))
      .filter((row) => {
        const rowText = columns.map((c) => row[c.key] || "").join(" ").toLowerCase();
        const matchesSearch = !searchTerm || rowText.includes(searchTerm.toLowerCase());
        const matchesType = !typeFilter || rowText.includes(typeFilter.toLowerCase());
        return matchesSearch && matchesType;
      });
  }, [searchTerm, tableData, typeFilter]);

  const getSuggestions = (row, colKey) => {
    const sizes = row._sizes || [];
    if (sizes.length === 0) return [];

    const seen = new Set();
    return sizes
      .map((s) => {
        let label = "";
        let display = "";
        if (colKey === "sizeInInch") {
          label = s.sizeInInch || "";
          display = `${s.sizeInInch}  (MM: ${s.sizeInMm || "-"}, Dz: ${s.dozenWeight ?? "-"})`;
        } else if (colKey === "sizeInMm") {
          label = s.sizeInMm || "";
          display = `${s.sizeInMm}  (Inch: ${s.sizeInInch || "-"}, Dz: ${s.dozenWeight ?? "-"})`;
        } else if (colKey === "dozenWeight") {
          label = s.dozenWeight != null ? String(s.dozenWeight) : "";
          display = `${s.dozenWeight ?? "-"}  (Inch: ${s.sizeInInch || "-"}, MM: ${s.sizeInMm || "-"})`;
        }
        return { label, display, size: s };
      })
      .filter((s) => {
        if (!s.label || seen.has(s.label)) return false;
        seen.add(s.label);
        return true;
      });
  };

  const renderCell = (row, rowIndex, col, colIndex) => {
    const cellId = `${rowIndex}-${colIndex}`;
    const isEditing = editingCell === cellId && row._editing;
    const isSelected = selectedCell === cellId;
    const isRowEditable = row._editing;

    // Item Name dropdown
    if (col.type === "dropdown") {
      return (
        <td
          key={col.key}
          className={`h-10 min-w-[140px] px-1 py-1 text-center text-sm text-gray-700 border-r border-gray-200 ${
            isSelected && isRowEditable ? "ring-2 ring-gray-400 ring-inset" : ""
          }`}
          onClick={() => handleCellClick(rowIndex, colIndex)}
        >
          {isRowEditable ? (
            <TableDropdown
              value={row._itemId}
              placeholder="Select Item"
              options={items.map((item) => ({
                value: String(item.id),
                label: item.itemName,
              }))}
              onSelect={(option) => handleItemChange(rowIndex, option.value)}
            />
          ) : (
            <span className="text-gray-700 px-1">{row.itemName || "-"}</span>
          )}
        </td>
      );
    }

    // Suggest type
    if (col.type === "suggest") {
      const suggestions = getSuggestions(row, col.key);

      return (
        <td
          key={col.key}
          className={`h-10 min-w-[120px] px-3 py-1 text-center text-sm text-gray-500 border-r border-gray-200 ${
            isSelected && isRowEditable ? "ring-2 ring-gray-400 ring-inset" : ""
          }`}
          onClick={() => handleCellClick(rowIndex, colIndex)}
        >
          {isEditing ? (
            <SuggestInput
              value={row[col.key]}
              suggestions={suggestions}
              inputType={col.key === "dozenWeight" ? "number" : "text"}
              onChange={(val) => updateCell(rowIndex, col.key, val)}
              onSelect={(s) => handleSizeSuggestionSelect(rowIndex, s.size)}
              onBlur={() => handleCellBlur(cellId)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                  return;
                }
                if (
                  e.key === "Tab" &&
                  !e.shiftKey &&
                  rowIndex === tableData.length - 1 &&
                  colIndex === columns.length - 1
                ) {
                  e.preventDefault();
                  handleLastCellTab();
                }
              }}
            />
          ) : (
            <span className={row[col.key] ? "text-gray-700" : "text-gray-300"}>
              {row[col.key] || "-"}
            </span>
          )}
        </td>
      );
    }

    // Stock status badge cell (read-only)
    if (col.type === "status") {
      const status = row[col.key] || "";
      let badge = null;
      if (status === "IN_STOCK") {
        badge = (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            In Stock
          </span>
        );
      } else if (status === "LOW") {
        badge = (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            Low Stock
          </span>
        );
      } else if (status === "OUT_OF_STOCK") {
        badge = (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
            Out of Stock
          </span>
        );
      }
      return (
        <td
          key={col.key}
          className="h-10 min-w-[110px] px-3 py-1 text-center text-sm border-r border-gray-200"
        >
          {badge || <span className="text-gray-300">-</span>}
        </td>
      );
    }

    // Number input cells
    return (
      <td
        key={col.key}
        className={`h-10 min-w-[84px] px-3 py-1 text-center text-sm text-gray-500 border-r border-gray-200 ${
          isSelected && isRowEditable ? "ring-2 ring-gray-400 ring-inset" : ""
        }`}
        onClick={() => handleCellClick(rowIndex, colIndex)}
      >
        {isEditing ? (
          <input
            autoFocus
            type="number"
            step="any"
            value={row[col.key]}
            onChange={(e) => updateCell(rowIndex, col.key, e.target.value)}
            onBlur={() => handleCellBlur(cellId)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
                return;
              }
              if (
                e.key === "Tab" &&
                !e.shiftKey &&
                rowIndex === tableData.length - 1 &&
                colIndex === columns.length - 1
              ) {
                e.preventDefault();
                handleLastCellTab();
              }
            }}
            className="w-full rounded text-center text-sm focus:outline-none"
          />
        ) : (
          <span className={row[col.key] ? "text-gray-700" : "text-gray-300"}>
            {row[col.key] || "-"}
          </span>
        )}
      </td>
    );
  };

  return (
    <SidebarLayout>
      <div className="mx-auto">
        <div className="">
          <PageHeader
            title="Stock Master"
            description="Manage items, sizes, stock & packing details"
            action={
              <div className="flex items-center gap-2">
                <PrimaryActionButton
                  onClick={() => setViewItemsDialog(true)}
                  icon={Eye}
                  className="border-gray-800 text-black px-4"
                >
                  View Items
                </PrimaryActionButton>
                <PrimaryActionButton
                  onClick={() => setAddItemDialog(true)}
                  icon={Plus}
                  className="border-gray-800 text-black px-4"
                >
                  Add Item
                </PrimaryActionButton>
                <button
                  type="button"
                  onClick={() => navigate("/add-inventory")}
                  className="flex items-center gap-2 bg-gray-900 border border-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 hover:border-gray-700 transition font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Add Inventory
                </button>
              </div>
            }
          />

          <div className="mb-8 mt-6">
            <StatsCard label="Total Items" value={items.length} />
          </div>

          <div className="mt-3">
            <SearchFilter
              searchQuery={searchTerm}
              setSearchQuery={setSearchTerm}
              typeFilter={typeFilter}
              setTypeFilter={setTypeFilter}
              filterOptions={[]}
              filterPlaceholder="Filter"
            />
          </div>

          {loading ? (
            <Loader text="Loading inventory..." />
          ) : (
            <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
              <div className="max-h-[460px] overflow-auto scrollbar-thin">
                <table className="w-max min-w-full table-auto">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                      {columns.map((col) => (
                        <React.Fragment key={col.key}>
                          {col.key === "stockStatus" && (
                            <th className="sticky top-0 z-10 whitespace-normal px-3 py-3 text-center text-sm font-[550] text-gray-900 bg-gray-100 min-w-[70px] border-r border-gray-200">
                              <span className="inline-flex flex-col items-center leading-tight">
                                {splitHeaderLabel("View").map((line, idx) => (
                                  <span key={`view-${idx}`}>{line}</span>
                                ))}
                              </span>
                            </th>
                          )}
                          <th
                            className="sticky top-0 z-10 whitespace-normal px-3 py-3 text-center text-sm font-[550] text-gray-900 border-r border-gray-200 bg-gray-100"
                          >
                            <span className="inline-flex flex-col items-center leading-tight">
                              {splitHeaderLabel(col.label).map((line, idx) => (
                                <span key={`${col.key}-${idx}`}>{line}</span>
                              ))}
                            </span>
                          </th>
                        </React.Fragment>
                      ))}
                      <th className="sticky top-0 z-10 whitespace-normal px-3 py-3 text-center text-sm font-[550] text-gray-900 bg-gray-100 min-w-[86px]">
                        <span className="inline-flex flex-col items-center leading-tight">
                          {splitHeaderLabel("Actions").map((line, idx) => (
                            <span key={`actions-${idx}`}>{line}</span>
                          ))}
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => {
                      const originalIndex = row._originalIndex;
                      return (
                        <tr
                          key={`row-${originalIndex}`}
                          className={`border-b border-gray-200 ${
                            row._editing && !row._isNew
                              ? "bg-blue-50/40"
                              : row._isNew
                              ? "bg-gray-50/30"
                              : "hover:bg-gray-50"
                          }`}
                        >
                                                    {columns.map((col, colIndex) => (
                            <React.Fragment key={`${col.key}-${originalIndex}`}>
                              {col.key === "stockStatus" && (
                                <td className="h-10 px-2 py-1 text-center w-[60px] border-r border-gray-200">
                                  {!row._isNew && !row._editing && row._itemId && (
                                    <button
                                      type="button"
                                      onClick={() => handleAddStockRow(row)}
                                      title="View stock details"
                                      className="p-1 text-gray-500 hover:bg-gray-100 rounded transition"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  )}
                                </td>
                              )}
                              {renderCell(row, originalIndex, col, colIndex)}
                            </React.Fragment>
                          ))}
                          {/* Actions column at the end */}
                          <td className="h-10 px-2 py-1 text-center w-[80px]">
                            <div className="flex items-center justify-center gap-1">
                              {row._editing ? (
                                !row._isNew && (
                                  <button
                                    type="button"
                                    onClick={() => handleCancelEditRow(originalIndex)}
                                    title="Cancel edit"
                                    className="p-1 text-gray-500 hover:bg-gray-100 rounded transition"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleEditRow(originalIndex)}
                                    title="Edit"
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDeleteDialog({ open: true, rowIndex: originalIndex })
                                    }
                                    title="Delete"
                                    className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {filteredRows.length === 0 && !loading && (
            <p className="mt-2 text-xs text-gray-500">No matching rows.</p>
          )}

          <div className="mt-4">
            <p className="text-xs text-gray-500 text-right mb-2">
              Press Tab on last cell to add a new row.
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={saving || !hasEditingRows}
                className={`px-10 py-2 rounded-lg transition text-sm font-medium ${
                  hasEditingRows
                    ? "bg-gray-900 text-white hover:bg-gray-800"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTableData((prev) => [...prev, createEmptyRow()]);
                }}
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
      </div>

      {/* ── Add Inventory Dialog ── */}
      {addInventoryDialog && (() => {
        const isNew = invForm.blueprintMode === "new";
        const stockCols = [
          { key: "pcsPerBox", label: "Pcs/Box" },
          { key: "boxPerCarton", label: "Box/Carton" },
          { key: "pcsPerCarton", label: "Pcs/Carton" },
          { key: "cartonWeight", label: "Carton Wt." },
          { key: "sssatinlacq", label: "S.S & Satin Lacq" },
          { key: "antiq", label: "ANTQ" },
          { key: "sidegold", label: "Side Gold" },
          { key: "zblack", label: "Z-Black" },
          { key: "grblack", label: "Gr. Black" },
          { key: "mattss", label: "Matt S.S" },
          { key: "mattantiq", label: "Matt ANTQ" },
          { key: "pvdrose", label: "PVD Rose" },
          { key: "pvdgold", label: "PVD Gold" },
          { key: "pvdblack", label: "PVD Black" },
          { key: "rosegold", label: "Rose Gold" },
          { key: "clearlacq", label: "Clear Lacq." },
        ];
        return (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Add Inventory</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Create blueprint + size + stock entry in one go</p>
                </div>
                <button type="button" onClick={() => setAddInventoryDialog(false)} className="text-gray-400 hover:text-gray-600 transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

                {/* ── Section 1: Blueprint ── */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">1 · Blueprint</h3>
                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5 text-xs">
                      <button type="button"
                        onClick={() => setInvForm(prev => ({ ...prev, blueprintMode: "existing", selectedBlueprintId: "" }))}
                        className={`px-3 py-1 rounded-md transition font-medium ${!isNew ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
                      >Select Existing</button>
                      <button type="button"
                        onClick={() => setInvForm(prev => ({ ...prev, blueprintMode: "new", selectedBlueprintId: "" }))}
                        className={`px-3 py-1 rounded-md transition font-medium ${isNew ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
                      >Create New</button>
                    </div>
                  </div>
                  {!isNew ? (
                    <select
                      value={invForm.selectedBlueprintId}
                      onChange={e => handleInvBlueprintSelect(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
                    >
                      <option value="">Select item blueprint…</option>
                      {items.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.itemName}{item.category?.name ? ` — ${item.category.name}` : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Item Name <span className="text-red-500">*</span></label>
                        <input
                          type="text" autoFocus
                          value={invForm.newBlueprintName}
                          onChange={e => setInvForm(prev => ({ ...prev, newBlueprintName: e.target.value }))}
                          placeholder="e.g. Butt Hinge"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Category <span className="text-red-500">*</span></label>
                        <select
                          value={invForm.newBlueprintCategoryId}
                          onChange={e => setInvForm(prev => ({ ...prev, newBlueprintCategoryId: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
                        >
                          <option value="">Select category…</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Section 2: Size ── */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">2 · Size</h3>
                  {invBlueprintSizes.length > 0 && (
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Quick-fill from existing sizes</label>
                      <div className="flex flex-wrap gap-1.5">
                        {invBlueprintSizes.map((s, i) => (
                          <button key={i} type="button" onClick={() => handleInvSizeSelect(s)}
                            className={`px-2.5 py-1 text-xs rounded-full border transition ${
                              invForm.sizeInInch === s.sizeInInch && invForm.sizeInMm === s.sizeInMm
                                ? "border-gray-800 bg-gray-900 text-white" : "border-gray-300 text-gray-700 hover:border-gray-500"
                            }`}
                          >
                            {s.sizeInInch} / {s.sizeInMm}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Size In Inch <span className="text-red-500">*</span></label>
                      <input type="text"
                        value={invForm.sizeInInch}
                        onChange={e => setInvForm(prev => ({ ...prev, sizeInInch: e.target.value }))}
                        placeholder="e.g. 3x3/8"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Size In MM <span className="text-red-500">*</span></label>
                      <input type="text"
                        value={invForm.sizeInMm}
                        onChange={e => setInvForm(prev => ({ ...prev, sizeInMm: e.target.value }))}
                        placeholder="e.g. 75x9"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Dozen Weight</label>
                      <input type="number" step="any"
                        value={invForm.dozenWeight}
                        onChange={e => setInvForm(prev => ({ ...prev, dozenWeight: e.target.value }))}
                        placeholder="e.g. 1.2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                      />
                    </div>
                  </div>
                </div>

                {/* ── Section 3: Stock Details ── */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">3 · Stock Details</h3>
                  <div className="grid grid-cols-4 gap-3">
                    {stockCols.map(col => (
                      <div key={col.key}>
                        <label className="block text-xs font-medium text-gray-500 mb-1">{col.label}</label>
                        <input type="number" step="any"
                          value={invForm[col.key]}
                          onChange={e => setInvForm(prev => ({ ...prev, [col.key]: e.target.value }))}
                          placeholder="—"
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm text-center focus:outline-none focus:ring-2 focus:ring-gray-400"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 shrink-0">
                <button type="button"
                  onClick={() => setAddInventoryDialog(false)}
                  className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                >Cancel</button>
                <button type="button"
                  disabled={addingInventory}
                  onClick={handleSaveInventory}
                  className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50"
                >{addingInventory ? "Saving…" : "Save Inventory"}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add Item dialog */}
      {addItemDialog && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Add New Item</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                  placeholder="e.g. Hex Bolt, CSK Screw"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  autoFocus
                />
              </div>
              <div>
                <BillDropdown
                  label="Category"
                  required
                  value={newItemCategoryId}
                  placeholder="Select category…"
                  options={categories.map((cat) => ({
                    value: String(cat.id),
                    label: cat.name,
                  }))}
                  onSelect={(option) => setNewItemCategoryId(String(option.value))}
                />
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex gap-4 justify-end">
              <button
                onClick={() => {
                  setAddItemDialog(false);
                  setNewItemName("");
                  setNewItemCategoryId("");
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleAddItem}
                disabled={addingItem}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition font-medium text-sm disabled:opacity-50"
              >
                {addingItem ? "Adding..." : "Add Item"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Items dialog — search + edit + delete */}
      {viewItemsDialog && (() => {
        const filtered = items.filter(it =>
          (it.itemName || "").toLowerCase().includes(viewItemSearch.toLowerCase())
        );
        return (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 flex flex-col max-h-[80vh]">

              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">
                  All Items
                  <span className="ml-2 text-sm font-normal text-gray-400">({filtered.length})</span>
                </h2>
                <button type="button" onClick={() => { setViewItemsDialog(false); setEditingItemId(null); setViewItemSearch(""); }} className="text-gray-400 hover:text-gray-600 transition">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search */}
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2">
                  <Search className="w-4 h-4 text-gray-400 shrink-0" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search items…"
                    value={viewItemSearch}
                    onChange={e => setViewItemSearch(e.target.value)}
                    className="flex-1 text-sm bg-transparent focus:outline-none text-gray-700 placeholder-gray-400"
                  />
                  {viewItemSearch && (
                    <button type="button" onClick={() => setViewItemSearch("")} className="text-gray-400 hover:text-gray-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Grid of item cards */}
              <div className="overflow-y-auto flex-1 p-4">
                {filtered.length === 0 ? (
                  <p className="py-8 text-sm text-center text-gray-400">No items found.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {filtered.map((item) => {
                      const isEditing = editingItemId === item.id;
                      return (
                        <div key={item.id} className="group relative">
                          {isEditing ? (
                            /* Edit mode card */
                            <div className="border border-blue-400 rounded-lg p-2 bg-blue-50/30 flex flex-col gap-2">
                              <input
                                autoFocus
                                type="text"
                                value={editingItemName}
                                onChange={e => setEditingItemName(e.target.value)}
                                onKeyDown={async e => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    if (!editingItemName.trim()) return;
                                    setItemActionLoading(true);
                                    try {
                                      await axiosInstance.put(`/api/v1/item-blueprints/${item.id}`, { itemName: editingItemName.trim() });
                                      toast.success("Item updated");
                                      setEditingItemId(null);
                                      await loadAll();
                                    } catch { toast.error("Failed to update"); }
                                    finally { setItemActionLoading(false); }
                                  }
                                  if (e.key === "Escape") setEditingItemId(null);
                                }}
                                className="w-full text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white"
                              />
                              <div className="flex gap-1.5 justify-end">
                                <button type="button"
                                  onClick={async () => {
                                    if (!editingItemName.trim()) return;
                                    setItemActionLoading(true);
                                    try {
                                      await axiosInstance.put(`/api/v1/item-blueprints/${item.id}`, { itemName: editingItemName.trim() });
                                      toast.success("Item updated");
                                      setEditingItemId(null);
                                      await loadAll();
                                    } catch { toast.error("Failed to update"); }
                                    finally { setItemActionLoading(false); }
                                  }}
                                  disabled={itemActionLoading}
                                  className="px-2 py-0.5 text-xs bg-gray-800 text-white rounded hover:bg-gray-700 transition disabled:opacity-50"
                                >Save</button>
                                <button type="button" onClick={() => setEditingItemId(null)}
                                  className="px-2 py-0.5 text-xs border border-gray-300 text-gray-600 rounded hover:bg-gray-100 transition"
                                >Cancel</button>
                              </div>
                            </div>
                          ) : (
                            /* Read-only card chip */
                            <div className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 bg-white hover:border-gray-300 hover:shadow-sm transition min-h-[44px] flex items-center justify-between gap-1 cursor-default">
                              <div className="flex flex-col min-w-0">
                                <span className="truncate font-medium">{item.itemName || `Item #${item.id}`}</span>
                                {item.category?.name && (
                                  <span className="text-xs text-gray-400 truncate">{item.category.name}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button type="button" title="Edit"
                                  onClick={() => { setEditingItemId(item.id); setEditingItemName(item.itemName || ""); }}
                                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button type="button" title="Delete"
                                  onClick={() => setDeleteItemTarget({ id: item.id, name: item.itemName })}
                                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-gray-200 flex justify-end">
                <button type="button"
                  onClick={() => { setViewItemsDialog(false); setEditingItemId(null); setViewItemSearch(""); }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition font-medium text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete item confirmation */}
      {deleteItemTarget && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 overflow-hidden">
            <div className="px-6 py-5">
              <h3 className="text-base font-semibold text-gray-900 mb-1">Delete Item</h3>
              <p className="text-sm text-gray-500">
                Are you sure you want to delete <strong>{deleteItemTarget.name}</strong>? This cannot be undone.
              </p>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteItemTarget(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition text-sm font-medium"
              >
                Cancel
              </button>
              <button type="button" disabled={itemActionLoading}
                onClick={async () => {
                  setItemActionLoading(true);
                  try {
                    await axiosInstance.delete(`/api/v1/item-blueprints/${deleteItemTarget.id}`);
                    toast.success("Item deleted");
                    setDeleteItemTarget(null);
                    await loadAll();
                  } catch (err) {
                    toast.error(err?.response?.data?.message || "Failed to delete item");
                  } finally { setItemActionLoading(false); }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium disabled:opacity-50"
              >
                {itemActionLoading ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmationDialog
        isOpen={deleteDialog.open}
        title="Delete Inventory Row"
        message="Are you sure you want to delete this inventory row? This action cannot be undone."
        confirmText={deleting ? "Deleting..." : "Delete"}
        onConfirm={handleDeleteRow}
        onCancel={() => setDeleteDialog({ open: false, rowIndex: null })}
        isDangerous
      />

      <AddStockDialog
        open={!!stockDialogRow}
        onClose={() => setStockDialogRow(null)}
        row={stockDialogRow}
        onSaved={() => loadAll()}
      />
    </SidebarLayout>
  );
};

export default Inventory;

