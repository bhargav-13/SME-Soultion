import React from "react";
import { SquarePen, Trash2 } from "lucide-react";
import SearchFilter from "../SearchFilter";

const PartiesTable = ({
  filteredParties,
  searchQuery,
  setSearchQuery,
  typeFilter,
  setTypeFilter,
  handleEdit,
  handleDeleteClick,
  loading,
}) => {
  return (
    <>
      <SearchFilter
        className="rounded-lg mb-6 flex gap-4"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        filterOptions={["Customer", "Vendor", "Both"]}
        filterPlaceholder="Type"
      />

      {/* Table */}
      <div className="bg-white rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200">
              <th className="px-6 py-4 text-center text-sm font-[550] text-black">
                Party Name
              </th>
              <th className="px-6 py-4 text-center text-sm font-[550] text-black">
                Type
              </th>
              <th className="px-6 py-4 text-center text-sm font-[550] text-black">
                GSTIN
              </th>
              <th className="px-6 py-4 text-center text-sm font-[550] text-black">
                Contact
              </th>
              <th className="px-6 py-4 text-center text-sm font-[550] text-black">
                Email
              </th>
              <th className="px-6 py-4 text-center text-sm font-[550] text-black">
                Group
              </th>
              <th className="px-6 py-4 text-center text-sm font-[550] text-black">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredParties.map((party) => (
              <tr
                key={party.id}
                className="border-b border-gray-200 hover:bg-gray-50"
              >
                <td className="px-6 py-4 text-sm text-gray-900 text-center">
                  {party.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 text-center uppercase">
                  {party.type}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 text-center">
                  {party.gstin}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 text-center">
                  {party.contact}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 text-center">
                  {party.email}
                </td>
                <td className="px-6 py-4 text-sm text-center">
                  {party.groupName ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                      {party.groupName}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm flex items-center justify-center gap-3">
                  <button
                    onClick={() => handleEdit(party)}
                    className="text-black hover:text-black transition"
                    title="Edit"
                  >
                    <SquarePen className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(party)}
                    className="text-red-600 hover:text-red-800 transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && filteredParties.length === 0 && (
          <div className="p-6 text-center text-gray-500">No parties found</div>
        )}
      </div>
    </>
  );
};

export default PartiesTable;
