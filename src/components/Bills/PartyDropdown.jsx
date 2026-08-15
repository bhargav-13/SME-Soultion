import { useMemo } from 'react';
import { Field } from '@/components/form-field';
import { SearchableSelect } from '@/components/ui/searchable-select';

/**
 * Party picker for the bill forms. Wraps the shared {@link SearchableSelect} so it matches the rest
 * of the console (search, keyboard, click-away close) while keeping this component's original
 * contract: `onSelect` receives the full party object, and `value` may be a party name or id.
 */
const PartyDropdown = ({
  label,
  value,
  options = [],
  placeholder = 'Select party',
  onSelect,
  required = false,
  disabled = false,
}) => {
  const selectOptions = useMemo(
    () => options.map((party) => ({ value: String(party.id), label: party.name })),
    [options],
  );

  const selectedParty = options.find(
    (party) => party.name === value || String(party.id) === String(value),
  );

  return (
    <Field label={label} required={required}>
      <SearchableSelect
        ariaLabel={label}
        placeholder={placeholder}
        searchPlaceholder="Search party…"
        options={selectOptions}
        value={selectedParty ? String(selectedParty.id) : undefined}
        onChange={(v) => {
          const party = options.find((p) => String(p.id) === v);
          if (party) onSelect(party);
        }}
        disabled={disabled}
      />
    </Field>
  );
};

export default PartyDropdown;
