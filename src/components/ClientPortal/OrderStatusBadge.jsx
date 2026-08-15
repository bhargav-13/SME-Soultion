import { ORDER_STATUS } from '@/utils/clientShop';
import { cn } from '@/lib/utils';

/**
 * The pill a client order's stage is shown as, everywhere it appears.
 *
 * A DISPATCHED order carries its own progress in the label ("Dispatched 40/100") because partial
 * dispatch is the normal case here — the status alone would not tell the client how much of their
 * order has actually left.
 */
const OrderStatusBadge = ({ status, dispatchedPc, totalPc, className }) => {
  const config = ORDER_STATUS[status] || {
    label: status || 'Unknown',
    className: 'bg-surface-2 text-ink-3',
  };

  const label =
    status === 'DISPATCHED' && totalPc != null ? `Dispatched ${dispatchedPc ?? 0}/${totalPc}` : config.label;

  return (
    <span
      className={cn(
        'inline-flex w-fit shrink-0 items-center rounded-full px-2 py-0.5 text-[11.5px] font-medium whitespace-nowrap',
        config.className,
        className,
      )}
    >
      {label}
    </span>
  );
};

export default OrderStatusBadge;
