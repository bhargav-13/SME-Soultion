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
        filterOptions={["Type", "Customer", "Vendor", "Customer / Vendor"]}
        filterPlaceholder="Type"
      />

      {/* Table */}
      <div className="bg-white rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200">
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                Party Name
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                Type
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                GSTIN
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                Contact
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                Email
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredParties.map((party) => (
              <tr key={party.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">{party.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{party.type}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{party.gstin}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{party.contact}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{party.email}</td>
                <td className="px-6 py-4 text-sm flex items-center gap-3">
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
