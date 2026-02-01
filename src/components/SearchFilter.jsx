import React, { useState } from "react";
import { Search } from "lucide-react";

const SearchFilter = ({
  searchQuery,
  setSearchQuery,
  typeFilter,
  setTypeFilter,
  filterOptions,
  filterPlaceholder,
}) => {
  const [isTypeFilterOpen, setIsTypeFilterOpen] = useState(false);

  return (
    <>
     <div className="mb-6 flex gap-4">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-4 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border bg-white border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
        />
      </div>
      {filterOptions && (
        <div className="relative w-40">
          <button
            type="button"
            onClick={() => setIsTypeFilterOpen(!isTypeFilterOpen)}
            className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-gray-500 transition"
          >
            <span
              className={
                typeFilter === "" ? "text-gray-400" : "text-gray-900"
              }
            >
              {typeFilter === "" ? filterPlaceholder : typeFilter}
            </span>
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform ${
                isTypeFilterOpen ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {isTypeFilterOpen && (
            <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
              {filterOptions.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setTypeFilter(type === filterPlaceholder ? "" : type);
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
      )}
      </div>
    </>
  );
};

export default SearchFilter;