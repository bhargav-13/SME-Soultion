import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Boxes, Calculator, Eye, MoreHorizontal, Plus, Trash2, Upload, User, Users } from "lucide-react";
import { normalizeSearch } from "../../utils/search";
import SidebarLayout from "../../components/SidebarLayout";
import { PageBody, PageHeader } from "../../components/page-header";
import { StatCard } from "../../components/stat-card";
import { EmptyState, ListSkeleton } from "../../components/states";
import { Button } from "../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { fmtNumber } from "../../lib/format";
import ClientFilterBar from "../../components/Client/ClientFilterBar";
import ClientListDialog from "../../components/Client/ClientListDialog";
import ClientDetailsDialog from "../../components/Client/ClientDetailsDialog";
import ClientImportDialog from "../../components/Client/ClientImportDialog";
import ClientAddItemDialog from "../../components/Client/ClientAddItemDialog";
import { ConfirmDialog, ConfirmName } from "../../components/confirm-dialog";
import PricingFormulaDialog from "../../components/Client/PricingFormulaDialog";
import EditableClientTable from "../../components/Client/EditableClientTable";
import { CLIENT_TABLE_COLUMNS } from "../../Data/clientmanagementdata";
import { clientInventoryApi, partyApi } from "../../services/apiService";
import { resolvePricingRules, applyFinish, fallbackRules } from "../../services/pricingRulesApi";
import toast from "react-hot-toast";

// ─────────────────────────────────────────────────────────────────────────────
// Column index constants  (must match CLIENT_TABLE_COLUMNS order exactly)
// ─────────────────────────────────────────────────────────────────────────────
const COL = {
  ITEM_NAME:    0,   // read-only  (size.item.name)
  SIZE_INCH:    1,   // read-only  (size.sizeInInch)
  SIZE_MM:      2,   // read-only  (size.sizeInMm)
  DOZ:          3,   // read-only  (size.dozenWeight)
  PCS_WEIGHT:   4,   // read-only  (size.pcsWeight)
  PCS_PER_BOX:  5,   // editable
  BOX_PER_CTN:  6,   // editable
  PCS_PER_CTN:  7,   // editable
  CTN_WEIGHT:   8,   // editable
  SSSATINLACQ:  9,   // editable  (S.S.)
  ANTIQ:       10,   // editable
  SIDEGOLD:    11,   // editable
  SARTINLACQ:  12,   // editable  (Sartin Lacqur)
  ZBLACK:      13,   // editable
  GRBLACK:     14,   // editable
  MATTSS:      15,   // editable
  MATTANTIQ:   16,   // editable
  PVDROSE:     17,   // editable
  PVDGOLD:     18,   // editable
  PVDBLACK:    19,   // editable
  ROSEGOLD:    20,   // editable
  CLEARLACQ:   21,   // editable
};

// Columns the user cannot change
const READ_ONLY_COLS = [COL.ITEM_NAME, COL.SIZE_INCH, COL.SIZE_MM, COL.DOZ, COL.PCS_WEIGHT];

// Columns that get an Excel-style header value filter (Item Name, Size Inch, Size MM).
const FILTERABLE_COLS = [COL.ITEM_NAME, COL.SIZE_INCH, COL.SIZE_MM];

// Maps a resolved finish key → its table column index, so dynamic formulas can fill the row
const FINISH_COL = {
  antiq:      COL.ANTIQ,
  sidegold:   COL.SIDEGOLD,
  sartinlacq: COL.SARTINLACQ,
  zblack:     COL.ZBLACK,
  grblack:    COL.GRBLACK,
  mattss:     COL.MATTSS,
  mattantiq:  COL.MATTANTIQ,
  pvdrose:    COL.PVDROSE,
  pvdgold:    COL.PVDGOLD,
  pvdblack:   COL.PVDBLACK,
  rosegold:   COL.ROSEGOLD,
  clearlacq:  COL.CLEARLACQ,
};

// ─────────────────────────────────────────────────────────────────────────────
// Map a ClientInventory API object → flat string[] row (20 columns)
// ─────────────────────────────────────────────────────────────────────────────
const fmtNum = (v) => {
  if (v == null) return "";
  const n = parseFloat(v);
  if (isNaN(n)) return "";
  return String(Math.round(n * 1000) / 1000);
};

