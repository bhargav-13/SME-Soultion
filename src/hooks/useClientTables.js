import { useCallback, useState } from "react";

const cloneRows = (rows) => rows.map((row) => [...row]);

const useClientTables = (defaultRows) => {
  const [clientTables, setClientTables] = useState({});

  const ensureClientTable = useCallback(
    (clientName) => {
      if (!clientName) return;

      setClientTables((prev) => {
        if (prev[clientName]) return prev;
        return {
          ...prev,
          [clientName]: cloneRows(defaultRows),
        };
      });
    },
    [defaultRows],
  );

  const getClientTable = useCallback(
    (clientName) => {
      if (!clientName) return [];
      return clientTables[clientName] || [];
    },
    [clientTables],
  );

  const updateCell = useCallback(
    (clientName, rowIndex, colIndex, value) => {
      if (!clientName) return;

      setClientTables((prev) => {
        const currentRows = prev[clientName] ? cloneRows(prev[clientName]) : cloneRows(defaultRows);
        const nextRows = currentRows.map((row, rIdx) =>
          rIdx === rowIndex ? row.map((cell, cIdx) => (cIdx === colIndex ? value : cell)) : row,
        );

        return {
          ...prev,
          [clientName]: nextRows,
        };
      });
    },
    [defaultRows],
  );

  const setClientTable = useCallback((clientName, rows) => {
    if (!clientName) return;

    setClientTables((prev) => ({
      ...prev,
      [clientName]: cloneRows(rows || []),
    }));
  }, []);

  const clearClientTable = useCallback((clientName) => {
    if (!clientName) return;

    setClientTables((prev) => ({
      ...prev,
      [clientName]: [],
    }));
  }, []);

  const resetClientTable = useCallback(
    (clientName) => {
      if (!clientName) return;

      setClientTables((prev) => ({
        ...prev,
        [clientName]: cloneRows(defaultRows),
      }));
    },
    [defaultRows],
  );

  return {
    ensureClientTable,
    getClientTable,
    updateCell,
    setClientTable,
    clearClientTable,
    resetClientTable,
  };
};

export default useClientTables;
