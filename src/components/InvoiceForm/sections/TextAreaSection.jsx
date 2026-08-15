import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const TextAreaSection = ({ title, name, value, onChange, placeholder, disabled = false }) => {
  return (
    <>
      <label className="mb-3 block text-[12.5px] font-medium text-ink-2">{title}</label>
      <Textarea
        rows="1"
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className={cn("mt-1 resize-none", disabled && "bg-surface-2")}
      />
    </>
  );
};

export default TextAreaSection;
