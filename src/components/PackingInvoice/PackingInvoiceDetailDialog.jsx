import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/states";

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
  const items = normalizeItems(invoice || {});
  const invoiceId = String(invoice?.invoiceId || invoice?.id || "").replace(/^In-/i, "");
  const invoiceDate = formatDate(invoice?.date || invoice?.invoiceDate);
  const partyName = invoice?.party || invoice?.partyName || "-";

  return (
    <Dialog open={isOpen && Boolean(invoice)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-1.5rem)] gap-0 overflow-hidden p-0 sm:max-w-6xl">
        <DialogHeader className="border-b border-line px-4 py-4 text-left sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <div className="space-y-1">
              <DialogTitle className="text-[14px] font-medium text-ink">
                Invoice ID - {invoiceId}
                <span className="mx-3 text-ink-3">-</span>
                {invoiceDate}
              </DialogTitle>
              <p className="text-[15px] font-medium text-ink">{partyName}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => onDownload?.(invoice)} disabled={downloading}>
              <Download className="size-4" />
              {downloading ? "Downloading…" : "Download invoice"}
            </Button>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
          {items.length > 0 ? (
            <div className="w-full overflow-x-auto rounded-lg border border-line">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {detailColumns.map((column) => (
                      <TableHead
                        key={column.key}
                        className="border-r border-line-2 px-4 py-3 text-center text-[11.5px] font-semibold tracking-[0.02em] whitespace-nowrap text-ink-3 uppercase"
                      >
                        {column.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} className="border-line-2">
                      {detailColumns.map((column) => (
                        <TableCell
                          key={`${item.id}-${column.key}`}
                          className="border-r border-line-2 px-4 py-3 text-center text-[13px] whitespace-nowrap text-ink-2"
                        >
                          {item[column.key] ?? "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState title="No item details available for this invoice." />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PackingInvoiceDetailDialog;
