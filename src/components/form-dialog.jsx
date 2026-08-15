import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * The shell every "fill this in and save" dialog in the console uses.
 *
 * It owns the chrome only — the title, the scroll behaviour of a body taller than the viewport,
 * and the cancel/submit footer — so the twenty-odd dialogs here can't each land on their own
 * padding, button order or busy-state wording. The caller supplies the fields and the submit
 * handler; submitting is a real `<form>` so Enter works.
 *
 * On a phone the content is a full-height sheet-like panel rather than a centred box, because a
 * centred dialog with eight fields on a 375px screen is a scroll trap.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  submitLabel = 'Save',
  busyLabel,
  cancelLabel = 'Cancel',
  isPending = false,
  submitDisabled = false,
  hideFooter = false,
  footer,
  size = 'md',
  className,
}) {
  const widths = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl',
    full: 'sm:max-w-[min(72rem,calc(100vw-4rem))]',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-h-[calc(100dvh-1.5rem)] gap-0 overflow-hidden p-0',
          widths[size] ?? widths.md,
          className,
        )}
      >
        <DialogHeader className="border-b border-line px-4 py-3.5 text-left sm:px-6">
          <DialogTitle className="text-[15px] font-semibold text-ink sm:text-[17px]">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-[12.5px] leading-[1.55] text-ink-3">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit?.(e);
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">{children}</div>

          {!hideFooter && (
            <DialogFooter className="border-t border-line bg-surface-2 px-4 py-3 sm:px-6">
              {footer ?? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isPending}
                  >
                    {cancelLabel}
                  </Button>
                  <Button type="submit" disabled={isPending || submitDisabled}>
                    {isPending ? (busyLabel ?? submitLabel) : submitLabel}
                  </Button>
                </>
              )}
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * A dialog that only shows things — a detail view, a preview, a print-ready summary. Same chrome
 * as {@link FormDialog} minus the form, so a "view" and an "edit" of the same record read the same.
 */
export function ViewDialog({ open, onOpenChange, title, description, children, actions, size = 'lg', className }) {
  const widths = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl',
    full: 'sm:max-w-[min(72rem,calc(100vw-4rem))]',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-h-[calc(100dvh-1.5rem)] gap-0 overflow-hidden p-0',
          widths[size] ?? widths.lg,
          className,
        )}
      >
        <DialogHeader className="border-b border-line px-4 py-3.5 text-left sm:px-6">
          <DialogTitle className="pr-8 text-[15px] font-semibold text-ink sm:text-[17px]">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-[12.5px] leading-[1.55] text-ink-3">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">{children}</div>

        {actions && (
          <DialogFooter className="border-t border-line bg-surface-2 px-4 py-3 sm:px-6">{actions}</DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
