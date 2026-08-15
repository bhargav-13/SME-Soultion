import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const LABEL = "mb-1 block text-[12.5px] font-medium text-ink-2";

const ImporterSection = ({ title, prefix, formData, onChange, disabled }) => {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* 1. Country / To The Order */}
      <div className="md:col-span-2">
        <label className={LABEL}>To The Order</label>
        <Input
          type="text"
          name={`${prefix}Country`}
          value={formData[`${prefix}Country`] || ""}
          onChange={onChange}
          disabled={disabled}
          placeholder="Enter Country"
          className={cn(disabled && "bg-surface-2")}
        />
      </div>

      {/* 2. Company / Party Name */}
      <div>
        <label className={LABEL}>{title}</label>
        <Input
          type="text"
          name={`${prefix}Name`}
          value={formData[`${prefix}Name`] || ""}
          onChange={onChange}
          disabled={disabled}
          placeholder="Enter Party Name"
          className={cn(disabled && "bg-surface-2")}
        />
      </div>

      {/* 3. Contact Number */}
      <div>
        <label className={LABEL}>Contact No.</label>
        <Input
          type="text"
          name={`${prefix}ContactNo`}
          value={formData[`${prefix}ContactNo`] || ""}
          onChange={onChange}
          disabled={disabled}
          placeholder="Enter Number"
          className={cn(disabled && "bg-surface-2")}
        />
      </div>

      {/* 4. Address */}
      <div className="md:col-span-2">
        <label className={LABEL}>Address</label>
        <Textarea
          name={`${prefix}Address`}
          value={formData[`${prefix}Address`] || ""}
          onChange={onChange}
          disabled={disabled}
          rows="1"
          placeholder="Enter Address"
          className={cn("resize-none", disabled && "bg-surface-2")}
        />
      </div>
    </div>
  );
};

export default ImporterSection;
