import React from "react";
import { Calendar } from "lucide-react";

const formatDate = (value) => {
  if (!value) return "";
  const str = String(value);
  const isoDate = str.slice(0, 10);
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return str;
  return `${match[3]}/${match[2]}/${match[1]}`;
};

const PackingInvoiceList = ({ invoices = [], onOpen }) => {
  const groups = invoices.reduce((acc, invoice) => {
    const key = invoice.date || "";
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
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white/70 px-6 py-12 text-center text-sm text-gray-500">
        No packing invoices found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {orderedDates.map((date) => {
        const invoicesForDate = groups[date];
        return (
          <section key={date} className="pb-5 border-b border-gray-200">
            <div className="flex items-center gap-2  font-medium text-black mb-3">
              <Calendar className="w-4 h-4 text-black" />
              <span>{formatDate(date) || "-"}</span>
            </div>

            <div className="flex flex-wrap gap-3">
              {invoicesForDate.map((invoice) => (
                <button
                  key={invoice.id}
                  type="button"
                  onClick={() => onOpen?.(invoice)}
                  className="w-[56px] min-w-[56px] text-left cursor-pointer"
                >
                  <div className="h-[50px] rounded-md border border-gray-400 bg-white shadow-sm flex items-center justify-center  font-medium text-black transition hover:border-gray-600 hover:shadow-md">
                    {invoice.invoiceId || `In-${invoice.id}`}
                  </div>
                  <p className="mt-1  text-black text-center truncate">
                    {invoice.party || "-"}
                  </p>
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
