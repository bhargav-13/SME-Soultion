import React, { useState } from "react";
import { Search } from "lucide-react";

const ClientFilterBar = ({
  leftLabel = "Select Client",
  onLeftClick,
  leftDisabled = false,
  searchQuery,
  setSearchQuery,
  typeFilter,
  setTypeFilter,
  filterOptions = ["Type"],
  filterPlaceholder = "Type",
}) => {
  const [isTypeOpen, setIsTypeOpen] = useState(false);

  return (
    <div className="mb-6 flex gap-2">
      <button
        type="button"
        onClick={onLeftClick}
        disabled={leftDisabled}
        className="px-4 py-2 border border-gray-300 rounded-lg bg-white  text-gray-700 hover:bg-gray-50 transition disabled:cursor-default disabled:hover:bg-white"
      >
        {leftLabel}
      </button>

      <div className="flex-1 relative">
        <Search className="absolute left-3 top-4 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search"
          className="w-full pl-10 pr-4 py-3 border bg-white border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
        />
      </div>

      <div className="relative w-28">
        <button
          type="button"
          onClick={() => setIsTypeOpen((prev) => !prev)}
          className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-gray-500 transition"
        >
          <span className={typeFilter ? "text-gray-900" : "text-gray-400"}>
            {typeFilter || filterPlaceholder}
          </span>
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${isTypeOpen ? "rotate-180" : ""}`}
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

        {isTypeOpen && (
          <div className="absolute right-0 z-20 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            {filterOptions.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setTypeFilter(type === filterPlaceholder ? "" : type);
                  setIsTypeOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition"
              >
                {type}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientFilterBar;
