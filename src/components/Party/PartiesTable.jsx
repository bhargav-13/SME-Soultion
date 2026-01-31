import React, { useState } from "react";
import { SquarePen, Trash2, Search } from "lucide-react";

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
  const [isTypeFilterOpen, setIsTypeFilterOpen] = useState(false);
  return (
    <>
      {/* Search and Filter */}
      <div className="rounded-lg  mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border bg-white border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
          />
        </div>
        <div className="relative w-40">
          <button
            type="button"
            onClick={() => setIsTypeFilterOpen(!isTypeFilterOpen)}
            className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-gray-500 transition"
          >
            <span className={typeFilter === "" ? "text-gray-400" : "text-gray-900"}>
              {typeFilter === "" ? "Type" : typeFilter}
            </span>
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform ${isTypeFilterOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {isTypeFilterOpen && (
            <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
              {["Type", "Customer", "Vendor", "Customer / Vendor"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setTypeFilter(type === "Type" ? "" : type);
                    setIsTypeFilterOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition"
                >
                  {type}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

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
