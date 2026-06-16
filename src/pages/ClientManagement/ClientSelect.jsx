import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import SidebarLayout from "../../components/SidebarLayout";
import PageHeader from "../../components/PageHeader";
import StatsCard from "../../components/StatsCard";
import ClientFilterBar from "../../components/Client/ClientFilterBar";
import ClientListDialog from "../../components/Client/ClientListDialog";
import ClientDetailsDialog from "../../components/Client/ClientDetailsDialog";
import ClientImportDialog from "../../components/Client/ClientImportDialog";
import EditableClientTable from "../../components/Client/EditableClientTable";
import { CLIENT_TABLE_COLUMNS } from "../../Data/clientmanagementdata";
import PrimaryActionButton from "../../components/PrimaryActionButton";
import { clientInventoryApi, partyApi } from "../../services/apiService";
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

// Same offsets as stock master — auto-fill finish fields when SS is typed
const SS_OFFSETS = {
  [COL.ANTIQ]:      10,
  [COL.SIDEGOLD]:   12,
  [COL.SARTINLACQ]:  0,
  [COL.ZBLACK]:    105,
  [COL.GRBLACK]:    60,
  [COL.MATTSS]:     30,
  [COL.MATTANTIQ]:  60,
  [COL.PVDROSE]:   400,
  [COL.PVDGOLD]:   400,
  [COL.PVDBLACK]:  400,
  [COL.ROSEGOLD]:  400,
  [COL.CLEARLACQ]: 400,
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

  useEffect(() => {
    if (selectedClient?.id) {
      fetchInventory(selectedClient.id);
    } else {
      setApiItems([]);
      setInventoryRows([]);
      setTotalItems(0);
    }
  }, [selectedClient, fetchInventory]);

  // ── Pre-selected client from navigation state ─────────────────
  useEffect(() => {
    if (!preSelectedClient) return;
    setSelectedClient(preSelectedClient);
    setModalSelectedClient(preSelectedClient);
    setShowInlineTable(true);
  }, [preSelectedClient]);

  // ── Filter rows ───────────────────────────────────────────────
  const filteredRowEntries = useMemo(() => {
    return inventoryRows
      .map((row, sourceIndex) => ({ row, sourceIndex }))
      .filter(({ row }) => {
        const rowText = row.join(" ").toLowerCase();
        const matchesSearch =
          !tableSearchQuery ||
          rowText.includes(tableSearchQuery.toLowerCase());
        const matchesType =
          !typeFilter || rowText.includes(typeFilter.toLowerCase());
        return matchesSearch && matchesType;
      });
  }, [inventoryRows, tableSearchQuery, typeFilter]);

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
        // Auto-fill all finish fields when SS is typed (same as stock master)
        if (colIndex === COL.SSSATINLACQ) {
          const ssNum = parseFloat(value);
          if (!isNaN(ssNum)) {
            Object.entries(SS_OFFSETS).forEach(([col, offset]) => {
              updated[Number(col)] = String(Math.round((ssNum + offset) * 1000) / 1000);
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

  const handleDeleteAll = () => {
    setInventoryRows([]);
    setEditingCell(null);
    setSelectedCell(null);
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
      <div className="mx-auto">
        <div className="mb-6">
          <PageHeader
            title="Client Management"
            description="Customize the price & Packing List"
            action={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                  </svg>
                  Import
                </button>
                <PrimaryActionButton onClick={openClientDialogForDetails}>
                  View Client wise Item
                </PrimaryActionButton>
              </div>
            }
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <StatsCard label="Total Clients" value={parties.length || 0} className="h-[90px] rounded-md" />
          <StatsCard label="Total Items" value={totalItems} className="h-[90px] rounded-md" />
        </div>

        <ClientFilterBar
          leftLabel={selectedClientName || "Select Client"}
          onLeftClick={openClientDialogForTable}
          searchQuery={tableSearchQuery}
          setSearchQuery={setTableSearchQuery}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          filterOptions={["Type", "S.S", "Galv.", "Black"]}
          filterPlaceholder="Type"
        />

        {showInlineTable && selectedClientName ? (
          <div>
            {inventoryLoading ? (
              <div className="flex items-center justify-center py-16 text-sm text-gray-400">
                Loading inventory…
              </div>
            ) : (
              <>
                <EditableClientTable
                  columns={CLIENT_TABLE_COLUMNS}
                  rows={filteredRows}
                  readOnlyCols={READ_ONLY_COLS}
                  colWidths={{
                    0: 'min-w-[160px]',  // Item Name
                    1: 'min-w-[180px]',  // Size (Inch)
                    2: 'min-w-[140px]',  // In MM
                  }}
                  selectedCell={inlineSelectedCell}
                  editingCell={inlineEditingCell}
                  onCellClick={handleInlineCellClick}
                  onCellChange={handleCellChange}
                  onCellBlur={handleInlineCellBlur}
                  onLastCellTab={handleInlineLastCellTab}
                  modifiedRowIndices={modifiedRowIndices}
                />
                <div className="mt-4">
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={handleInlineSave}
                      disabled={saving}
                      className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={handleInlineCancel}
                      disabled={saving}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm cursor-pointer disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                {filteredRows.length === 0 && (
                  <p className="mt-2 text-xs text-gray-500">No matching rows.</p>
                )}
              </>
            )}
          </div>
        ) : null}
      </div>

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
    </SidebarLayout>
  );
};

export default ClientSelect;
