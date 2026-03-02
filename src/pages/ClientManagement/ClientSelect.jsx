import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import SidebarLayout from "../../components/SidebarLayout";
import PageHeader from "../../components/PageHeader";
import StatsCard from "../../components/StatsCard";
import ClientFilterBar from "../../components/Client/ClientFilterBar";
import ClientListDialog from "../../components/Client/ClientListDialog";
import ClientDetailsDialog from "../../components/Client/ClientDetailsDialog";
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
  PCS_PER_BOX:  4,   // editable
  BOX_PER_CTN:  5,   // editable
  PCS_PER_CTN:  6,   // editable
  CTN_WEIGHT:   7,   // editable
  SSSATINLACQ:  8,   // editable
  ANTIQ:        9,   // editable
  SIDEGOLD:    10,   // editable
  ZBLACK:      11,   // editable
  GRBLACK:     12,   // editable
  MATTSS:      13,   // editable
  MATTANTIQ:   14,   // editable
  PVDROSE:     15,   // editable
  PVDGOLD:     16,   // editable
  PVDBLACK:    17,   // editable
  ROSEGOLD:    18,   // editable
  CLEARLACQ:   19,   // editable
};

// Columns the user cannot change
const READ_ONLY_COLS = [COL.ITEM_NAME, COL.SIZE_INCH, COL.SIZE_MM, COL.DOZ];

// ─────────────────────────────────────────────────────────────────────────────
// Map a ClientInventory API object → flat string[] row (20 columns)
// ─────────────────────────────────────────────────────────────────────────────
const mapInventoryToRow = (item) => [
  item.size?.item?.name    ?? "",
  item.size?.sizeInInch    ?? "",
  item.size?.sizeInMm      ?? "",
  item.size?.dozenWeight  != null ? String(item.size.dozenWeight)  : "",
  item.pcsPerBox          != null ? String(item.pcsPerBox)          : "",
  item.boxPerCarton       != null ? String(item.boxPerCarton)       : "",
  item.pcsPerCarton       != null ? String(item.pcsPerCarton)       : "",
  item.cartonWeight       != null ? String(item.cartonWeight)       : "",
  item.sssatinlacq        != null ? String(item.sssatinlacq)        : "",
  item.antiq              != null ? String(item.antiq)              : "",
  item.sidegold           != null ? String(item.sidegold)           : "",
  item.zblack             != null ? String(item.zblack)             : "",
  item.grblack            != null ? String(item.grblack)            : "",
  item.mattss             != null ? String(item.mattss)             : "",
  item.mattantiq          != null ? String(item.mattantiq)          : "",
  item.pvdrose            != null ? String(item.pvdrose)            : "",
  item.pvdgold            != null ? String(item.pvdgold)            : "",
  item.pvdblack           != null ? String(item.pvdblack)           : "",
  item.rosegold           != null ? String(item.rosegold)           : "",
  item.clearlacq          != null ? String(item.clearlacq)          : "",
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
      const res = await clientInventoryApi.getInventoryByClient(
        clientId,
        undefined, // search
        0,         // page
        200        // size – fetch all at once
      );
      const payload = res.data;
      const items = payload?.data ?? [];
      setApiItems(items);
      setInventoryRows(items.map(mapInventoryToRow));
      setTotalItems(payload?.totalElements ?? items.length);
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
    // Mark this source row as dirty
    setDirtyRows((prev) => new Set(prev).add(sourceIndex));
    setInventoryRows((prev) =>
      prev.map((row, rIdx) =>
        rIdx === sourceIndex
          ? row.map((cell, cIdx) => (cIdx === colIndex ? value : cell))
          : row
      )
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

  const selectedClientName = selectedClient?.name ?? "";

  return (
    <SidebarLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <PageHeader
            title="Client Management"
            description="Customize the price & Packing List"
            action={
              <PrimaryActionButton onClick={openClientDialogForDetails}>
                View Client wise Item
              </PrimaryActionButton>
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
                  selectedCell={inlineSelectedCell}
                  editingCell={inlineEditingCell}
                  onCellClick={handleInlineCellClick}
                  onCellChange={handleCellChange}
                  onCellBlur={handleInlineCellBlur}
                  onLastCellTab={handleInlineLastCellTab}
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
      />
    </SidebarLayout>
  );
};

export default ClientSelect;
