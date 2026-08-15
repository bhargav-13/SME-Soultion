import { useMemo } from 'react';
import { Field } from '@/components/form-field';
import { SearchableSelect } from '@/components/ui/searchable-select';

/**
 * Generic labelled picker for the bill forms. Wraps the shared {@link SearchableSelect} so it
 * matches the rest of the console, while keeping this component's original contract: options are
 * `{ value, label }`, and `onSelect` receives the full option object.
 */
const BillDropdown = ({
  label,
  value,
  options = [],
  placeholder = 'Select…',
  onSelect,
  disabled = false,
  required = false,
  // Back-compat: callers that render this inside a table row hide the label via `labelClassName="sr-only"`.
  labelClassName,
}) => {
  const selectOptions = useMemo(
    () => options.map((opt) => ({ value: String(opt.value), label: opt.label })),
    [options],
  );

  const hideLabel = labelClassName?.includes('sr-only');

  return (
    <Field label={hideLabel ? undefined : label} required={required}>
      <SearchableSelect
        ariaLabel={label}
        placeholder={placeholder}
        searchPlaceholder="Search…"
        options={selectOptions}
        value={value != null ? String(value) : undefined}
        onChange={(v) => {
          const option = options.find((o) => String(o.value) === v);
          if (option) onSelect(option);
        }}
        disabled={disabled}
      />
    </Field>
  );
};

export default BillDropdown;
