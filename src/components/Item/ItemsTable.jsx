import React from "react";
import { SquarePen, Trash2, Eye } from "lucide-react";

const ItemsTable = ({
  items = [],
  onEdit,
  onView,
  onDelete,
  showActions = true,
}) => {
  const getStockColor = (status) => {
    return status === "Low Stock"
      ? "bg-[#FFEBEB] text-[#FF0101]"
      : "bg-[#D1FFE2] text-[#275B22]";
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
  <table className="w-full">
    <thead className="bg-gray-50 border-b border-gray-200">
      <tr>
        <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
          In Inch
        </th>
        <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
          In mm
        </th>
        <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
          Category
        </th>
        <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
          Sub Category
        </th>
        <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
          Total Kg
        </th>
        <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
          Dozen Weight
        </th>
        <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
          Low Stock
        </th>
        {showActions && (
          <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
            Action
          </th>
        )}
      </tr>
    </thead>

    <tbody className="divide-y divide-gray-200">
      {items && items.length > 0 ? (
        items.map((item) => (
          <tr key={item.id} className="hover:bg-gray-50 transition">
            <td className="px-6 py-4 text-sm text-gray-900 text-center">
              {item.sizeInch}
            </td>
            <td className="px-6 py-4 text-sm text-gray-900 text-center">
              {item.sizeMM}
            </td>
            <td className="px-6 py-4 text-sm text-gray-900 text-center">
              {item.category}
            </td>
            <td className="px-6 py-4 text-sm text-gray-900 text-center">
              {item.subCategory}
            </td>
            <td className="px-6 py-4 text-sm text-gray-900 text-center">
              {item.totalKg}
            </td>
            <td className="px-6 py-4 text-sm text-gray-900 text-center">
              {item.dozenWeight}
            </td>
            <td className="px-6 py-4 text-sm text-center">
              <span
                className={`inline-flex items-center justify-center px-5 py-2 rounded-full text-xs font-medium ${getStockColor(
                  item.lowStock
                )}`}
              >
                {item.lowStock}
              </span>
            </td>

            {showActions && (
              <td className="px-6 py-4 text-sm">
                <div className="flex items-center justify-center gap-1">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(item)}
                      className="p-1 text-black rounded transition"
                      title="Edit"
                    >
                      <SquarePen className="w-4 h-4" />
                    </button>
                  )}
                  {onView && (
                    <button
                      onClick={() => onView(item)}
                      className="p-1 text-black hover:bg-gray-50 rounded transition"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(item)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </td>
            )}
          </tr>
        ))
      ) : (
        <tr>
          <td
            colSpan={showActions ? 8 : 7}
            className="px-6 py-8 text-center text-gray-500"
          >
            No items found
          </td>
        </tr>
      )}
    </tbody>
  </table>
</div>

  );
};

export default ItemsTable;
