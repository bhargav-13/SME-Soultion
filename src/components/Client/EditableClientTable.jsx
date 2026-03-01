import React from "react";

const EditableClientTable = ({
  columns,
  rows,
  selectedCell,
  editingCell,
  onCellClick,
  onCellChange,
  onCellBlur,
  onLastCellTab,
  tableMinWidth = "min-w-[1600px]",
  scrollHeightClass = "max-h-[560px]",
}) => {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className={`${scrollHeightClass} overflow-auto scrollbar-thin`}>
        <table className={`${tableMinWidth} w-full`}>
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200">
              {columns.map((col) => (
                <th
                  key={col}
                  className="sticky top-0 z-10 whitespace-nowrap px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200 last:border-r-0 bg-gray-100"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`} className="border-b border-gray-200 hover:bg-gray-50">
                {row.map((value, colIndex) => {
                  const cellId = `${rowIndex}-${colIndex}`;
                  const isEditing = editingCell === cellId;
                  const isSelected = selectedCell === cellId;

                  return (
                    <td
                      key={`${rowIndex}-${columns[colIndex]}`}
                      className={`h-10 min-w-[84px] px-3 py-3 text-center text-sm text-gray-500 border-r border-gray-200 last:border-r-0 ${isSelected ? "ring-2 ring-gray-400 ring-inset" : ""}`}
                      onClick={() => onCellClick(rowIndex, colIndex)}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          value={value}
                          onChange={(e) => onCellChange(rowIndex, colIndex, e.target.value)}
                          onBlur={() => onCellBlur(cellId)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.currentTarget.blur();
                              return;
                            }

                            if (
                              e.key === "Tab" &&
                              !e.shiftKey &&
                              onLastCellTab &&
                              rowIndex === rows.length - 1 &&
                              colIndex === columns.length - 1
                            ) {
                              e.preventDefault();
                              onLastCellTab();
                            }
                          }}
                          className="w-full rounded text-start text-sm focus:outline-none focus:ring-none focus:ring-gray-300"
                        />
                      ) : (
                        <span className={value ? "text-gray-500" : "text-gray-300"}>{value || " "}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EditableClientTable;
