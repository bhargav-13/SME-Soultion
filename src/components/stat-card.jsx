import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const TONES = {
  primary: 'bg-primary-soft text-primary',
  brass: 'bg-brass-soft text-brass',
  success: 'bg-success-soft text-success',
  info: 'bg-info-soft text-info',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
};

/**
 * A dashboard figure: the number, what it counts, and — when it links somewhere — a way in to act
 * on it. Deliberately not a "KPI card with a trend arrow": nothing here exposes history, so a
 * percentage change would be invented.
 */
export function StatCard({ label, value, hint, icon: Icon, to, tone = 'primary', isPending = false, onClick }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        {Icon && (
          <span className={cn('grid size-9 shrink-0 place-items-center rounded-[10px]', TONES[tone] ?? TONES.primary)}>
            <Icon className="size-[18px]" aria-hidden="true" />
          </span>
        )}
        {(to || onClick) && (
          <ArrowUpRight
            className="size-4 text-ink-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
            aria-hidden="true"
          />
        )}
      </div>
      <div className="mt-3.5">
        {isPending ? (
          <Skeleton className="h-7 w-20" />
        ) : (
          <p className="font-mono text-[22px] leading-none font-semibold tracking-[-0.02em] text-ink sm:text-[24px]">
            {value}
          </p>
        )}
        <p className="mt-1.5 text-[12.5px] font-medium text-ink-2">{label}</p>
        {hint && <p className="mt-0.5 text-[11.5px] text-ink-3">{hint}</p>}
      </div>
    </>
  );

  const className = cn(
    'group block rounded-xl border border-line bg-surface p-4 text-left shadow-sm transition-all',
    (to || onClick) && 'hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md',
  );

  if (to) {
    return (
      <Link to={to} className={className}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(className, 'w-full')}>
        {body}
      </button>
    );
  }
  return <Card className={cn(className, 'gap-0')}>{body}</Card>;
}
