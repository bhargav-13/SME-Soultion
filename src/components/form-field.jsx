import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * The label / control / help-text wrapper every form control on every screen sits in.
 *
 * The forms in this console are plain controlled state rather than a form library, so this
 * deliberately owns nothing but the layout: it renders whatever control you put in it and keeps
 * the label, the required mark, the hint and the error in the same place on all of them.
 */
export function Field({ label, htmlFor, required, hint, error, children, className }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <Label htmlFor={htmlFor} className="text-[12.5px] font-medium text-ink-2">
          {label}
          {required && (
            <span className="text-danger" aria-hidden="true">
              *
            </span>
          )}
        </Label>
      )}
      {children}
      {error ? (
        <p className="text-[11.5px] font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="text-[11.5px] leading-[1.5] text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * The responsive grid a form's fields are laid out on: one column on a phone, two from `sm`, and
 * as many as the screen asks for above that. `span` on a {@link Field} widens a control that needs
 * the room (an address, a remark).
 */
export function FieldGrid({ columns = 2, children, className }) {
  const cols = {
    1: '',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
  };
  return <div className={cn('grid grid-cols-1 gap-3 sm:gap-4', cols[columns], className)}>{children}</div>;
}

/** A read-only label/value pair — for detail panels that show what a form would edit. */
export function ReadOnlyField({ label, value, className, mono = false }) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-[10.5px] font-semibold tracking-[0.06em] text-ink-3 uppercase">{label}</p>
      <p className={cn('mt-0.5 text-[13px] break-words text-ink', mono && 'font-mono')}>
        {value === null || value === undefined || value === '' ? '—' : value}
      </p>
    </div>
  );
}
