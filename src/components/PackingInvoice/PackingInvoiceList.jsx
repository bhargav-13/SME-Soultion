import { Calendar } from 'lucide-react';
import { EmptyState } from '@/components/states';

const formatDate = (value) => {
  if (!value) return '';
  const str = String(value);
  const isoDate = str.slice(0, 10);
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return str;
  return `${match[3]}/${match[2]}/${match[1]}`;
};

const PackingInvoiceList = ({ invoices = [], onOpen }) => {
  const groups = invoices.reduce((acc, invoice) => {
    const key = invoice.date || '';
    if (!acc[key]) acc[key] = [];
    acc[key].push(invoice);
    return acc;
  }, {});

  const orderedDates = Object.keys(groups).sort((a, b) => {
    if (!a) return 1;
    if (!b) return -1;
    return new Date(a) - new Date(b);
  });

  if (!orderedDates.length) {
    return <EmptyState icon={Calendar} title="No packing invoices found." />;
  }

  return (
    <div className="space-y-6">
      {orderedDates.map((date) => {
        const invoicesForDate = groups[date];
        return (
          <section key={date} className="border-b border-line pb-5">
            <div className="mb-3 flex items-center gap-2 text-[13px] font-medium text-ink">
              <Calendar className="size-4 text-ink-3" />
              <span>{formatDate(date) || '-'}</span>
            </div>

            <div className="flex flex-wrap gap-3">
              {invoicesForDate.map((invoice) => (
                <button
                  key={invoice.id}
                  type="button"
                  onClick={() => onOpen?.(invoice)}
                  className="w-[56px] min-w-[56px] cursor-pointer text-left"
                >
                  <div className="flex h-[50px] items-center justify-center rounded-md border border-line bg-surface text-[13px] font-medium text-ink shadow-sm transition hover:border-primary/40 hover:shadow-md">
                    {invoice.invoiceId || `In-${invoice.id}`}
                  </div>
                  <p className="mt-1 text-center text-[12px] font-light text-ink-2">{invoice.party || '-'}</p>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default PackingInvoiceList;
