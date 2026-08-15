import { AlertTriangle, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * The things every data surface has to say when it has no rows to show. Kept together so they
 * read as one family, and so no screen is tempted to invent a fourth.
 */

/** A failed load, with a way out. No screen is ever left at a dead end. */
export function ErrorState({ message, onRetry, className }) {
  return (
    <Card
      role="alert"
      className={cn('flex flex-col items-center justify-center gap-3 px-4 py-12 text-center', className)}
    >
      <AlertTriangle className="size-6 text-danger" aria-hidden="true" />
      <p className="max-w-md text-[13.5px] font-medium text-danger">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </Card>
  );
}

/**
 * Nothing here yet. `action` is where the recovery lives — "Add the first party", "Clear filters" —
 * because an empty list with no next step is just a wall.
 */
export function EmptyState({ icon: Icon = Inbox, title, description, action, className }) {
  return (
    <Card className={cn('flex flex-col items-center gap-3 px-6 py-12 text-center', className)}>
      <span className="grid size-11 place-items-center rounded-full bg-surface-2 text-ink-3">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-[14px] font-semibold text-ink">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-[12.5px] leading-[1.55] text-ink-3">{description}</p>
        )}
      </div>
      {action}
    </Card>
  );
}

/** The standard list placeholder: rows of the height the real rows will be, so nothing jumps. */
export function ListSkeleton({ rows = 6, className }) {
  return (
    <div className="space-y-2.5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={cn('h-12 w-full', className)} />
      ))}
    </div>
  );
}

/** The card-grid placeholder, for a dashboard's stat row. */
export function CardsSkeleton({ count = 4 }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-[104px] w-full rounded-xl" />
      ))}
    </div>
  );
}

/**
 * The full-page spinner, for a screen that has nothing to show until its first load resolves.
 * Replaces the old `Loader` component; kept as a named export so both spellings work.
 */
export function PageLoader({ text = 'Loading…', className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16', className)} aria-busy="true">
      <span className="size-8 animate-spin rounded-full border-[3px] border-line border-t-primary" />
      {text && <p className="mt-3 text-[12.5px] text-ink-3">{text}</p>}
    </div>
  );
}
