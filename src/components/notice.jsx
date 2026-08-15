import { AlertTriangle, CheckCircle2, Info, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

const TONES = {
  info: { icon: Info, box: 'border-info/25 bg-info-soft', mark: 'text-info' },
  warning: { icon: AlertTriangle, box: 'border-warning/30 bg-warning-soft', mark: 'text-warning' },
  danger: { icon: AlertTriangle, box: 'border-danger/30 bg-danger-soft', mark: 'text-danger' },
  success: { icon: CheckCircle2, box: 'border-success/25 bg-success-soft', mark: 'text-success' },
  tip: { icon: Lightbulb, box: 'border-line bg-surface-2', mark: 'text-ink-3' },
};

/**
 * An inline explanatory callout.
 *
 * Used where a screen has to state something the UI cannot show on its own — a constraint the API
 * imposes, or a consequence of an action that is not visible until after you take it. Kept
 * deliberately quiet: this is context, not an alert, and a console that shouts at you on every
 * page teaches you to stop reading it.
 */
export function Notice({ tone = 'info', title, children, icon, className }) {
  const { icon: DefaultIcon, box, mark } = TONES[tone] ?? TONES.info;
  const Icon = icon ?? DefaultIcon;

  return (
    <div className={cn('flex gap-2.5 rounded-lg border px-3.5 py-3', box, className)}>
      <Icon className={cn('mt-px size-4 shrink-0', mark)} aria-hidden="true" />
      <div className="min-w-0 text-[12.5px] leading-[1.55] text-ink-2">
        {title && <p className="font-semibold text-ink">{title}</p>}
        {children}
      </div>
    </div>
  );
}
