import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const TYPE_OPTIONS = ['JOB_WORK', 'INHOUSE', 'OUTSIDE'];
const TYPE_LABEL = { JOB_WORK: 'Job Work', INHOUSE: 'In-Side', OUTSIDE: 'Out-Side' };

const JobWorkTypeDropdown = ({ value, onChange }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="sm" className="h-7 gap-1.5 rounded-full px-3 text-[12px] font-medium">
        {TYPE_LABEL[value] || value}
        <ChevronDown className="size-3.5 text-ink-3" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="min-w-[9rem]">
      <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
        {TYPE_OPTIONS.map((opt) => (
          <DropdownMenuRadioItem key={opt} value={opt}>
            {TYPE_LABEL[opt]}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
);

export { TYPE_LABEL };
export default JobWorkTypeDropdown;
