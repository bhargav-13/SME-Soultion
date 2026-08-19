import React, { useState, useEffect, useMemo, useRef, useCallback, useDeferredValue } from "react";
import { normalizeSearch } from "../utils/search";
import ReactDOM from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Boxes,
  Check,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import SidebarLayout from "../components/SidebarLayout";
import { PageBody, PageHeader } from "../components/page-header";
import { StatCard } from "../components/stat-card";
import { ConfirmDialog, ConfirmName } from "../components/confirm-dialog";
import { FormDialog, ViewDialog } from "../components/form-dialog";
import { Field, FieldGrid } from "../components/form-field";
import { EmptyState, ListSkeleton } from "../components/states";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { SearchableSelect } from "../components/ui/searchable-select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { fmtNumber } from "../lib/format";
import { itemBlueprintApi, sizeApi, inventoryApi, axiosInstance, categoryApi, itemApi } from "../services/apiService";
import AddStockDialog from "../components/Inventory/AddStockDialog";
import DebouncedSearchInput from "../components/DebouncedSearchInput";
import ColumnFilter from "../components/ColumnFilter";

// Columns that get an Excel-style header value filter (Doz./item name, Size Inch, Size MM).
const FILTERABLE_KEYS = ["itemName", "sizeInInch", "sizeInMm"];
import PricingFormulaDialog from "../components/Client/PricingFormulaDialog";
import { resolvePricingRules, applyFinish, fallbackRules } from "../services/pricingRulesApi";
import { FINISHES } from "../constants/finishes";
import toast from "react-hot-toast";

const columns = [
  { key: "itemName",    label: "Doz.",                 type: "dropdown" },
  { key: "sizeInInch", label: "Size In INCH",          type: "suggest"  },
  { key: "sizeInMm",   label: "Size In MM",            type: "suggest"  },
  { key: "dozenWeight",label: "Doz. Weight",           type: "suggest"  },
  { key: "pcsWeight",  label: "PCS Weight",            type: "number"   },
  { key: "stockStatus",label: "Stock Status",          type: "status"   },
  { key: "pcsPerBox",      label: "Box / Pcs",              type: "number" },
  { key: "boxPerCarton",   label: "Box / Cartoon",          type: "number" },
  { key: "pcsPerCarton",   label: "Total Pcs / Cartoon",    type: "number" },
  { key: "cartonWeight",   label: "Total Cartoon Weight",   type: "number" },
  { key: "ss",         label: "S.S.",           type: "number" },
  { key: "antiq",      label: "Antq.",          type: "number" },
  { key: "sidegold",   label: "Side Gold",      type: "number" },
  { key: "sartinlacq", label: "Sartin Lacqur",  type: "number" },
  { key: "zblack",     label: "Z Black",        type: "number" },
  { key: "grblack",    label: "Gr. Black",      type: "number" },
  { key: "mattss",     label: "Matt S.S.",      type: "number" },
  { key: "mattantiq",  label: "Matt Antq.",     type: "number" },
  { key: "pvdrose",    label: "PVD Rose Gold",  type: "number" },
  { key: "pvdgold",    label: "PVD Gold",       type: "number" },
  { key: "pvdblack",   label: "PVD Black",      type: "number" },
  { key: "rosegold",   label: "Rose Gold",      type: "number" },
  { key: "clearlacq",  label: "Clear Lacqur",   type: "number" },
];

const splitHeaderLabel = (label, maxChars = 14) => {
  const raw = String(label || "").trim().split(/\s+/);
  const tokens = [];
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === "/" && tokens.length > 0) { tokens[tokens.length - 1] += " /"; }
    else { tokens.push(raw[i]); }
  }

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

/** The sticky header cell, shared by every column so the row can't end up half-pinned. */
const HEADER_CELL =
  "sticky top-0 z-20 whitespace-normal border-r border-line bg-surface-2 px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.03em] text-ink-3";

const numericFields = [
  "pcsPerBox", "boxPerCarton", "pcsPerCarton", "cartonWeight",
  "ss", "antiq", "sidegold", "sartinlacq", "zblack", "grblack",
  "mattss", "mattantiq", "pvdrose", "pvdgold", "pvdblack",
  "rosegold", "clearlacq",
];

const FINISH_KEYS = ["ss","antiq","sidegold","sartinlacq","zblack","grblack","mattss","mattantiq","pvdrose","pvdgold","pvdblack","rosegold","clearlacq"];
const hasFinishData = (row) => row && FINISH_KEYS.some((k) => row[k] !== "" && row[k] != null);

// Format number for display: strip excess decimals, max 3 places
const fmtNum = (val) => {
  if (val === "" || val == null) return "-";
  const n = parseFloat(val);
  if (isNaN(n)) return val || "-";
  return String(Math.round(n * 1000) / 1000);
};

// Finish fields auto-filled from S.S. (all finishes except the S.S. input itself).
// Values come from the resolved global pricing formulas.
const DERIVED_FINISH_KEYS = FINISH_KEYS.filter((k) => k !== "ss");

const createEmptyRow = () => {
  const row = { _itemId: "", _inventoryId: null, _sizes: [], _isNew: true, _editing: true };
  columns.forEach((col) => {
    row[col.key] = "";
  });
  return row;
};

const round3 = (n) => Math.round(n * 1000) / 1000;

// Convert API inventory row to table row format
const apiRowToTableRow = (inv, itemId, sizes) => {
  const row = {
    _itemId: String(itemId),
    _inventoryId: inv.id,
    _sizes: sizes || [],
    _isNew: false,
    _editing: false,
    _createdAt: inv.createdAt || null,
    _updatedAt: inv.updatedAt || null,
  };
  const matchingSize = (sizes || []).find(
    (s) =>
      (s.sizeInInch || "").trim() === (inv.sizeInInch || "").trim() &&
      (s.sizeInMm || "").trim() === (inv.sizeInMm || "").trim()
  );
  columns.forEach((col) => {
    if (col.key === "itemName") {
      row[col.key] = inv.itemName || "";
    } else if (col.key === "pcsWeight") {
      row[col.key] = matchingSize?.pcsWeight != null ? String(round3(matchingSize.pcsWeight)) : "";
    } else {
      row[col.key] = inv[col.key] != null ? String(inv[col.key]) : "";
    }
  });
  return row;
};

