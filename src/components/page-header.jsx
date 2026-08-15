import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

/**
 * The app's top bar, rendered once per page.
 *
 * The leading control is always the sidebar toggle, so the collapse affordance exists on every
 * screen — including the ones a tablet user reaches with the rail already closed. It is sticky and
 * translucent so long tables keep their context while scrolling.
 */
export function PageHeader({ title, subtitle, backTo, backLabel = 'Back', actions, className }) {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-line bg-[color-mix(in_oklab,var(--surface)_82%,transparent)] px-3 backdrop-blur-md sm:gap-3 sm:px-6',
        className,
      )}
    >
      <SidebarTrigger
        aria-label="Toggle navigation"
        className="size-9 shrink-0 rounded-[10px] border border-line bg-surface text-ink-3 hover:bg-surface-2 hover:text-ink"
      />

      {backTo && (
        <>
          <Separator orientation="vertical" className="!h-5" />
          <Link
            to={backTo}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-[9px] px-1.5 py-1 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">{backLabel}</span>
          </Link>
        </>
      )}

      <div className="min-w-0 flex-1">
        <h1 className="truncate font-heading text-[15px] font-semibold tracking-[-0.01em] text-ink sm:text-[18px]">
          {title}
        </h1>
        {subtitle && <div className="truncate text-[12px] text-ink-3 sm:text-[12.5px]">{subtitle}</div>}
      </div>

      {actions && <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">{actions}</div>}
    </header>
  );
}

/** The standard page body padding, so every screen's content starts on the same grid. */
export function PageBody({ children, className }) {
  return <div className={cn('min-w-0 flex-1 p-3 sm:p-6', className)}>{children}</div>;
}

/**
 * A titled block within a page — the unit an ERP form is read in ("Party details", "Items",
 * "Charges"). Purely presentational; it exists so the forms in this console can't each invent
 * their own section spacing.
 */
export function Section({ title, description, actions, children, className }) {
  return (
    <section className={cn('space-y-3 sm:space-y-4', className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {title && <h2 className="font-heading text-[14.5px] font-semibold text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-[12.5px] leading-[1.5] text-ink-3">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
