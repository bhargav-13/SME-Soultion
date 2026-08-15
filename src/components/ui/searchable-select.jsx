import { Check, ChevronsUpDown } from "lucide-react";
import { memo, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
const SearchableSelect = memo(function SearchableSelect2({
  options,
  value,
  onChange,
  placeholder = "Select\u2026",
  searchPlaceholder = "Search\u2026",
  emptyText = "No matches",
  disabled,
  id,
  ariaLabel,
  className,
  contentClassName,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy
}) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);
  return <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
    id={id}
    type="button"
    variant="outline"
    role="combobox"
    aria-expanded={open}
    aria-label={ariaLabel}
    aria-invalid={ariaInvalid}
    aria-describedby={ariaDescribedBy}
    disabled={disabled}
    className={cn(
      "h-9 w-full justify-between bg-surface px-3 font-normal",
      !selected && "text-ink-3",
      className
    )}
  >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
    className={cn("w-[--radix-popover-trigger-width] min-w-[13rem] p-0", contentClassName)}
    align="start"
  >
        <Command
    filter={(itemValue, search) => {
      const option = options.find((o) => o.value === itemValue);
      const haystack = `${option?.label ?? ""} ${option?.description ?? ""}`.toLowerCase();
      return haystack.includes(search.toLowerCase()) ? 1 : 0;
    }}
  >
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => <CommandItem
    key={option.value}
    value={option.value}
    disabled={option.disabled}
    onSelect={(v) => {
      onChange(v);
      setOpen(false);
    }}
  >
                  <Check
    className={cn("size-4", option.value === value ? "opacity-100" : "opacity-0")}
  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{option.label}</span>
                    {option.description && <span className="block truncate text-[11.5px] text-ink-3">{option.description}</span>}
                  </span>
                </CommandItem>)}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>;
});
export {
  SearchableSelect
};