// Autocomplete input — local state so typing never re-renders the parent table
const SuggestInput = ({ value: initialValue, suggestions, onChange, onSelect, onBlur, onKeyDown }) => {
  const [localValue, setLocalValue] = useState(initialValue ?? "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dropdownPos, setDropdownPos] = useState(null);
  const inputRef = useRef(null);

  // Sync when parent resets the value (e.g. after a size selection)
  useEffect(() => { setLocalValue(initialValue ?? ""); }, [initialValue]);

  const filtered = suggestions.filter((s) =>
    String(s.label).toLowerCase().includes(String(localValue).toLowerCase())
  );
  const shouldShow = showSuggestions && filtered.length > 0;

  const updatePosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 240) });
    }
  }, []);

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        autoFocus
        type="text"
        value={localValue}
        onChange={(e) => {
          setLocalValue(e.target.value);   // local only — zero parent re-renders
          setShowSuggestions(true);
          updatePosition();
        }}
        onFocus={() => { setShowSuggestions(true); updatePosition(); }}
        onBlur={() => {
          setTimeout(() => {
            setShowSuggestions(false);
            onChange(localValue);          // commit to parent only on blur
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
            className="max-h-48 overflow-y-auto rounded-lg border border-line bg-surface shadow-pop"
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
                className="w-full border-b border-line-2 px-3 py-2 text-left text-[13px] text-ink-2 transition last:border-b-0 hover:bg-surface-2"
              >
                <span className="font-medium text-ink">{s.label}</span>
                <span className="ml-2 text-[11px] text-ink-3">
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



// Number input with local state — typing stays local, parent only updated on blur or SS change
const NumberCellInput = React.memo(function NumberCellInput({ value: initialValue, colKey, rowIndex, onCommit, onSsChange, onBlur, onKeyDown }) {
  const [localVal, setLocalVal] = useState(initialValue ?? "");
  const isFocused = useRef(false);

  // Sync when parent pushes a new value (e.g. SS auto-fill changes antiq),
  // but never override what the user is actively typing in THIS cell.
  useEffect(() => {
    if (!isFocused.current) setLocalVal(initialValue ?? "");
  }, [initialValue]);

  return (
    <input
      autoFocus
      type="number"
      step="any"
      value={localVal}
      onFocus={() => { isFocused.current = true; }}
      onChange={(e) => {
        const v = e.target.value;
        setLocalVal(v);                        // local only — zero parent re-renders
        if (colKey === "ss") onSsChange(rowIndex, v); // SS: update derived fields immediately
      }}
      onBlur={() => {
        isFocused.current = false;
        onCommit(rowIndex, colKey, localVal);  // commit to tableData on blur
        onBlur();
      }}
      onKeyDown={onKeyDown}
      className="w-full rounded text-center text-sm focus:outline-none"
    />
  );
});

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
        className={`flex w-full items-center justify-between gap-1 rounded-md bg-surface px-2 py-1.5 text-[13px] ${
          disabled ? "cursor-not-allowed bg-surface-2 text-ink-3" : ""
        }`}
      >
        <span className={`truncate ${selectedOption ? "text-ink" : "text-ink-3"}`}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown className={`size-4 shrink-0 text-ink-3 transition-transform ${open ? "rotate-180" : ""}`} />
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
            className="max-h-60 overflow-y-auto rounded-lg border border-line bg-surface shadow-pop"
          >
            {options.length === 0 ? (
              <p className="px-4 py-2 text-[13px] text-ink-3">No options found</p>
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
                  className={`w-full px-3.5 py-2 text-left text-[13px] transition-colors hover:bg-surface-2 ${
                    String(option.value) === String(value) ? "bg-primary-soft font-semibold text-primary" : "text-ink-2"
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

// Memoized row — only re-renders when its own row data or cell selection changes
const MemoRow = React.memo(function MemoRow({ row, originalIndex, editingCol, selectedCol, renderCell, handleAddStockRow, handleCancelEditRow, handleEditRow, setDeleteDialog, finishExpanded }) {
  // A row that has been touched since it was created is tinted, so an operator scanning the sheet
  // can see at a glance which rows carry edited finish prices.
  const rowBg = row._editing && !row._isNew && hasFinishData(row._backup || row)
    ? "bg-warning-soft"
    : row._isNew
    ? "bg-primary-soft/40"
    : !row._editing && row._updatedAt && row._createdAt && row._updatedAt !== row._createdAt && hasFinishData(row)
    ? "bg-warning-soft"
    : "hover:bg-surface-2";

  // The pinned Actions column needs an opaque fill of its own — `inherit` would be transparent on
  // the untinted rows and the columns scrolling underneath would read straight through it.
  const stickyBg = rowBg.startsWith("hover:") ? "bg-surface" : rowBg;

  return (
    <tr className={`border-b border-line-2 ${rowBg}`}>
      {columns.map((col, colIndex) => {
        if (!finishExpanded && FINISH_KEYS.includes(col.key)) return null;
        return (
          <React.Fragment key={`${col.key}-${originalIndex}`}>
            {col.key === "stockStatus" && (
              <td className="h-10 w-[60px] border-r border-line-2 px-2 py-1 text-center">
                {!row._isNew && !row._editing && row._itemId && (
                  <button
                    type="button"
                    onClick={() => handleAddStockRow(row)}
                    title="View stock details"
                    className="rounded-md p-1 text-ink-3 transition-colors hover:bg-line-2 hover:text-ink"
                  >
                    <Eye className="size-4" />
                  </button>
                )}
              </td>
            )}
            {col.key === "ss" && <td className="h-10 border-r border-line-2 px-1 py-1" />}
            {renderCell(row, originalIndex, col, colIndex, editingCol === colIndex, selectedCol === colIndex)}
          </React.Fragment>
        );
      })}
      {!finishExpanded && <td className="h-10 border-r border-line-2 px-1 py-1" />}
      <td
        className={`sticky right-0 z-10 h-10 w-[80px] px-2 py-1 text-center shadow-[-6px_0_10px_-8px_rgb(16_24_32_/_0.35)] ${stickyBg}`}
      >
        <div className="flex items-center justify-center gap-0.5">
          {row._editing ? (
            !row._isNew && (
              <button
                type="button"
                onClick={() => handleCancelEditRow(originalIndex)}
                title="Cancel edit"
                className="rounded-md p-1 text-ink-3 transition-colors hover:bg-line-2 hover:text-ink"
              >
                <X className="size-4" />
              </button>
            )
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleEditRow(originalIndex)}
                title="Edit"
                className="rounded-md p-1 text-primary transition-colors hover:bg-primary-soft"
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setDeleteDialog({ open: true, rowIndex: originalIndex })}
                title="Delete"
                className="rounded-md p-1 text-danger transition-colors hover:bg-danger-soft"
              >
                <Trash2 className="size-4" />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
});

const Inventory = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState(null); // { id, name }

  const [tableData, setTableData] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [formulaCell, setFormulaCell] = useState(null); // { rowIndex, key, label }
  // Refs so callbacks can read current values without becoming unstable
  const editingCellRef = useRef(null);
  const selectedCellRef = useRef(null);
  const _setEditingCell = useCallback((v) => { editingCellRef.current = v; setEditingCell(v); }, []);
  const _setSelectedCell = useCallback((v) => { selectedCellRef.current = v; setSelectedCell(v); }, []);

  const [searchTerm, setSearchTerm] = useState("");
  // Deferred copy keeps typing responsive; the (expensive) table filter runs against this.
  const deferredSearchTerm = useDeferredValue(searchTerm);
  // Excel-style per-column value filters: { [colKey]: Set<value> } (absent key = no filter).
  const [columnFilters, setColumnFilters] = useState({});
  const setColFilter = useCallback((key, sel) => {
    setColumnFilters((prev) => {
      const next = { ...prev };
      if (sel == null) delete next[key];
      else next[key] = sel;
      return next;
    });
  }, []);
  const [stockFilter, setStockFilter] = useState("ALL");

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
  const [editingItemCategoryId, setEditingItemCategoryId] = useState("");
  const [itemActionLoading, setItemActionLoading] = useState(false);
  const [deleteItemTarget, setDeleteItemTarget]   = useState(null); // {id, name}
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  const [saving, setSaving] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState({ open: false, rowIndex: null });
  const [deleting, setDeleting] = useState(false);

  // Add Inventory dialog state
  const [addInventoryDialog, setAddInventoryDialog] = useState(false);
  const [invBlueprintSizes, setInvBlueprintSizes]   = useState([]);
  const [addingInventory, setAddingInventory]         = useState(false);

  // Add Stock popup state
  const [stockDialogRow, setStockDialogRow] = useState(null);

  // Finish columns collapse/expand
  const [finishExpanded, setFinishExpanded] = useState(false);

  // Import Excel (Stock Master) state
  const [importFile, setImportFile] = useState(null);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef(null);

  // Global finish-price formulas (used to auto-fill finishes when S.S. changes).
  // Kept in a ref so the memoized handleSsChange always reads the latest without re-binding.
  const [isFormulaOpen, setIsFormulaOpen] = useState(false);
  const ssRulesRef = useRef(fallbackRules());

  const loadRules = useCallback(async () => {
    ssRulesRef.current = await resolvePricingRules(null, null);
  }, []);

  useEffect(() => {
    loadAll();
    loadCategories();
    loadRules();
    if (location.state?.categoryId) {
      setCategoryFilter({ id: location.state.categoryId, name: location.state.categoryName });
    }
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

      // Fetch all inventory in parallel (one request per item simultaneously)
      const stockBySize = new Map(allStockEntries.map((s) => [Number(s.sizeId), s]));
      const invResults = await Promise.allSettled(
        itemsData.map((item) =>
          inventoryApi.getAllInventory(Number(item.id), undefined, undefined, undefined, undefined, 0, 1000)
        )
      );

      const allRows = [];
      itemsData.forEach((item, i) => {
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
          invList.map((inv) => [`${(inv.sizeInInch || "").trim()}|${(inv.sizeInMm || "").trim()}`, inv])
        );

        for (const size of sizes) {
          const inch = (size.sizeInInch || "").trim();
          const mm = (size.sizeInMm || "").trim();
          const matchingInv = invBySize.get(`${inch}|${mm}`);

          let row;
          if (matchingInv) {
            row = apiRowToTableRow(matchingInv, item.id, sizes);
          } else {
            row = { _itemId: String(item.id), _inventoryId: null, _sizes: sizes, _isNew: false, _editing: false };
            columns.forEach((col) => {
              if (col.key === "itemName") row[col.key] = item.itemName || "";
              else if (col.key === "sizeInInch") row[col.key] = size.sizeInInch || "";
              else if (col.key === "sizeInMm") row[col.key] = size.sizeInMm || "";
              else if (col.key === "dozenWeight") row[col.key] = size.dozenWeight != null ? String(size.dozenWeight) : "";
              else if (col.key === "pcsWeight") row[col.key] = size.pcsWeight != null ? String(round3(size.pcsWeight)) : "";
              else row[col.key] = "";
            });
          }

          if (size.id) {
            const stockEntry = stockBySize.get(Number(size.id));
            if (stockEntry) {
              const totalPc = parseFloat(stockEntry.totalPc) || 0;
              const lowWarn = parseFloat(stockEntry.lowStockWarning) || 0;
              row.stockStatus = totalPc <= 0 ? "OUT_OF_STOCK" : lowWarn > 0 && totalPc <= lowWarn ? "LOW" : "IN_STOCK";
            }
          }

          allRows.push(row);
        }

        // Edge case: inventory with no matching size
        for (const inv of invList) {
          const key = `${(inv.sizeInInch || "").trim()}|${(inv.sizeInMm || "").trim()}`;
          if (!sizes.some((s) => `${(s.sizeInInch || "").trim()}|${(s.sizeInMm || "").trim()}` === key)) {
            allRows.push(apiRowToTableRow(inv, item.id, sizes));
          }
        }
      });

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

  const handleSizeSuggestionSelect = useCallback((rowIndex, size) => {
    setTableData((prev) =>
      prev.map((row, idx) => {
        if (idx !== rowIndex) return row;
        return { ...row, sizeInInch: size.sizeInInch || "", sizeInMm: size.sizeInMm || "", dozenWeight: size.dozenWeight != null ? String(size.dozenWeight) : "", pcsWeight: size.pcsWeight != null ? String(round3(size.pcsWeight)) : "" };
      })
    );
  }, []);

  const handleSsChange = useCallback((rowIndex, ssValue) => {
    setTableData((prev) =>
      prev.map((row, idx) => {
        if (idx !== rowIndex) return row;
        const updated = { ...row, ss: ssValue };
        const ssNum = parseFloat(ssValue);
        if (!isNaN(ssNum) && ssValue !== "") {
          DERIVED_FINISH_KEYS.forEach((field) => {
            const result = applyFinish(ssNum, ssRulesRef.current[field]);
            if (result != null) updated[field] = String(result);
          });
        }
        return updated;
      })
    );
  }, []);

  const updateCell = useCallback((rowIndex, key, value) => {
    setTableData((prev) =>
      prev.map((row, idx) => (idx === rowIndex ? { ...row, [key]: value } : row))
    );
  }, []);

  const handleCellClick = useCallback((rowIndex, colIndex, rowEditing) => {
    if (!rowEditing) return;
    const col = columns[colIndex];
    const cellId = `${rowIndex}-${colIndex}`;
    setFormulaCell({ rowIndex, key: col.key, label: col.label });
    if (editingCellRef.current === cellId) return;
    if (selectedCellRef.current === cellId) {
      _setEditingCell(cellId);
      return;
    }
    _setSelectedCell(cellId);
    _setEditingCell(null);
  }, [_setEditingCell, _setSelectedCell]);

  const handleCellDoubleClick = useCallback((rowIndex, colIndex) => {
    const col = columns[colIndex];
    if (!col || col.type === "readonly" || col.type === "status") return;
    setTableData((prev) =>
      prev.map((row, idx) =>
        idx === rowIndex && !row._editing
          ? { ...row, _editing: true, _backup: { ...row } }
          : row
      )
    );
    const cellId = `${rowIndex}-${colIndex}`;
    _setEditingCell(cellId);
    _setSelectedCell(cellId);
    setFormulaCell({ rowIndex, key: col.key, label: col.label });
  }, [_setEditingCell, _setSelectedCell]);

  const handleCellBlur = useCallback((cellId) => {
    _setEditingCell(null);
    _setSelectedCell(cellId);
  }, [_setEditingCell, _setSelectedCell]);

  const handleLastCellTab = () => {
    const nextRowIndex = tableData.length;
    setTableData((prev) => [...prev, createEmptyRow()]);
    _setSelectedCell(`${nextRowIndex}-0`);
    _setEditingCell(`${nextRowIndex}-0`);
  };

  const handleEditRow = useCallback((rowIndex) => {
    setTableData((prev) =>
      prev.map((row, idx) =>
        idx === rowIndex ? { ...row, _editing: true, _backup: { ...row } } : row
      )
    );
  }, []);

  const handleCancelEditRow = useCallback((rowIndex) => {
    setTableData((prev) =>
      prev.map((row, idx) => {
        if (idx !== rowIndex) return row;
        if (row._isNew) return createEmptyRow();
        const backup = row._backup;
        if (backup) { const restored = { ...backup, _editing: false }; delete restored._backup; return restored; }
        return { ...row, _editing: false };
      })
    );
    _setEditingCell(null);
    _setSelectedCell(null);
    setFormulaCell(null);
  }, [_setEditingCell, _setSelectedCell]);

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
    // Sizes written during this save, so the row's cached `_sizes` can be refreshed without a
    // full re-fetch (the next edit compares against them to decide whether to PUT again).
    const touchedSizes = [];

    for (const { row } of rowsToSave) {
      try {
        const { payload, inchVal, mmVal, dozenVal } = buildPayload(row);
        const hasSizeData = inchVal && mmVal;
        const rawPcsWeight = row.pcsWeight;
        const parsedPcsWeight =
          rawPcsWeight === "" || rawPcsWeight == null ? null : parseFloat(rawPcsWeight);
        const pcsWeightVal = Number.isNaN(parsedPcsWeight) ? null : parsedPcsWeight;

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

          // PCS weight belongs to the size, not to this inventory row, so it goes to the size
          // endpoint. That also means it is shared: every client price sheet reads the same
          // size, so changing it here changes it for all of them — which is the intent.
          const sizePayload = { sizeInInch: inchVal, sizeInMm: mmVal };
          if (dozenVal !== null) sizePayload.dozenWeight = dozenVal;
          if (pcsWeightVal !== null) sizePayload.pcsWeight = pcsWeightVal;

          if (!matchingSize) {
            const created = await sizeApi.createSize(Number(row._itemId), sizePayload);
            if (created?.data?.id) touchedSizes.push({ rowKey: row, size: created.data });
          } else if (round3(matchingSize.pcsWeight ?? 0) !== round3(pcsWeightVal ?? 0)) {
            const updated = await sizeApi.updateSize(
              Number(row._itemId),
              Number(matchingSize.id),
              sizePayload,
            );
            touchedSizes.push({ rowKey: row, size: updated?.data || { ...matchingSize, pcsWeight: pcsWeightVal } });
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

    // Mark saved rows as non-editing instead of re-fetching everything
    const sizeByRow = new Map(touchedSizes.map(({ rowKey, size }) => [rowKey, size]));
    setTableData((prev) =>
      prev.map((row) => {
        if (!(row._editing && row._itemId)) return row;
        const saved = sizeByRow.get(row);
        if (!saved) return { ...row, _editing: false };
        const others = (row._sizes || []).filter((s) => String(s.id) !== String(saved.id));
        return { ...row, _editing: false, _sizes: [...others, saved] };
      })
    );
    setSaving(false);
    _setEditingCell(null);
    _setSelectedCell(null);
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
      setTableData((prev) => {
        const updated = prev.filter((_, idx) => idx !== rowIndex);
        return updated.length === 0 ? [createEmptyRow()] : updated;
      });
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
    _setEditingCell(null);
    _setSelectedCell(null);
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
        "ss", "antiq", "sidegold", "sartinlacq", "zblack", "grblack",
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

  // ── Import Stock Master Excel handlers ─────────────────────────────
  const handleImportFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportConfirmOpen(true);
  };

  const handleConfirmImport = async () => {
    if (!importFile || importing) return;
    setImporting(true);
    try {
      const res = await itemBlueprintApi.importItemBlueprints(importFile);
      const result = res.data || {};
      toast.success(
        result.message ||
          `Imported ${result.itemsCreated ?? 0} items with ${result.sizesCreated ?? 0} sizes`
      );
      setImportConfirmOpen(false);
      setImportFile(null);
      if (importInputRef.current) importInputRef.current.value = "";
      await loadAll();
    } catch (error) {
      console.error("Error importing stock master:", error);
      toast.error(
        error.response?.data?.message ||
          error.response?.data?.detail ||
          "Failed to import stock master excel"
      );
    } finally {
      setImporting(false);
    }
  };

  const handleCancelImport = () => {
    setImportConfirmOpen(false);
    setImportFile(null);
    if (importInputRef.current) importInputRef.current.value = "";
  };

  // Distinct values per filterable column, for the Excel-style header dropdowns.
  const columnDistinctValues = useMemo(() => {
    const sets = {};
    FILTERABLE_KEYS.forEach((k) => (sets[k] = new Set()));
    for (const row of tableData) {
      if (row._isNew) continue;
      FILTERABLE_KEYS.forEach((k) => sets[k].add(row[k] != null ? String(row[k]) : ""));
    }
    const out = {};
    FILTERABLE_KEYS.forEach((k) => {
      out[k] = Array.from(sets[k]).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
      );
    });
    return out;
  }, [tableData]);

  // Only indices — row objects stay stable references from tableData (enables React.memo on rows)
  const filteredIndices = useMemo(() => {
    // Space-insensitive matching (e.g. "3.1*1.1" matches "3.1 * 1.1").
    const term = normalizeSearch(deferredSearchTerm);
    const activeFilterKeys = Object.keys(columnFilters);
    const result = [];
    for (let idx = 0; idx < tableData.length; idx++) {
      const row = tableData[idx];
      if (row._isNew) { result.push(idx); continue; }
      if (term) {
        const rowText = normalizeSearch(columns.map((c) => row[c.key] || "").join(" "));
        if (!rowText.includes(term)) continue;
      }
      // Excel-style column value filters
      let passColFilters = true;
      for (const key of activeFilterKeys) {
        const sel = columnFilters[key];
        const v = row[key] != null ? String(row[key]) : "";
        if (!sel.has(v)) { passColFilters = false; break; }
      }
      if (!passColFilters) continue;
      if (stockFilter === "IN_STOCK" && row.stockStatus !== "IN_STOCK") continue;
      else if (stockFilter === "LOW" && row.stockStatus !== "LOW") continue;
      else if (stockFilter === "OUT_OF_STOCK" && row.stockStatus !== "OUT_OF_STOCK") continue;
      else if (stockFilter === "NO_ENTRY" && row.stockStatus) continue;
      if (categoryFilter) {
        const item = items.find((i) => String(i.id) === String(row._itemId));
        if (!item || (item?.category?.id !== categoryFilter.id && item?.categoryId !== categoryFilter.id)) continue;
      }
      result.push(idx);
    }
    return result;
  }, [deferredSearchTerm, tableData, stockFilter, categoryFilter, items, columnFilters]);

  // Pre-build suggestions per item id so getSuggestions doesn't recompute on every render
  const suggestionsCache = useMemo(() => {
    const cache = {};
    for (const item of items) {
      const sizes = item.sizes || [];
      const build = (colKey) => {
        const seen = new Set();
        return sizes.map((s) => {
          let label = "", display = "";
          if (colKey === "sizeInInch") { label = s.sizeInInch || ""; display = `${s.sizeInInch}  (MM: ${s.sizeInMm || "-"}, Dz: ${s.dozenWeight ?? "-"})`; }
          else if (colKey === "sizeInMm") { label = s.sizeInMm || ""; display = `${s.sizeInMm}  (Inch: ${s.sizeInInch || "-"}, Dz: ${s.dozenWeight ?? "-"})`; }
          else if (colKey === "dozenWeight") { label = s.dozenWeight != null ? String(s.dozenWeight) : ""; display = `${s.dozenWeight ?? "-"}  (Inch: ${s.sizeInInch || "-"}, MM: ${s.sizeInMm || "-"})`; }
          return { label, display, size: s };
        }).filter((s) => { if (!s.label || seen.has(s.label)) return false; seen.add(s.label); return true; });
      };
      cache[item.id] = { sizeInInch: build("sizeInInch"), sizeInMm: build("sizeInMm"), dozenWeight: build("dozenWeight") };
    }
    return cache;
  }, [items]);

  const getSuggestions = (row, colKey) => suggestionsCache[row._itemId]?.[colKey] ?? [];

  const renderCell = (row, rowIndex, col, colIndex, isEditing, isSelected) => {
    const isRowEditable = row._editing;

    // Item Name dropdown
    if (col.type === "dropdown") {
      return (
        <td
          key={col.key}
          className={`h-10 min-w-[140px] border-r border-line-2 px-1 py-1 text-center text-[13px] text-ink ${
            isSelected && isRowEditable ? "ring-2 ring-primary/50 ring-inset" : ""
          }`}
          onClick={() => handleCellClick(rowIndex, colIndex, row._editing)}
          onDoubleClick={() => handleCellDoubleClick(rowIndex, colIndex)}
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
            <span className="px-1 font-medium text-ink">{row.itemName || "—"}</span>
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
          className={`h-10 min-w-[120px] border-r border-line-2 px-3 py-1 text-center font-mono text-[12.5px] text-ink-2 ${
            isSelected && isRowEditable ? "ring-2 ring-primary/50 ring-inset" : ""
          }`}
          onClick={() => handleCellClick(rowIndex, colIndex, row._editing)}
          onDoubleClick={() => handleCellDoubleClick(rowIndex, colIndex)}
        >
          {isEditing ? (
            <SuggestInput
              value={row[col.key]}
              suggestions={suggestions}
              inputType={col.key === "dozenWeight" ? "number" : "text"}
              onChange={(val) => updateCell(rowIndex, col.key, val)}
              onSelect={(s) => handleSizeSuggestionSelect(rowIndex, s.size)}
              onBlur={() => handleCellBlur(`${rowIndex}-${colIndex}`)}
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
            <span className={row[col.key] ? "text-ink" : "text-ink-3/60"}>{row[col.key] || "—"}</span>
          )}
        </td>
      );
    }

    // Stock status badge cell (read-only)
    if (col.type === "status") {
      const status = row[col.key] || "";
      const badge =
        status === "IN_STOCK" ? (
          <Badge variant="success">In stock</Badge>
        ) : status === "LOW" ? (
          <Badge variant="warning">Low stock</Badge>
        ) : status === "OUT_OF_STOCK" ? (
          <Badge variant="danger">Out of stock</Badge>
        ) : null;
      return (
        <td
          key={col.key}
          className="h-10 min-w-[110px] border-r border-line-2 px-3 py-1 text-center text-[13px]"
        >
          {badge || <span className="text-ink-3/60">—</span>}
        </td>
      );
    }

    // Read-only cell (e.g. pcsWeight from size)
    if (col.type === "readonly") {
      return (
        <td
          key={col.key}
          className="h-10 min-w-[84px] border-r border-line-2 px-3 py-1 text-center font-mono text-[12.5px]"
        >
          <span className={row[col.key] ? "text-ink-2" : "text-ink-3/60"}>{fmtNum(row[col.key])}</span>
        </td>
      );
    }

    // Number input cells
    return (
      <td
        key={col.key}
        className={`h-10 min-w-[84px] border-r border-line-2 px-3 py-1 text-center font-mono text-[12.5px] text-ink-2 ${
          isSelected && isRowEditable ? "ring-2 ring-primary/50 ring-inset" : ""
        }`}
        onClick={() => handleCellClick(rowIndex, colIndex, row._editing)}
        onDoubleClick={() => handleCellDoubleClick(rowIndex, colIndex)}
      >
        {isEditing ? (
          <NumberCellInput
            value={row[col.key]}
            colKey={col.key}
            rowIndex={rowIndex}
            onCommit={updateCell}
            onSsChange={handleSsChange}
            onBlur={() => handleCellBlur(`${rowIndex}-${colIndex}`)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.currentTarget.blur(); return; }
              if (e.key === "Tab" && !e.shiftKey && rowIndex === tableData.length - 1 && colIndex === columns.length - 1) {
                e.preventDefault();
                handleLastCellTab();
              }
            }}
          />
        ) : (
          <span className={row[col.key] ? "text-ink" : "text-ink-3/60"}>{fmtNum(row[col.key])}</span>
        )}
      </td>
    );
  };

  return (
    <SidebarLayout>
      <PageHeader
        title="Stock master"
        subtitle="Items, sizes, stock and packing details"
        actions={
          <>
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportFileSelect}
              className="hidden"
            />
            {/* Only the primary action stays a button at this width; the rest live in a menu so a
                seven-button toolbar can't wrap over the title on a laptop. */}
            <Button size="sm" onClick={() => navigate("/add-inventory")}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">Add inventory</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon-sm" aria-label="Stock master actions">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[12rem]">
                <DropdownMenuItem onSelect={() => setViewItemsDialog(true)}>
                  <Eye className="size-4" />
                  View items
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setAddItemDialog(true)}>
                  <Plus className="size-4" />
                  Add item
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => importInputRef.current?.click()}>
                  <Upload className="size-4" />
                  Upload Excel
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setIsFormulaOpen(true)}>
                  <Check className="size-4" />
                  Pricing formula
                </DropdownMenuItem>
                {items.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => setClearAllOpen(true)}>
                      <Trash2 className="size-4" />
                      Clear all items
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      {/* `min-w-0` all the way down is what stops the wide sheet below from pushing the page out
          from under the navigation rail — a flex child's default `min-width:auto` lets it grow to
          its content. */}
      <PageBody className="flex min-w-0 flex-col">
        <div className="mb-5 grid grid-cols-1 gap-3 sm:max-w-xs">
          <StatCard
            label="Total items"
            value={fmtNumber(items.length)}
            hint={`${filteredIndices.length} rows shown`}
            icon={Boxes}
            tone="primary"
            isPending={loading}
          />
        </div>

        <div className="mb-4 flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center">
          {/* Search — isolated + debounced so typing stays instant on this large table */}
          <div className="relative w-full lg:max-w-sm lg:flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
            <DebouncedSearchInput
              value={searchTerm}
              onDebouncedChange={setSearchTerm}
              placeholder="Search items, sizes…"
              wrapperClassName="contents"
              className="h-9 w-full rounded-md border border-input bg-surface py-1 pr-3 pl-9 text-[13px] shadow-xs transition-[color,box-shadow] outline-none placeholder:text-ink-3 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>

          {/* Stock status tabs — the one filter this sheet is scanned by. */}
          <div className="min-w-0 overflow-x-auto scrollbar-hide">
            <div className="inline-flex items-center gap-1 rounded-lg bg-surface-2 p-1">
              {[
                { value: "ALL", label: "All items" },
                { value: "IN_STOCK", label: "In stock" },
                { value: "LOW", label: "Low stock" },
                { value: "OUT_OF_STOCK", label: "Out of stock" },
                { value: "NO_ENTRY", label: "No entry" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStockFilter(opt.value)}
                  className={`rounded-md px-3 py-1.5 text-[12px] font-medium whitespace-nowrap transition-colors ${
                    stockFilter === opt.value
                      ? "bg-surface text-ink shadow-sm"
                      : "text-ink-3 hover:text-ink"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {categoryFilter && (
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[12px] text-ink-3">Filtered by category</span>
            <Badge variant="accent" className="gap-1.5 py-1">
              {categoryFilter.name}
              <button
                type="button"
                onClick={() => setCategoryFilter(null)}
                aria-label="Clear category filter"
                className="transition-opacity hover:opacity-70"
              >
                <X className="size-3" />
              </button>
            </Badge>
          </div>
        )}

        {/* Formula bar — the sheet's current cell, editable in place like a spreadsheet. */}
        <div className="mb-2 flex min-w-0 items-stretch overflow-hidden rounded-lg border border-line bg-surface text-[13px]">
          <div className="flex min-w-[8.5rem] items-center truncate border-r border-line bg-surface-2 px-3 text-[11.5px] font-medium text-ink-3">
            {formulaCell?.label || ""}
          </div>
          <div className="flex items-center border-r border-line bg-surface-2 px-3 font-mono text-[11.5px] text-ink-3 select-none">
            fx
          </div>
          <input
            type="text"
            aria-label="Formula bar"
            value={formulaCell ? (tableData[formulaCell.rowIndex]?.[formulaCell.key] ?? "") : ""}
            readOnly={!formulaCell || !tableData[formulaCell?.rowIndex]?._editing}
            onChange={(e) => {
              if (!formulaCell) return;
              formulaCell.key === "ss"
                ? handleSsChange(formulaCell.rowIndex, e.target.value)
                : updateCell(formulaCell.rowIndex, formulaCell.key, e.target.value);
            }}
            onFocus={() => {
              if (formulaCell && !tableData[formulaCell.rowIndex]?._editing) {
                handleEditRow(formulaCell.rowIndex);
                const colIdx = columns.findIndex((c) => c.key === formulaCell.key);
                const cellId = `${formulaCell.rowIndex}-${colIdx}`;
                _setEditingCell(cellId);
                _setSelectedCell(cellId);
              }
            }}
            placeholder="Double-click a cell to edit…"
            className={`min-w-0 flex-1 px-3 py-2 font-mono text-[13px] outline-none placeholder:font-sans placeholder:text-ink-3 ${
              formulaCell && tableData[formulaCell?.rowIndex]?._editing
                ? "bg-surface text-ink"
                : "bg-surface-2 text-ink-3"
            }`}
          />
        </div>

        {loading ? (
          <ListSkeleton rows={8} className="h-10" />
        ) : (
          <Card className="min-w-0 gap-0 overflow-hidden py-0">
            <div className="max-h-[min(60vh,460px)] min-w-0 overflow-auto scrollbar-thin">
              <table className="w-max min-w-full table-auto">
                  <thead>
                    <tr className="border-b border-line bg-surface-2">
                      {columns.map((col) => {
                        if (!finishExpanded && FINISH_KEYS.includes(col.key)) return null;
                        return (
                          <React.Fragment key={col.key}>
                            {col.key === "stockStatus" && (
                              <th className={HEADER_CELL + " min-w-[70px]"}>
                                <span className="inline-flex flex-col items-center leading-tight">
                                  {splitHeaderLabel("View").map((line, idx) => (
                                    <span key={`view-${idx}`}>{line}</span>
                                  ))}
                                </span>
                              </th>
                            )}
                            {col.key === "ss" && (
                              <th className="sticky top-0 z-20 min-w-[36px] border-r border-line bg-surface-2 px-1 py-2.5">
                                <button
                                  type="button"
                                  onClick={() => setFinishExpanded((v) => !v)}
                                  title="Collapse finish columns"
                                  className="rounded-md p-1 text-ink-3 transition-colors hover:bg-line-2 hover:text-ink"
                                >
                                  <ChevronsLeft className="size-4" />
                                </button>
                              </th>
                            )}
                            <th className={HEADER_CELL}>
                              <div className="inline-flex items-center justify-center gap-0.5">
                                <span className="inline-flex flex-col items-center leading-tight">
                                  {splitHeaderLabel(col.label).map((line, idx) => (
                                    <span key={`${col.key}-${idx}`}>{line}</span>
                                  ))}
                                </span>
                                {FILTERABLE_KEYS.includes(col.key) && (
                                  <ColumnFilter
                                    options={columnDistinctValues[col.key] || []}
                                    selected={columnFilters[col.key] ?? null}
                                    onChange={(sel) => setColFilter(col.key, sel)}
                                  />
                                )}
                              </div>
                            </th>
                          </React.Fragment>
                        );
                      })}
                      {!finishExpanded && (
                        <th className="sticky top-0 z-20 min-w-[36px] border-r border-line bg-surface-2 px-1 py-2.5">
                          <button
                            type="button"
                            onClick={() => setFinishExpanded(true)}
                            title="Expand finish columns"
                            className="rounded-md p-1 text-ink-3 transition-colors hover:bg-line-2 hover:text-ink"
                          >
                            <ChevronsRight className="size-4" />
                          </button>
                        </th>
                      )}
                      {/* Pinned to the right so the row controls stay reachable at any scroll offset. */}
                      <th className="sticky top-0 right-0 z-30 min-w-[86px] bg-surface-2 px-3 py-2.5 text-center text-[11px] font-semibold tracking-[0.03em] whitespace-normal text-ink-3 uppercase shadow-[-6px_0_10px_-8px_rgb(16_24_32_/_0.35)]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIndices.map((originalIndex) => {
                      const row = tableData[originalIndex];
                      // Derive per-row cell state so unrelated rows skip re-render
                      const editingCol = editingCell && editingCell.startsWith(`${originalIndex}-`)
                        ? parseInt(editingCell.split("-")[1], 10) : null;
                      const selectedCol = selectedCell && selectedCell.startsWith(`${originalIndex}-`)
                        ? parseInt(selectedCell.split("-")[1], 10) : null;
                      return (
                        <MemoRow
                          key={`row-${originalIndex}`}
                          row={row}
                          originalIndex={originalIndex}
                          editingCol={editingCol}
                          selectedCol={selectedCol}
                          renderCell={renderCell}
                          handleAddStockRow={handleAddStockRow}
                          handleCancelEditRow={handleCancelEditRow}
                          handleEditRow={handleEditRow}
                          setDeleteDialog={setDeleteDialog}
                          finishExpanded={finishExpanded}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {filteredIndices.length === 0 && !loading && (
            <p className="mt-3 text-center text-[12.5px] text-ink-3">No matching rows.</p>
          )}

          {/* Sticky action bar — the sheet scrolls for a long time, and Save must never be
              somewhere you have to hunt for. */}
          <div className="sticky bottom-0 z-10 mt-4 flex flex-col gap-2 border-t border-line bg-[color-mix(in_oklab,var(--paper)_88%,transparent)] py-3 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11.5px] text-ink-3">Press Tab on the last cell to add a new row.</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={handleRefresh}>
                Refresh
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setTableData((prev) => [...prev, createEmptyRow()]);
                }}
              >
                <Plus className="size-4" />
                Add row
              </Button>
              <Button onClick={handleSaveAll} disabled={saving || !hasEditingRows}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
      </PageBody>

      {/* ── Add Inventory Dialog ── */}
      {addInventoryDialog && (() => {
        const isNew = invForm.blueprintMode === "new";
        const stockCols = [
          { key: "pcsPerBox", label: "Pcs/Box" },
          { key: "boxPerCarton", label: "Box/Carton" },
          { key: "pcsPerCarton", label: "Pcs/Carton" },
          { key: "cartonWeight", label: "Carton Wt." },
          // Finish price columns — canonical keys/labels that match the backend inventory columns.
          ...FINISHES,
        ];
        return (
          <FormDialog
            open={addInventoryDialog}
            onOpenChange={(open) => {
              if (!open) setAddInventoryDialog(false);
            }}
            title="Add inventory"
            description="Create the blueprint, the size and the stock entry in one go."
            size="lg"
            submitLabel="Save inventory"
            busyLabel="Saving…"
            isPending={addingInventory}
            onSubmit={handleSaveInventory}
          >
            <div className="space-y-6">
              {/* ── Section 1: Blueprint ── */}
              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-[11px] font-semibold tracking-[0.06em] text-ink-3 uppercase">1 · Blueprint</h3>
                  <div className="inline-flex items-center gap-1 rounded-lg bg-surface-2 p-0.5">
                    <button
                      type="button"
                      onClick={() => setInvForm((prev) => ({ ...prev, blueprintMode: "existing", selectedBlueprintId: "" }))}
                      className={`rounded-md px-3 py-1 text-[12px] font-medium transition-colors ${
                        !isNew ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink"
                      }`}
                    >
                      Select existing
                    </button>
                    <button
                      type="button"
                      onClick={() => setInvForm((prev) => ({ ...prev, blueprintMode: "new", selectedBlueprintId: "" }))}
                      className={`rounded-md px-3 py-1 text-[12px] font-medium transition-colors ${
                        isNew ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink"
                      }`}
                    >
                      Create new
                    </button>
                  </div>
                </div>

                {!isNew ? (
                  <Field label="Item blueprint" required>
                    <SearchableSelect
                      ariaLabel="Item blueprint"
                      options={items.map((item) => ({
                        value: String(item.id),
                        label: item.itemName,
                        description: item.category?.name,
                      }))}
                      value={String(invForm.selectedBlueprintId || "")}
                      onChange={(value) => handleInvBlueprintSelect(value)}
                      placeholder="Select item blueprint…"
                      searchPlaceholder="Search blueprints…"
                      className="w-full"
                    />
                  </Field>
                ) : (
                  <FieldGrid columns={2}>
                    <Field label="Item name" htmlFor="inv-item-name" required>
                      <Input
                        id="inv-item-name"
                        type="text"
                        autoFocus
                        value={invForm.newBlueprintName}
                        onChange={(e) => setInvForm((prev) => ({ ...prev, newBlueprintName: e.target.value }))}
                        placeholder="e.g. Butt Hinge"
                      />
                    </Field>
                    <Field label="Category" required>
                      <SearchableSelect
                        ariaLabel="Category"
                        options={categories.map((cat) => ({ value: String(cat.id), label: cat.name }))}
                        value={String(invForm.newBlueprintCategoryId || "")}
                        onChange={(value) => setInvForm((prev) => ({ ...prev, newBlueprintCategoryId: value }))}
                        placeholder="Select category…"
                        searchPlaceholder="Search categories…"
                        className="w-full"
                      />
                    </Field>
                  </FieldGrid>
                )}
              </section>

              {/* ── Section 2: Size ── */}
              <section className="space-y-3 border-t border-line pt-5">
                <h3 className="text-[11px] font-semibold tracking-[0.06em] text-ink-3 uppercase">2 · Size</h3>

                {invBlueprintSizes.length > 0 && (
                  <Field label="Quick-fill from existing sizes">
                    <div className="flex flex-wrap gap-1.5">
                      {invBlueprintSizes.map((s, i) => {
                        const active = invForm.sizeInInch === s.sizeInInch && invForm.sizeInMm === s.sizeInMm;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleInvSizeSelect(s)}
                            className={`rounded-full border px-2.5 py-1 font-mono text-[11.5px] transition-colors ${
                              active
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-line text-ink-2 hover:border-ink-3 hover:bg-surface-2"
                            }`}
                          >
                            {s.sizeInInch} / {s.sizeInMm}
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                )}

                <FieldGrid columns={3}>
                  <Field label="Size in inch" htmlFor="inv-size-inch" required>
                    <Input
                      id="inv-size-inch"
                      type="text"
                      value={invForm.sizeInInch}
                      onChange={(e) => setInvForm((prev) => ({ ...prev, sizeInInch: e.target.value }))}
                      placeholder="e.g. 3x3/8"
                      className="font-mono"
                    />
                  </Field>
                  <Field label="Size in MM" htmlFor="inv-size-mm" required>
                    <Input
                      id="inv-size-mm"
                      type="text"
                      value={invForm.sizeInMm}
                      onChange={(e) => setInvForm((prev) => ({ ...prev, sizeInMm: e.target.value }))}
                      placeholder="e.g. 75x9"
                      className="font-mono"
                    />
                  </Field>
                  <Field label="Dozen weight" htmlFor="inv-dozen-weight">
                    <Input
                      id="inv-dozen-weight"
                      type="number"
                      step="any"
                      value={invForm.dozenWeight}
                      onChange={(e) => setInvForm((prev) => ({ ...prev, dozenWeight: e.target.value }))}
                      placeholder="e.g. 1.2"
                      className="font-mono"
                    />
                  </Field>
                </FieldGrid>
              </section>

              {/* ── Section 3: Stock Details ── */}
              <section className="space-y-3 border-t border-line pt-5">
                <h3 className="text-[11px] font-semibold tracking-[0.06em] text-ink-3 uppercase">3 · Stock details</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {stockCols.map((col) => (
                    <Field key={col.key} label={col.label} htmlFor={`inv-${col.key}`}>
                      <Input
                        id={`inv-${col.key}`}
                        type="number"
                        step="any"
                        value={invForm[col.key]}
                        onChange={(e) => setInvForm((prev) => ({ ...prev, [col.key]: e.target.value }))}
                        placeholder="—"
                        className="text-center font-mono"
                      />
                    </Field>
                  ))}
                </div>
              </section>
            </div>
          </FormDialog>
        );
      })()}

      {/* Add Item dialog */}
      <FormDialog
        open={addItemDialog}
        onOpenChange={(open) => {
          if (!open) {
            setAddItemDialog(false);
            setNewItemName("");
            setNewItemCategoryId("");
          }
        }}
        title="Add new item"
        description="An item blueprint is the name and category; sizes and stock hang off it."
        size="sm"
        submitLabel="Add item"
        busyLabel="Adding…"
        isPending={addingItem}
        onSubmit={handleAddItem}
      >
        <div className="space-y-4">
          <Field label="Item name" htmlFor="new-item-name" required>
            <Input
              id="new-item-name"
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="e.g. Hex Bolt, CSK Screw"
              autoFocus
            />
          </Field>
          <Field label="Category" required>
            <SearchableSelect
              ariaLabel="Category"
              options={categories.map((cat) => ({ value: String(cat.id), label: cat.name }))}
              value={String(newItemCategoryId || "")}
              onChange={(value) => setNewItemCategoryId(value)}
              placeholder="Select category…"
              searchPlaceholder="Search categories…"
              className="w-full"
            />
          </Field>
        </div>
      </FormDialog>

      {/* View Items dialog — search + edit + delete */}
      {viewItemsDialog && (() => {
        const filtered = items.filter(it =>
          (it.itemName || "").toLowerCase().includes(viewItemSearch.toLowerCase())
        );
        return (
          <ViewDialog
            open={viewItemsDialog}
            onOpenChange={(open) => {
              if (!open) {
                setViewItemsDialog(false);
                setEditingItemId(null);
                setViewItemSearch("");
              }
            }}
            title={`All items (${filtered.length})`}
            description="Rename an item or move it to a different category."
            size="xl"
            actions={
              <Button
                variant="outline"
                onClick={() => {
                  setViewItemsDialog(false);
                  setEditingItemId(null);
                  setViewItemSearch("");
                }}
              >
                Close
              </Button>
            }
          >
            <div className="space-y-4">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
                <Input
                  autoFocus
                  type="search"
                  placeholder="Search items…"
                  value={viewItemSearch}
                  onChange={(e) => setViewItemSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {filtered.length === 0 ? (
                <EmptyState icon={Boxes} title="No items found" description="Nothing here matches that search." />
              ) : (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((item) => {
                    const isEditing = editingItemId === item.id;
                    return (
                      <div key={item.id} className="group relative">
                        {isEditing ? (
                          /* Edit mode card */
                          <div className="flex flex-col gap-2 rounded-lg border border-primary bg-primary-soft/40 p-2">
                            <Input
                              autoFocus
                              type="text"
                              value={editingItemName}
                              onChange={(e) => setEditingItemName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") setEditingItemId(null);
                              }}
                              placeholder="Item name"
                              className="h-8 bg-surface"
                            />
                            <SearchableSelect
                              ariaLabel="Category"
                              options={categories.map((cat) => ({ value: String(cat.id), label: cat.name }))}
                              value={String(editingItemCategoryId || "")}
                              onChange={(value) => setEditingItemCategoryId(value)}
                              placeholder="Select category…"
                              searchPlaceholder="Search categories…"
                              className="h-8 w-full"
                            />
                            <div className="flex justify-end gap-1.5">
                              <Button variant="outline" size="xs" onClick={() => setEditingItemId(null)}>
                                Cancel
                              </Button>
                              <Button
                                size="xs"
                                disabled={itemActionLoading}
                                onClick={async () => {
                                  if (!editingItemName.trim()) {
                                    toast.error("Item name is required");
                                    return;
                                  }
                                  if (!editingItemCategoryId) {
                                    toast.error("Please select a category");
                                    return;
                                  }
                                  setItemActionLoading(true);
                                  try {
                                    await axiosInstance.put(`/api/v1/item-blueprints/${item.id}`, {
                                      itemName: editingItemName.trim(),
                                      categoryId: Number(editingItemCategoryId),
                                    });
                                    toast.success("Item updated");
                                    setEditingItemId(null);
                                    await loadAll();
                                  } catch {
                                    toast.error("Failed to update");
                                  } finally {
                                    setItemActionLoading(false);
                                  }
                                }}
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          /* Read-only card chip */
                          <div className="flex min-h-[46px] cursor-default items-center justify-between gap-1 rounded-lg border border-line bg-surface px-3 py-2.5 transition-all hover:border-ink-3/40 hover:shadow-sm">
                            <div className="flex min-w-0 flex-col">
                              <span className="truncate text-[13px] font-medium text-ink">
                                {item.itemName || `Item #${item.id}`}
                              </span>
                              {item.category?.name ? (
                                <span className="truncate text-[11.5px] text-ink-3">{item.category.name}</span>
                              ) : (
                                <span className="truncate text-[11.5px] text-warning">No category</span>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                              <button
                                type="button"
                                title="Edit"
                                onClick={() => {
                                  setEditingItemId(item.id);
                                  setEditingItemName(item.itemName || "");
                                  setEditingItemCategoryId(item.category?.id ? String(item.category.id) : "");
                                }}
                                className="rounded-md p-1 text-ink-3 transition-colors hover:bg-primary-soft hover:text-primary"
                              >
                                <Pencil className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Delete"
                                onClick={() => setDeleteItemTarget({ id: item.id, name: item.itemName })}
                                className="rounded-md p-1 text-ink-3 transition-colors hover:bg-danger-soft hover:text-danger"
                              >
                                <Trash2 className="size-3.5" />
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
          </ViewDialog>
        );
      })()}

      {/* Delete item confirmation */}
      <ConfirmDialog
        open={deleteItemTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteItemTarget(null);
        }}
        title="Delete this item?"
        description={
          <>
            <ConfirmName>{deleteItemTarget?.name}</ConfirmName> and its sizes and stock rows will be removed. This
            cannot be undone.
          </>
        }
        confirmLabel="Delete"
        busyLabel="Deleting…"
        isPending={itemActionLoading}
        onConfirm={async () => {
          setItemActionLoading(true);
          try {
            await axiosInstance.delete(`/api/v1/item-blueprints/${deleteItemTarget.id}`);
            toast.success("Item deleted");
            setDeleteItemTarget(null);
            await loadAll();
          } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to delete item");
          } finally {
            setItemActionLoading(false);
          }
        }}
      />

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog({ open: false, rowIndex: null });
        }}
        title="Delete this inventory row?"
        description="The stock row will be removed. The item and its size stay in the master. This cannot be undone."
        confirmLabel="Delete"
        busyLabel="Deleting…"
        isPending={deleting}
        onConfirm={handleDeleteRow}
      />

      {/* Clear All items confirmation */}
      <ConfirmDialog
        open={clearAllOpen}
        onOpenChange={(open) => {
          if (!open) setClearAllOpen(false);
        }}
        title="Clear all items?"
        description={
          <>
            All <ConfirmName>{items.length}</ConfirmName> items and every size and stock row beneath them will be
            deleted. This cannot be undone.
          </>
        }
        confirmLabel="Clear all"
        busyLabel="Clearing…"
        isPending={clearingAll}
        onConfirm={async () => {
          setClearingAll(true);
          try {
            await Promise.all(items.map((item) => axiosInstance.delete(`/api/v1/item-blueprints/${item.id}`)));
            toast.success("All items cleared!");
            await loadAll();
          } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to clear all items");
          } finally {
            setClearingAll(false);
            setClearAllOpen(false);
          }
        }}
      />

      {/* Import Stock Master Excel confirmation */}
      <ConfirmDialog
        open={importConfirmOpen}
        onOpenChange={(open) => {
          if (!open) handleCancelImport();
        }}
        title="Import stock master Excel?"
        destructive={false}
        description={
          <>
            <ConfirmName>{importFile?.name || "The selected file"}</ConfirmName> will add new items and sizes.
            Existing items and sizes are not modified or deleted, and plating / finish price fields are left empty
            for you to fill in afterwards.
          </>
        }
        confirmLabel="Import"
        busyLabel="Importing…"
        isPending={importing}
        onConfirm={handleConfirmImport}
      />

      <AddStockDialog
        open={!!stockDialogRow}
        onClose={() => setStockDialogRow(null)}
        row={stockDialogRow}
        onSaved={() => loadAll()}
      />

      <PricingFormulaDialog
        isOpen={isFormulaOpen}
        clientId={null}
        scopeLabel="Global default"
        onClose={() => setIsFormulaOpen(false)}
        onSaved={loadRules}
      />
    </SidebarLayout>
  );
};

export default Inventory;

