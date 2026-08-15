import { useMemo } from 'react';
import { Field } from '@/components/form-field';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';

export const NEW_GROUP = '__new__';

/**
 * Group selector for the Party form. Lets the admin put a party into an existing group, leave it
 * ungrouped, or create a brand-new group inline. Controlled via `value` (""=none, a group id, or
 * NEW_GROUP) and `newName` when creating.
 */
const GroupPicker = ({ groups = [], value, onChange, newName, onNewNameChange }) => {
  const options = useMemo(
    () => [
      { value: '', label: 'No group' },
      ...groups.map((g) => ({ value: String(g.id), label: g.name })),
      { value: NEW_GROUP, label: '+ New group…' },
    ],
    [groups],
  );

  return (
    <Field
      label="Group"
      hint="A group shares one login across every company in it."
      className={value === NEW_GROUP ? 'space-y-2' : undefined}
    >
      <SearchableSelect
        ariaLabel="Group"
        options={options}
        value={value ?? ''}
        onChange={onChange}
        placeholder="No group"
        searchPlaceholder="Search groups…"
        className="w-full"
      />
      {value === NEW_GROUP && (
        <Input
          type="text"
          placeholder="New group name (e.g. Mahaveer)"
          value={newName}
          onChange={(e) => onNewNameChange(e.target.value)}
        />
      )}
    </Field>
  );
};

export default GroupPicker;
