import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import SidebarLayout from "../../components/SidebarLayout";
import PageHeader from "../../components/PageHeader";
import StatsCard from "../../components/StatsCard";
import ClientFilterBar from "../../components/Client/ClientFilterBar";
import ClientListDialog from "../../components/Client/ClientListDialog";
import ClientDetailsDialog from "../../components/Client/ClientDetailsDialog";
import EditableClientTable from "../../components/Client/EditableClientTable";
import { CLIENTS, CLIENT_TABLE_COLUMNS, DEFAULT_CLIENT_TABLE_DATA } from "../../data/clientmanagementdata";
import useClientTables from "../../hooks/useClientTables";
import PrimaryActionButton from "../../components/PrimaryActionButton";
import { Plus } from "lucide-react";

const cloneRows = (rows) => rows.map((row) => [...row]);
const createEmptyRow = (columnCount) => Array(columnCount).fill("");

const ClientSelect = () => {
  const location = useLocation();
  const preSelectedClient = location.state?.selectedClient || "";

  const [tableSearchQuery, setTableSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [isClientListOpen, setIsClientListOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState("");
  const [modalSelectedClient, setModalSelectedClient] = useState("");
  const [clientDialogMode, setClientDialogMode] = useState("table");
  const [showInlineTable, setShowInlineTable] = useState(false);
  const [inlineDraftRows, setInlineDraftRows] = useState([]);
  const [inlineSelectedCell, setInlineSelectedCell] = useState(null);
  const [inlineEditingCell, setInlineEditingCell] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [editingCell, setEditingCell] = useState(null);

  const EMPTY_CLIENT_TABLE_DATA = useMemo(
    () => DEFAULT_CLIENT_TABLE_DATA.map((row) => row.map(() => "")),
    [],
  );

  const { ensureClientTable, getClientTable, updateCell, setClientTable, clearClientTable } =
    useClientTables(EMPTY_CLIENT_TABLE_DATA);

  useEffect(() => {
    if (!preSelectedClient) return;
    setSelectedClient(preSelectedClient);
    setModalSelectedClient(preSelectedClient);
    ensureClientTable(preSelectedClient);
    setShowInlineTable(true);
  }, [ensureClientTable, preSelectedClient]);

  const activeTableData = getClientTable(selectedClient);
  const tableRowsForDisplay = inlineDraftRows;

  useEffect(() => {
    if (!selectedClient) return;
    setInlineDraftRows(cloneRows(activeTableData));
  }, [activeTableData, selectedClient]);

  const filteredRowEntries = useMemo(() => {
    return tableRowsForDisplay
      .map((row, sourceIndex) => ({ row, sourceIndex }))
      .filter(({ row }) => {
      const rowText = row.join(" ").toLowerCase();
      const matchesSearch = !tableSearchQuery || rowText.includes(tableSearchQuery.toLowerCase());
      const matchesType = !typeFilter || rowText.includes(typeFilter.toLowerCase());
      return matchesSearch && matchesType;
    });
  }, [tableRowsForDisplay, tableSearchQuery, typeFilter]);

  const filteredRows = useMemo(
    () => filteredRowEntries.map(({ row }) => row),
    [filteredRowEntries],
  );

  const openClientDialogForTable = () => {
    setClientDialogMode("table");
    setModalSelectedClient(selectedClient || "");
    setIsClientListOpen(true);
  };

  const openClientDialogForDetails = () => {
    setClientDialogMode("details");
    setModalSelectedClient(selectedClient || "");
    setIsClientListOpen(true);
  };

  const handleViewClientItems = () => {
    if (!modalSelectedClient) return;

    setSelectedClient(modalSelectedClient);
    ensureClientTable(modalSelectedClient);
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

  const handleCellClick = (rowIndex, colIndex) => {
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

  const handleInlineCellClick = (rowIndex, colIndex) => {
    const cellId = `${rowIndex}-${colIndex}`;
    if (inlineEditingCell === cellId) return;

    if (inlineSelectedCell === cellId) {
      setInlineEditingCell(cellId);
      return;
    }

    setInlineSelectedCell(cellId);
    setInlineEditingCell(null);
  };

  const handleInlineCellBlur = (cellId) => {
    setInlineEditingCell(null);
    setInlineSelectedCell(cellId);
  };

  const handleInlineSave = () => {
    setClientTable(selectedClient, inlineDraftRows);
    setInlineEditingCell(null);
    setInlineSelectedCell(null);
  };

  const handleInlineCancel = () => {
    setInlineDraftRows(cloneRows(activeTableData));
    setInlineEditingCell(null);
    setInlineSelectedCell(null);
  };

  const handleInlineLastCellTab = () => {
    const nextRowIndex = filteredRows.length;
    setInlineDraftRows((prevRows) => [...prevRows, createEmptyRow(CLIENT_TABLE_COLUMNS.length)]);
    setInlineSelectedCell(`${nextRowIndex}-0`);
    setInlineEditingCell(`${nextRowIndex}-0`);
  };

  const handleDetailsLastCellTab = () => {
    const nextRowIndex = filteredRows.length;
    const nextRows = [...activeTableData, createEmptyRow(CLIENT_TABLE_COLUMNS.length)];
    setClientTable(selectedClient, nextRows);
    setSelectedCell(`${nextRowIndex}-0`);
    setEditingCell(`${nextRowIndex}-0`);
  };

  const handleSave = () => {
    setEditingCell(null);
    setSelectedCell(null);
  };

  const handleDeleteAll = () => {
    clearClientTable(selectedClient);
    setEditingCell(null);
    setSelectedCell(null);
  };

  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setEditingCell(null);
    setSelectedCell(null);
  };

  return (
    <SidebarLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <PageHeader
            title="Client Management"
            description="Customize the price & Packing List"
            action={
              <PrimaryActionButton
                onClick={openClientDialogForDetails}
              >
                View Client  Item
              </PrimaryActionButton>
            }
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <StatsCard label="Total Clients" value={26} className="h-[90px] rounded-md" />
          <StatsCard label="Total Items" value={17} className="h-[90px] rounded-md" />
        </div>

        <ClientFilterBar
          leftLabel={selectedClient || "Select Client"}
          onLeftClick={openClientDialogForTable}
          searchQuery={tableSearchQuery}
          setSearchQuery={setTableSearchQuery}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          filterOptions={["Type", "S.S", "Galv.", "Black"]}
          filterPlaceholder="Type"
        />

        {showInlineTable && selectedClient ? (
          <div className="">
            {/* <h2 className="text-xl font-medium text-gray-800 mb-4">{selectedClient}</h2> */}
            <EditableClientTable
              columns={CLIENT_TABLE_COLUMNS}
              rows={filteredRows}
              selectedCell={inlineSelectedCell}
              editingCell={inlineEditingCell}
              onCellClick={handleInlineCellClick}
              onCellChange={(rowIndex, colIndex, value) => {
                const sourceRowIndex = filteredRowEntries[rowIndex]?.sourceIndex ?? rowIndex;
                setInlineDraftRows((prevRows) =>
                  prevRows.map((row, rIdx) =>
                    rIdx === sourceRowIndex
                      ? row.map((cell, cIdx) => (cIdx === colIndex ? value : cell))
                      : row,
                  ),
                );
              }}
              onCellBlur={handleInlineCellBlur}
              onLastCellTab={handleInlineLastCellTab}
            />
            <div className="mt-4">
              <p className="text-xs text-gray-500 text-right mb-2">
                Select last box cell and press Tab to add new row.
              </p>
              <div className="flex items-center justify-center gap-3">
                  <button
                  type="button"
                  onClick={handleInlineSave}
                  className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleInlineCancel}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm cursor-pointer"
                >
                  Cancel
                </button>
              
              </div>
            </div>
            {filteredRows.length === 0 && (
              <p className="mt-2 text-xs text-gray-500">No matching rows.</p>
            )}
          </div>
        ) : null}
      </div>

      <ClientListDialog
        isOpen={isClientListOpen}
        clients={CLIENTS}
        selectedClient={modalSelectedClient}
        onSelectClient={setModalSelectedClient}
        onView={handleViewClientItems}
        viewLabel={clientDialogMode === "details" ? "View" : "Continue"}
        onClose={() => setIsClientListOpen(false)}
      />

      <ClientDetailsDialog
        isOpen={isDetailsOpen}
        clientName={selectedClient}
        columns={CLIENT_TABLE_COLUMNS}
        rows={filteredRows}
        selectedCell={selectedCell}
        editingCell={editingCell}
        onCellClick={handleCellClick}
        onCellChange={(rowIndex, colIndex, value) => {
          const sourceRowIndex = filteredRowEntries[rowIndex]?.sourceIndex ?? rowIndex;
          updateCell(selectedClient, sourceRowIndex, colIndex, value);
        }}
        onCellBlur={handleCellBlur}
        onLastCellTab={handleDetailsLastCellTab}
        onSave={handleSave}
        onDeleteAll={handleDeleteAll}
        onClose={handleCloseDetails}
      />
    </SidebarLayout>
  );
};

export default ClientSelect;
