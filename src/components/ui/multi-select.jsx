import { Check, ChevronsUpDown, X } from "lucide-react";
import { memo, useState } from "react";
import { Badge } from "@/components/ui/badge";
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
const MultiSelect = memo(function MultiSelect2({
  options,
  value,
  onChange,
  placeholder = "Any",
  searchPlaceholder = "Search\u2026",
  emptyText = "No matches",
  showChips = false,
  disabled,
  id,
  ariaLabel,
  className
}) {
  const [open, setOpen] = useState(false);
  const toggle = (option) => onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
  const label = value.length === 0 ? placeholder : value.length === 1 ? options.find((o) => o.value === value[0])?.label ?? placeholder : `${options.find((o) => o.value === value[0])?.label ?? value[0]} +${value.length - 1}`;
  return <div className={cn("w-full", showChips && "space-y-2")}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
    id={id}
    type="button"
    variant="outline"
    role="combobox"
    aria-expanded={open}
    aria-label={ariaLabel}
    disabled={disabled}
    className={cn("h-9 w-full justify-between bg-surface px-3 font-normal", className)}
  >
            <span className="truncate">{label}</span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[13rem] p-0" align="start">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => <CommandItem
    key={option.value}
    value={option.label}
    disabled={option.disabled}
    onSelect={() => toggle(option.value)}
  >
                    <Check
    className={cn(
      "size-4",
      value.includes(option.value) ? "opacity-100" : "opacity-0"
    )}
  />
                    <span className="truncate">{option.label}</span>
                  </CommandItem>)}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {showChips && value.length > 0 && <div className="flex flex-wrap gap-1.5">
          {value.map((v) => <Badge key={v} variant="accent" className="gap-1 pr-1">
              {options.find((o) => o.value === v)?.label ?? v}
              <button
    type="button"
    onClick={() => toggle(v)}
    aria-label={`Remove ${options.find((o) => o.value === v)?.label ?? v}`}
    className="rounded-full p-0.5 hover:bg-primary/15"
  >
                <X className="size-3" />
              </button>
            </Badge>)}
        </div>}
    </div>;
});
export {
  MultiSelect
};
