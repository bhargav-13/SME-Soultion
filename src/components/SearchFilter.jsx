import React, { useState } from "react";
import { Search, ChevronDown } from "lucide-react";

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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border bg-white border-gray-300 rounded-lg focus:outline-none focus:border-[#343434] transition"
        />
      </div>
      {filterOptions && (
        <div className="relative min-w-[200px]">
          <button
            type="button"
            onClick={() => setIsTypeFilterOpen(!isTypeFilterOpen)}
            className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg bg-white hover:border-[#343434] focus:outline-none focus:border-[#343434] transition"
          >
            <span
              className={
                typeFilter === "" ? "text-gray-400 text-sm" : "text-gray-900 text-sm font-medium"
              }
            >
              {typeFilter === "" ? filterPlaceholder : typeFilter}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-gray-500 transition-transform ${
                isTypeFilterOpen ? "rotate-180" : ""
              }`}
            />
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
                  className={`w-full text-left px-4 py-2.5 text-sm transition ${
                    typeFilter === type
                      ? "bg-gray-100 text-gray-900 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
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