import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const FormInput = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
  className = '',
  colSpan = '1',
  disabled = false,
}) => {
  return (
    <div className={colSpan}>
      <label className="mb-1 block text-[12.5px] font-medium text-ink-2">
        {label}
        {required && <span className="text-danger">*</span>}
      </label>
      <Input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(disabled && 'bg-surface-2', className)}
      />
    </div>
  );
};

export default FormInput;