const mapInventoryToRow = (item) => [
  item.size?.item?.name ?? "",
  item.size?.sizeInInch ?? "",
  item.size?.sizeInMm   ?? "",
  fmtNum(item.size?.dozenWeight),
  fmtNum(item.size?.pcsWeight),
  item.pcsPerBox    != null ? String(item.pcsPerBox)    : "",
  item.boxPerCarton != null ? String(item.boxPerCarton) : "",
  item.pcsPerCarton != null ? String(item.pcsPerCarton) : "",
  fmtNum(item.cartonWeight),
  fmtNum(item.sssatinlacq),
  fmtNum(item.antiq),
  fmtNum(item.sidegold),
  fmtNum(item.sartinlacq),
  fmtNum(item.zblack),
  fmtNum(item.grblack),
  fmtNum(item.mattss),
  fmtNum(item.mattantiq),
  fmtNum(item.pvdrose),
  fmtNum(item.pvdgold),
  fmtNum(item.pvdblack),
  fmtNum(item.rosegold),
  fmtNum(item.clearlacq),
];

// ─────────────────────────────────────────────────────────────────────────────
// Convert a display row (string[]) → NewClientInventory payload for POST
// sizeId comes from the parallel apiItems array (we look it up by row index)
// ─────────────────────────────────────────────────────────────────────────────
const toNum = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? undefined : n;
};
const toInt = (v) => {
  const n = parseInt(v, 10);
  return isNaN(n) ? undefined : n;
};

const rowToPayload = (row, sizeId) => ({
  sizeId,
  pcsPerBox:    toInt(row[COL.PCS_PER_BOX]),
  boxPerCarton: toInt(row[COL.BOX_PER_CTN]),
  pcsPerCarton: toInt(row[COL.PCS_PER_CTN]),
  cartonWeight: toNum(row[COL.CTN_WEIGHT]),
  sssatinlacq:  toNum(row[COL.SSSATINLACQ]),
  antiq:        toNum(row[COL.ANTIQ]),
  sidegold:     toNum(row[COL.SIDEGOLD]),
  sartinlacq:   toNum(row[COL.SARTINLACQ]),
  zblack:       toNum(row[COL.ZBLACK]),
  grblack:      toNum(row[COL.GRBLACK]),
  mattss:       toNum(row[COL.MATTSS]),
  mattantiq:    toNum(row[COL.MATTANTIQ]),
  pvdrose:      toNum(row[COL.PVDROSE]),
  pvdgold:      toNum(row[COL.PVDGOLD]),
  pvdblack:     toNum(row[COL.PVDBLACK]),
  rosegold:     toNum(row[COL.ROSEGOLD]),
  clearlacq:    toNum(row[COL.CLEARLACQ]),
});

// ─────────────────────────────────────────────────────────────────────────────

