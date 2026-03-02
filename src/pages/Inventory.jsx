import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import { Plus, Pencil, Trash2, X, Eye, Search, Check } from "lucide-react";
import SidebarLayout from "../components/SidebarLayout";
import SearchFilter from "../components/SearchFilter";
import StatsCard from "../components/StatsCard";
import PageHeader from "../components/PageHeader";
import PrimaryActionButton from "../components/PrimaryActionButton";
import ConfirmationDialog from "../components/ConfirmationDialog";
import { itemBlueprintApi, sizeApi, inventoryApi, axiosInstance } from "../services/apiService";
import toast from "react-hot-toast";

const columns = [
  { key: "itemName", label: "Item Name", type: "dropdown" },
  { key: "sizeInInch", label: "Size in Inch", type: "suggest" },
  { key: "sizeInMm", label: "In MM", type: "suggest" },
  { key: "dozenWeight", label: "Dozen Wt.", type: "suggest" },
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
  inputType,
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

const Inventory = () => {
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

  useEffect(() => {
    loadAll();
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
            allRows.push(apiRowToTableRow(inv, item.id, sizes));
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

  const handleAddItem = async () => {
    if (!newItemName.trim()) {
      toast.error("Item name is required");
      return;
    }
    try {
      setAddingItem(true);
      await itemBlueprintApi.createItem({ itemName: newItemName.trim() });
      toast.success("Item added successfully!");
      setAddItemDialog(false);
      setNewItemName("");
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
            <select
              value={row._itemId}
              onChange={(e) => handleItemChange(rowIndex, e.target.value)}
              className="w-full h-full bg-transparent text-sm focus:outline-none cursor-pointer px-1"
            >
              <option value="">Select Item</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.itemName}
                </option>
              ))}
            </select>
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
      <div className="max-w-7xl mx-auto">
        <div className="">
          <PageHeader
            title="Item Management"
            description="Add the items, sizes & packing system"
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
            <div className="p-6 text-center text-gray-500">Loading...</div>
          ) : (
            <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
              <div className="max-h-[460px] overflow-auto scrollbar-thin">
                <table className="min-w-[1400px] w-full">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                      {columns.map((col) => (
                        <th
                          key={col.key}
                          className="sticky top-0 z-10 whitespace-nowrap px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200 bg-gray-100"
                        >
                          {col.label}
                        </th>
                      ))}
                      <th className="sticky top-0 z-10 whitespace-nowrap px-3 py-4 text-center text-sm font-semibold text-gray-900 bg-gray-100 w-[80px]">
                        Actions
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
                          {columns.map((col, colIndex) =>
                            renderCell(row, originalIndex, col, colIndex)
                          )}
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
            </div>
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex gap-4 justify-end">
              <button
                onClick={() => {
                  setAddItemDialog(false);
                  setNewItemName("");
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
                              <span className="truncate">{item.itemName || `Item #${item.id}`}</span>
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
    </SidebarLayout>
  );
};

export default Inventory;
