import { MoreHorizontal } from 'lucide-react';
import { Fragment } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * The kebab menu at the end of a table row, shared by every list so the affordance is in the same
 * place with the same behaviour everywhere. Renders nothing when no actions survive.
 *
 * Falsy entries are dropped, so callers can gate an action inline. The wrapper swallows the click
 * so opening the menu on a clickable row doesn't also navigate.
 */
export function RowActions({ actions, align = 'end' }) {
  const items = actions.filter(Boolean);
  if (items.length === 0) return null;

  return (
    <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8" aria-label="Row actions">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="min-w-[10rem]">
          {items.map((a) => {
            const Icon = a.icon;
            return (
              <Fragment key={a.label}>
                {a.separatorBefore && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  disabled={a.disabled}
                  variant={a.destructive ? 'destructive' : 'default'}
                  onSelect={a.onSelect}
                >
                  {Icon && <Icon className="size-4" />}
                  {a.label}
                </DropdownMenuItem>
              </Fragment>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