const ClientSelect = () => {
  const location = useLocation();
  const preSelectedClient = location.state?.selectedClient || null;

  // ── party (client) list ──────────────────────────────────────
  const [parties, setParties] = useState([]);
  const [partiesLoading, setPartiesLoading] = useState(false);

  // ── selected client: party object {id, name} | null ─────────
  const [selectedClient, setSelectedClient] = useState(null);
  const [modalSelectedClient, setModalSelectedClient] = useState(null);

  // ── inventory state ───────────────────────────────────────────
  // apiItems: raw ClientInventory[] from backend (needed for sizeId)
  const [apiItems, setApiItems] = useState([]);
  // inventoryRows: display string[][] derived from apiItems (editable copy)
  const [inventoryRows, setInventoryRows] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  // dirtyRows: Set of source-row indices that have been edited since last fetch
  const [dirtyRows, setDirtyRows] = useState(new Set());

  // ── UI state ─────────────────────────────────────────────────
  const [tableSearchQuery, setTableSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [isClientListOpen, setIsClientListOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isFormulaOpen, setIsFormulaOpen] = useState(false);
  // Resolved finish formulas for the selected client (finishKey → { multiplier, offset })
  const [ssRules, setSsRules] = useState(fallbackRules());
  const [clientDialogMode, setClientDialogMode] = useState("table");
  const [showInlineTable, setShowInlineTable] = useState(false);
  const [inlineSelectedCell, setInlineSelectedCell] = useState(null);
  const [inlineEditingCell, setInlineEditingCell] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [editingCell, setEditingCell] = useState(null);

  // ── Fetch all parties once on mount ──────────────────────────
  useEffect(() => {
    const fetchParties = async () => {
      setPartiesLoading(true);
      try {
        const res = await partyApi.getAllParties();
        setParties(res.data || []);
      } catch {
        toast.error("Failed to load client list");
      } finally {
        setPartiesLoading(false);
      }
    };
    fetchParties();
  }, []);

  // ── Fetch inventory whenever selectedClient changes ───────────
  const fetchInventory = useCallback(async (clientId) => {
    if (!clientId) return;
    setInventoryLoading(true);
    try {
      const res = await clientInventoryApi.getInventoryByClient(clientId);
      const items = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setApiItems(items);
      setInventoryRows(items.map(mapInventoryToRow));
      setTotalItems(items.length);
      setDirtyRows(new Set()); // reset dirty tracking after every fetch
    } catch {
      toast.error("Failed to load inventory for this client");
      setApiItems([]);
      setInventoryRows([]);
      setTotalItems(0);
      setDirtyRows(new Set());
    } finally {
      setInventoryLoading(false);
    }
  }, []);

  // ── Load resolved finish formulas for the selected client ─────
  const loadRules = useCallback(async (clientId) => {
    const resolved = await resolvePricingRules(clientId, null);
    setSsRules(resolved);
  }, []);

  useEffect(() => {
    if (selectedClient?.id) {
      fetchInventory(selectedClient.id);
      loadRules(selectedClient.id);
    } else {
      setApiItems([]);
      setInventoryRows([]);
      setTotalItems(0);
      setSsRules(fallbackRules());
    }
  }, [selectedClient, fetchInventory, loadRules]);

  // ── Pre-selected client from navigation state ─────────────────
  useEffect(() => {
    if (!preSelectedClient) return;
    setSelectedClient(preSelectedClient);
    setModalSelectedClient(preSelectedClient);
    setShowInlineTable(true);
  }, [preSelectedClient]);

  // ── Excel-style per-column value filters: { [colIndex]: Set<value> } ──
  const [columnFilters, setColumnFilters] = useState({});
  const handleColumnFilterChange = useCallback((colIndex, sel) => {
    setColumnFilters((prev) => {
      const next = { ...prev };
      if (sel == null) delete next[colIndex];
      else next[colIndex] = sel;
      return next;
    });
  }, []);

  const columnDistinctValues = useMemo(() => {
    const sets = {};
    FILTERABLE_COLS.forEach((c) => (sets[c] = new Set()));
    for (const row of inventoryRows) {
      FILTERABLE_COLS.forEach((c) => sets[c].add(row[c] != null ? String(row[c]) : ""));
    }
    const out = {};
    FILTERABLE_COLS.forEach((c) => {
      out[c] = Array.from(sets[c]).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
      );
    });
    return out;
  }, [inventoryRows]);

  // ── Filter rows ───────────────────────────────────────────────
  // Deferred query keeps typing responsive while the (large) table re-filters.
  const deferredSearch = useDeferredValue(tableSearchQuery);
  const filteredRowEntries = useMemo(() => {
    const term = normalizeSearch(deferredSearch); // space-insensitive (e.g. "3.1*1.1")
    const type = (typeFilter || "").toLowerCase();
    const activeCols = Object.keys(columnFilters);
    return inventoryRows
      .map((row, sourceIndex) => ({ row, sourceIndex }))
      .filter(({ row }) => {
        const rowLower = row.join(" ").toLowerCase();
        const matchesSearch = !term || normalizeSearch(rowLower).includes(term);
        const matchesType = !type || rowLower.includes(type);
        if (!matchesSearch || !matchesType) return false;
        for (const c of activeCols) {
          const v = row[c] != null ? String(row[c]) : "";
          if (!columnFilters[c].has(v)) return false;
        }
        return true;
      });
  }, [inventoryRows, deferredSearch, typeFilter, columnFilters]);

  const filteredRows = useMemo(
    () => filteredRowEntries.map(({ row }) => row),
    [filteredRowEntries]
  );

  const modifiedRowIndices = useMemo(() => {
    const s = new Set();
    filteredRowEntries.forEach(({ sourceIndex }, filteredIndex) => {
      const item = apiItems[sourceIndex];
      if (item?.createdAt && item?.lastUpdatedAt && item.createdAt !== item.lastUpdatedAt) {
        s.add(filteredIndex);
      }
    });
    return s;
  }, [filteredRowEntries, apiItems]);

  // ── Dialog helpers ────────────────────────────────────────────
  const openClientDialogForTable = () => {
    setClientDialogMode("table");
    setModalSelectedClient(selectedClient || null);
    setIsClientListOpen(true);
  };

  const openClientDialogForDetails = () => {
    setClientDialogMode("details");
    setModalSelectedClient(selectedClient || null);
    setIsClientListOpen(true);
  };

  const handleViewClientItems = () => {
    if (!modalSelectedClient) return;
    setSelectedClient(modalSelectedClient);
    setInlineSelectedCell(null);
    setInlineEditingCell(null);
    setEditingCell(null);
    setSelectedCell(null);
    setIsClientListOpen(false);

    if (clientDialogMode === "details") {
      setShowInlineTable(false);
      setIsDetailsOpen(true);
      return;
    }
    setIsDetailsOpen(false);
    setShowInlineTable(true);
  };

  // ── Cell interactions ─────────────────────────────────────────
  const handleCellClick = (rowIndex, colIndex) => {
    const cellId = `${rowIndex}-${colIndex}`;
    if (editingCell === cellId) return;
    if (selectedCell === cellId) { setEditingCell(cellId); return; }
    setSelectedCell(cellId);
    setEditingCell(null);
  };

  const handleCellBlur = (cellId) => {
    setEditingCell(null);
    setSelectedCell(cellId);
  };

  const handleInlineCellClick = (rowIndex, colIndex) => {
    const cellId = `${rowIndex}-${colIndex}`;
    if (inlineEditingCell === cellId) return;
    if (inlineSelectedCell === cellId) { setInlineEditingCell(cellId); return; }
    setInlineSelectedCell(cellId);
    setInlineEditingCell(null);
  };

  const handleInlineCellBlur = (cellId) => {
    setInlineEditingCell(null);
    setInlineSelectedCell(cellId);
  };

  const handleCellChange = (rowIndex, colIndex, value) => {
    const sourceIndex = filteredRowEntries[rowIndex]?.sourceIndex ?? rowIndex;
    setDirtyRows((prev) => new Set(prev).add(sourceIndex));
    setInventoryRows((prev) =>
      prev.map((row, rIdx) => {
        if (rIdx !== sourceIndex) return row;
        const updated = row.map((cell, cIdx) => (cIdx === colIndex ? value : cell));
        // Auto-fill all finish fields when SS is typed, using the client's resolved formulas
        if (colIndex === COL.SSSATINLACQ) {
          const ssNum = parseFloat(value);
          if (!isNaN(ssNum)) {
            Object.entries(FINISH_COL).forEach(([finishKey, col]) => {
              const result = applyFinish(ssNum, ssRules[finishKey]);
              if (result != null) updated[col] = String(result);
            });
          }
        }
        return updated;
      })
    );
  };

  // ── SAVE: POST only the rows that were edited (dirty) ────────
  // Per requirement: use POST (createClientInventory) for both create & update.
  const handleInlineSave = async () => {
    if (!selectedClient?.id) return;
    if (dirtyRows.size === 0) {
      toast("No changes to save");
      return;
    }
    setInlineEditingCell(null);
    setInlineSelectedCell(null);
    setSaving(true);

    try {
      // Only POST rows whose source index is in dirtyRows
      const requests = [...dirtyRows].map((sourceIdx) => {
        const sizeId = apiItems[sourceIdx]?.size?.id;
        if (!sizeId) return null; // skip rows with no sizeId
        return clientInventoryApi.createClientInventory(
          selectedClient.id,
          rowToPayload(inventoryRows[sourceIdx], sizeId)
        );
      }).filter(Boolean);

      await Promise.all(requests);

      toast.success(`Saved ${requests.length} row${requests.length !== 1 ? "s" : ""}`);
      // Re-fetch to sync with server and clear dirty state
      await fetchInventory(selectedClient.id);
    } catch {
      toast.error("Failed to save inventory");
    } finally {
      setSaving(false);
    }
  };

  const handleInlineCancel = () => {
    // Discard edits by re-building rows from original API items
    setInventoryRows(apiItems.map(mapInventoryToRow));
    setDirtyRows(new Set());
    setInlineEditingCell(null);
    setInlineSelectedCell(null);
  };

  const handleInlineLastCellTab = () => {
    // Adding a new row inline is not supported (sizeId unknown for new rows)
  };

  const handleDetailsLastCellTab = () => {};

  const handleSave = async () => {
    await handleInlineSave();
    setEditingCell(null);
    setSelectedCell(null);
  };

  const [isClearAllOpen, setIsClearAllOpen] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  const handleDeleteAll = async () => {
    if (!selectedClient?.id) return;
    setClearingAll(true);
    try {
      await Promise.all(
        apiItems.map((item) => clientInventoryApi.deleteClientInventory(selectedClient.id, item.id))
      );
      toast.success("All items cleared!");
      await fetchInventory(selectedClient.id);
    } catch {
      toast.error("Failed to clear all items");
    } finally {
      setClearingAll(false);
      setEditingCell(null);
      setSelectedCell(null);
      setIsClearAllOpen(false);
    }
  };

  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setEditingCell(null);
    setSelectedCell(null);
  };

  const handleImportDone = useCallback((importedParty) => {
    // If the imported party is the currently selected one, refresh the table
    if (selectedClient?.id === importedParty.id) {
      fetchInventory(importedParty.id);
    }
  }, [selectedClient, fetchInventory]);

  const selectedClientName = selectedClient?.name ?? "";

  return (
    <SidebarLayout>
      <PageHeader
        title="Client management"
        subtitle="Per-client prices and packing list"
        actions={
          <>
            <Button
              size="sm"
              onClick={() => {
                if (!selectedClient?.id) {
                  toast.error("Select a client first");
                  return;
                }
                setIsAddOpen(true);
              }}
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Add item</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon-sm" aria-label="Client management actions">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[13rem]">
                <DropdownMenuItem onSelect={openClientDialogForDetails}>
                  <Eye className="size-4" />
                  View client-wise items
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setIsImportOpen(true)}>
                  <Upload className="size-4" />
                  Import
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    if (!selectedClient?.id) {
                      toast.error("Select a client first");
                      return;
                    }
                    setIsFormulaOpen(true);
                  }}
                >
                  <Calculator className="size-4" />
                  Pricing formula
                </DropdownMenuItem>
                {apiItems.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => setIsClearAllOpen(true)}>
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

      {/* `min-w-0` all the way down keeps the wide price sheet scrolling inside the page rather
          than pushing it out from under the navigation rail. */}
      <PageBody className="flex min-w-0 flex-col">
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:max-w-2xl">
          <StatCard label="Total clients" value={fmtNumber(parties.length || 0)} icon={Users} tone="primary" />
          <StatCard
            label="Items for this client"
            value={fmtNumber(totalItems)}
            hint={selectedClientName || undefined}
            icon={Boxes}
            tone="brass"
          />
        </div>

        <ClientFilterBar
          leftLabel={selectedClientName || "Select client"}
          onLeftClick={openClientDialogForTable}
          searchQuery={tableSearchQuery}
          setSearchQuery={setTableSearchQuery}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          filterOptions={["Type", "S.S", "Galv.", "Black"]}
          filterPlaceholder="Type"
        />

        {showInlineTable && selectedClientName ? (
          <div className="flex min-w-0 flex-col">
            {inventoryLoading ? (
              <ListSkeleton rows={8} className="h-10" />
            ) : (
              <>
                <EditableClientTable
                  columns={CLIENT_TABLE_COLUMNS}
                  rows={filteredRows}
                  readOnlyCols={READ_ONLY_COLS}
                  filterableCols={FILTERABLE_COLS}
                  columnDistinctValues={columnDistinctValues}
                  columnFilters={columnFilters}
                  onColumnFilterChange={handleColumnFilterChange}
                  colWidths={{
                    0: 'min-w-[160px]',
                    1: 'min-w-[180px]',
                    2: 'min-w-[140px]',
                  }}
                  selectedCell={inlineSelectedCell}
                  editingCell={inlineEditingCell}
                  onCellClick={handleInlineCellClick}
                  onCellChange={handleCellChange}
                  onCellBlur={handleInlineCellBlur}
                  onLastCellTab={handleInlineLastCellTab}
                  modifiedRowIndices={modifiedRowIndices}
                  collapsibleFrom={COL.SSSATINLACQ}
                />

                {filteredRows.length === 0 && (
                  <p className="mt-3 text-center text-[12.5px] text-ink-3">No matching rows.</p>
                )}

                {/* Sticky so Save stays reachable however far down the sheet you have scrolled. */}
                <div className="sticky bottom-0 z-10 mt-4 flex flex-col gap-2 border-t border-line bg-[color-mix(in_oklab,var(--paper)_88%,transparent)] py-3 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11.5px] text-ink-3">
                    {modifiedRowIndices?.size > 0
                      ? `${modifiedRowIndices.size} row${modifiedRowIndices.size === 1 ? "" : "s"} edited`
                      : "Double-click a cell to edit."}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" onClick={handleInlineCancel} disabled={saving}>
                      Cancel
                    </Button>
                    <Button onClick={handleInlineSave} disabled={saving}>
                      {saving ? "Saving\u2026" : "Save"}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="Pick a client to start"
            description="Prices and packing details are held per client \u2014 choose one above to load its sheet."
            action={
              <Button size="sm" onClick={openClientDialogForTable}>
                <User className="size-4" />
                Select client
              </Button>
            }
          />
        )}
      </PageBody>

      <ClientListDialog
        isOpen={isClientListOpen}
        clients={parties}
        loading={partiesLoading}
        selectedClient={modalSelectedClient}
        onSelectClient={setModalSelectedClient}
        onView={handleViewClientItems}
        viewLabel={clientDialogMode === "details" ? "View" : "Continue"}
        onClose={() => setIsClientListOpen(false)}
      />

      <ClientImportDialog
        isOpen={isImportOpen}
        parties={parties}
        onClose={() => setIsImportOpen(false)}
        onImported={handleImportDone}
      />

      <ClientAddItemDialog
        isOpen={isAddOpen}
        clientId={selectedClient?.id}
        clientName={selectedClientName}
        ssRules={ssRules}
        onClose={() => setIsAddOpen(false)}
        onAdded={() => selectedClient?.id && fetchInventory(selectedClient.id)}
      />

      <PricingFormulaDialog
        isOpen={isFormulaOpen}
        clientId={selectedClient?.id ?? null}
        scopeLabel={selectedClientName}
        onClose={() => setIsFormulaOpen(false)}
        onSaved={() => selectedClient?.id && loadRules(selectedClient.id)}
      />

      <ClientDetailsDialog
        isOpen={isDetailsOpen}
        clientName={selectedClientName}
        columns={CLIENT_TABLE_COLUMNS}
        rows={filteredRows}
        selectedCell={selectedCell}
        editingCell={editingCell}
        onCellClick={handleCellClick}
        onCellChange={handleCellChange}
        onCellBlur={handleCellBlur}
        onLastCellTab={handleDetailsLastCellTab}
        onSave={handleSave}
        onDeleteAll={handleDeleteAll}
        onClose={handleCloseDetails}
        readOnlyCols={READ_ONLY_COLS}
        modifiedRowIndices={modifiedRowIndices}
      />

      <ConfirmDialog
        open={isClearAllOpen}
        onOpenChange={(open) => {
          if (!open) setIsClearAllOpen(false);
        }}
        title="Clear all items for this client?"
        description={
          <>
            All <ConfirmName>{apiItems.length}</ConfirmName> items priced for{" "}
            <ConfirmName>{selectedClientName}</ConfirmName> will be removed. This cannot be undone.
          </>
        }
        confirmLabel="Clear all"
        busyLabel="Clearing\u2026"
        isPending={clearingAll}
        onConfirm={handleDeleteAll}
      />
    </SidebarLayout>
  );
};

export default ClientSelect;
