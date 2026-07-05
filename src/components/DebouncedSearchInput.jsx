import React, { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

/**
 * A search box that keeps typing instant even inside heavy pages.
 *
 * The input value lives in this small component's own state, so each keystroke only re-renders the
 * box — not the large table/list around it. The parent is only notified (via onDebouncedChange)
 * after the user pauses for `delay` ms, so the expensive filtering runs once instead of per key.
 */
const DebouncedSearchInput = ({
  value = "",
  onDebouncedChange,
  delay = 250,
  placeholder = "Search...",
  className = "",
  wrapperClassName = "",
}) => {
  const [local, setLocal] = useState(value);
  const timer = useRef(null);

  // Sync when the parent resets/changes the value externally (e.g. clearing the field).
  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const handleChange = (e) => {
    const v = e.target.value;
    setLocal(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onDebouncedChange(v), delay);
  };

  return (
    <div className={`relative ${wrapperClassName}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        placeholder={placeholder}
        value={local}
        onChange={handleChange}
        className={className}
      />
    </div>
  );
};

export default DebouncedSearchInput;
