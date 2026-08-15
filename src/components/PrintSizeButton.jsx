import { ChevronDown, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Print, with the paper size chosen at the point of clicking.
 *
 * The chitthis print on A6 or A8 depending on which pad is loaded, and that changes job to job —
 * so it is a choice on the button rather than a setting somewhere else. Shared by the job-work and
 * gres cards, which previously kept two copies of it.
 */
export function PrintSizeButton({ printing, onPrint, sizes = ['A6', 'A8'], label = 'Print' }) {
  if (printing) {
    return (
      <Button variant="outline" size="sm" disabled>
        <span className="size-3 animate-spin rounded-full border-2 border-ink-3/40 border-t-transparent" />
        Printing…
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Printer className="size-3.5" />
          {label}
          <ChevronDown className="size-3 text-ink-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[7.5rem]">
        {sizes.map((size) => (
          <DropdownMenuItem key={size} onSelect={() => onPrint(size)}>
            <Printer className="size-3.5" />
            Print {size}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default PrintSizeButton;
