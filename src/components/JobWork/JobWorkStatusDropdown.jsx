import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = ['PENDING', 'COMPLETE', 'REJECT'];
const STATUS_LABEL = { PENDING: 'Pending', COMPLETE: 'Complete', REJECT: 'Reject' };
/** The status pill's tone. Soft-filled, so a page of twenty cards doesn't become a colour chart. */
const STATUS_TONE = { COMPLETE: 'success', PENDING: 'warning', REJECT: 'danger' };

/**
 * The status pill that is also the control for changing it — used on the job-work and gres cards.
 * Rendered as a real menu so it is keyboard-reachable and closes on outside click, which the
 * hand-rolled popover it replaced did not.
 */
const JobWorkStatusDropdown = ({ value, onChange, disabled }) => {
  const label = STATUS_LABEL[value] || value;
  const tone = STATUS_TONE[value] || 'muted';

  if (disabled) {
    return (
      <Badge variant={tone} className="h-7 px-3 text-[12px]">
        {label}
      </Badge>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Status: ${label}`}
          className={cn(
            'inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition-colors outline-none',
            'focus-visible:ring-[3px] focus-visible:ring-ring/50',
            tone === 'success' && 'bg-success-soft text-success hover:bg-success/15',
            tone === 'warning' && 'bg-warning-soft text-warning hover:bg-warning/15',
            tone === 'danger' && 'bg-danger-soft text-danger hover:bg-danger/15',
            tone === 'muted' && 'bg-surface-2 text-ink-2 hover:bg-line-2',
          )}
        >
          {label}
          <ChevronDown className="size-3.5 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[9rem]">
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {STATUS_OPTIONS.map((opt) => (
            <DropdownMenuRadioItem key={opt} value={opt}>
              {STATUS_LABEL[opt]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export { STATUS_LABEL, STATUS_TONE };
export default JobWorkStatusDropdown;
