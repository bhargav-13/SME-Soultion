import React from "react";

export const NEW_GROUP = "__new__";

/**
 * Group selector for the Party form. Lets the admin put a party into an existing group, leave it
 * ungrouped, or create a brand-new group inline. Controlled via `value` (""=none, a group id, or
 * NEW_GROUP) and `newName` when creating.
 */
const GroupPicker = ({ groups = [], value, onChange, newName, onNewNameChange }) => (
  <div>
    <label className="block text-sm font-medium text-black mb-1">
      Group <span className="text-gray-400 font-normal">(shared login across companies)</span>
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none text-sm bg-white"
    >
      <option value="">No group (own login)</option>
      {groups.map((g) => (
        <option key={g.id} value={String(g.id)}>
          {g.name}
        </option>
      ))}
      <option value={NEW_GROUP}>+ New group…</option>
    </select>
    {value === NEW_GROUP && (
      <input
        type="text"
        placeholder="New group name (e.g. Mahaveer)"
        value={newName}
        onChange={(e) => onNewNameChange(e.target.value)}
        className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none text-sm"
      />
    )}
  </div>
);

export default GroupPicker;
