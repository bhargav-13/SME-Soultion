import { cva } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-[11.5px] font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive: "bg-destructive text-white [a&]:hover:bg-destructive/90",
        outline: "border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
        /** Neutral / inactive — the quietest label there is. */
        muted: "bg-surface-2 text-ink-3 border-line",
        /** Live, published, serviceable. */
        success: "bg-success-soft text-success",
        /** Draft, pending, needs attention but not broken. */
        warning: "bg-warning-soft text-warning",
        /** Failed, archived, removed. */
        danger: "bg-danger-soft text-danger",
        /** Informational counts and secondary classifications. */
        info: "bg-info-soft text-info",
        /** Merchandising accent: featured, on-sale, hero placement. */
        brass: "bg-brass-soft text-brass",
        /** Soft primary — the "this row is the current selection" tone. */
        accent: "bg-primary-soft text-primary"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);
function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot.Root : "span";
  return <Comp
    data-slot="badge"
    data-variant={variant}
    className={cn(badgeVariants({ variant }), className)}
    {...props}
  />;
}
export {
  Badge,
  badgeVariants
};
