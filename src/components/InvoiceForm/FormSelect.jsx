import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const renderOptionLabel = (option) => {
  if (!option.iconText) return option.label;
  return (
    <span className="flex items-center gap-2">
      <span>{option.iconText}</span>
      <span>{option.label}</span>
    </span>
  );
};

const FormSelect = ({
  label,
  name,
  value,
  onChange,
  options = [],
  required = false,
  colSpan = '1',
  placeholder = 'Select...',
  disabled = false,
}) => {
  return (
    <div className={colSpan}>
      <label className="mb-1 block text-[12.5px] font-medium text-ink-2">
        {label}
        {required && <span className="text-danger">*</span>}
      </label>
      <Select
        value={value || undefined}
        onValueChange={(v) => onChange({ target: { name, value: v } })}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {renderOptionLabel(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default FormSelect;
