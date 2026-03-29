import React from "react";
import { Download, X } from "lucide-react";
import PrimaryActionButton from "../PrimaryActionButton";

const detailColumns = [
  { key: "party", label: "Party" },
  { key: "cartoonNo", label: "Cartoon No." },
  { key: "size", label: "Size" },
  { key: "finish", label: "Finish" },
  { key: "box", label: "Box" },
  { key: "pc", label: "Pc." },
  { key: "totalPc", label: "Total Pc" },
  { key: "scrap", label: "Scrap." },
  { key: "labour", label: "Laboure" },
  { key: "rsKg", label: "Rs/Kg" },
  { key: "billCalDozWeight", label: "Bill Cal. Doz Weight" },
  { key: "ratePc", label: "Rate/Pc." },
  { key: "totalRs", label: "Total Rs." },
];

const formatDate = (value) => {
  if (!value) return "-";
  const str = String(value).slice(0, 10);
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return String(value);
  return `${match[3]}/${match[2]}/${match[1]}`;
};

const normalizeItems = (invoice) => {
  const items =
    Array.isArray(invoice?.items) && invoice.items.length > 0
      ? invoice.items
      : [invoice];

  return items.map((item, index) => {
    const size = item?.size;
    const sizeLabel =
      typeof size === "string"
        ? size
        : size
          ? `${size.sizeInInch || ""}${size.dozenWeight ? ` - ${size.dozenWeight}` : ""}`
          : item?.sizeLabel || item?.size || "";

    return {
      id: item?.id ?? `${invoice?.id || "invoice"}-${index}`,
      party: invoice?.party || invoice?.partyName || "",
      cartoonNo: invoice?.cartoonNo || item?.cartoonNo || "",
      size: sizeLabel,
      finish: item?.finish ?? item?.finishLabel ?? "",
      box: item?.box ?? "",
      pc: item?.pc ?? "",
      totalPc: item?.totalPc ?? "",
      scrap: item?.scrap ?? "",
      labour: item?.labour ?? item?.laboure ?? "",
      rsKg: item?.rsKg ?? "",
      billCalDozWeight:
        item?.billCalDozWeight ?? item?.billCalDocWeight ?? "",
      ratePc: item?.ratePc ?? "",
      totalRs: item?.totalRs ?? "",
    };
  });
};

const PackingInvoiceDetailDialog = ({
  invoice,
  isOpen,
  onClose,
  onDownload,
  downloading = false,
}) => {
  if (!isOpen || !invoice) return null;

  const items = normalizeItems(invoice);
  const invoiceId = String(invoice.invoiceId || invoice.id || "").replace(/^In-/i, "");
  const invoiceDate = formatDate(invoice.date || invoice.invoiceDate);
  const partyName = invoice.party || invoice.partyName || "-";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 px-4 py-6 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-gray-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className=" font-medium text-black">
                Invoice ID - {invoiceId}
                <span className="mx-3 text-gray-400">-</span>
                {invoiceDate}
              </p>
              <p className="text-base font-medium text-black">{partyName}</p>
            </div>

            <div className="flex items-center gap-3">
              {/* <button
                type="button"
                onClick={() => onDownload?.(invoice)}
                disabled={downloading}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                {downloading ? "Downloading..." : "Download Invoice"}
              </button> */}
 <PrimaryActionButton
                 onClick={() => onDownload?.(invoice)}
                disabled={downloading}
                icon={Download}
              >
                  {downloading ? "Downloading..." : "Download Invoice"}
              </PrimaryActionButton>
              <button
                type="button"
                onClick={onClose} border border-gray-300
                className="inline-flex items-center justify-center border border-gray-300 rounded-full p-2 text-gray-500 cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-6 py-5">
          {items.length > 0 ? (
            <div className="overflow-auto border border-gray-200">
              <table className="min-w-full w-max table-auto">
                <thead className="bg-gray-100">
                  <tr>
                    {detailColumns.map((column) => (
                      <th
                        key={column.key}
                        className="px-6 py-4 text-center text-sm font-[550] border-b border-r border-gray-200 bg-gray-100 whitespace-nowrap"
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                      {detailColumns.map((column) => (
                        <td
                          key={`${item.id}-${column.key}`}
                          className="px-6 py-4 text-center text-sm text-gray-500 border-b border-r border-gray-200 whitespace-nowrap"
                        >
                          {item[column.key] ?? "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-sm text-gray-500">
              No item details available for this invoice.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PackingInvoiceDetailDialog;
