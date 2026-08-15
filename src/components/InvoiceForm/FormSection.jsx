import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const FormSection = ({ title, children, className = '', action, isClose }) => {
  const navigate = useNavigate();
  return (
    <div className={cn('space-y-4', className)}>
      {title && (
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-[18px] font-semibold text-ink">{title}</h2>
          {action ? <div>{action}</div> : null}
          {isClose && (
            <button
              type="button"
              onClick={() => navigate('/invoices')}
              className="inline-flex size-9 items-center justify-center rounded-full border border-line text-ink-3 transition hover:border-line hover:bg-surface-2 hover:text-ink"
              aria-label="Close and go back to invoices"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      )}
      <Card className="gap-0 p-4 sm:p-5">{children}</Card>
    </div>
  );
};

export default FormSection;
