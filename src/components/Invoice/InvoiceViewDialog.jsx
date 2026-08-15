import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import FormSection from "../InvoiceForm/FormSection";
import ExporterSection from "../InvoiceForm/sections/ExporterSection";
import ImporterSection from "../InvoiceForm/sections/ImporterSection";
import InvoiceDetailsSection from "../InvoiceForm/sections/InvoiceDetailsSection";
import ItemsDetailsSection from "../InvoiceForm/sections/ItemsDetailsSection";
import PackingDetailsSection from "../InvoiceForm/sections/PackingDetailsSection";
import AdditionalChargesSection from "../InvoiceForm/sections/AdditionalChargesSection";
import BankDetailsSection from "../InvoiceForm/sections/BankDetailsSection";
import TextAreaSection from "../InvoiceForm/sections/TextAreaSection";

const InvoiceViewDialog = ({ isOpen, onClose, onEdit, invoice }) => {
  const formData = invoice?.details?.formData || {};
  const items = invoice?.details?.items || [];
  const packings = invoice?.details?.packings || [];
  const noop = () => {};

  return (
    <Dialog open={isOpen && Boolean(invoice)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-1.5rem)] gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="border-b border-line px-4 py-3.5 text-left sm:px-6">
          <DialogTitle className="text-[15px] font-semibold text-ink sm:text-[18px]">Invoice details</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="space-y-6">
            <FormSection title="Exporter">
              <ExporterSection formData={formData} onChange={noop} readOnly />
            </FormSection>

            <FormSection title="Importer (Bill To)">
              <ImporterSection
                title="Bill To"
                prefix="billTo"
                formData={formData}
                onChange={noop}
                readOnly
              />
            </FormSection>

            <FormSection title="Importer (Ship To)">
              <ImporterSection
                title="Ship To"
                prefix="shipTo"
                formData={formData}
                onChange={noop}
                readOnly
              />
            </FormSection>

            <FormSection title="Invoice Details">
              <InvoiceDetailsSection
                formData={formData}
                onChange={noop}
                readOnly
              />
            </FormSection>

            <FormSection title="Items Details">
              <ItemsDetailsSection
                items={items}
                onItemsChange={noop}
                readOnly
              />
            </FormSection>

            <FormSection title="Packing Details">
              <PackingDetailsSection
                packings={packings}
                onPackingsChange={noop}
                readOnly
              />
            </FormSection>

            <FormSection title="Extra Changes">
              <AdditionalChargesSection
                formData={formData}
                onChange={noop}
                readOnly
              />
            </FormSection>

            <FormSection title="Bank Details">
              <BankDetailsSection formData={formData} onChange={noop} readOnly />
            </FormSection>

            <FormSection title="ARN No">
              <TextAreaSection
                title="Enter ARN No."
                name="arnNo"
                value={formData.arnNo}
                onChange={noop}
                placeholder="SUPPLY MEANT FOR EXPORT UNDER BOND OR LUT WITHOUT PAYMENT OF INTEGRATED TAX (IGST), LUT ARN..."
                disabled
              />
            </FormSection>

            <FormSection title="RoDTEP">
              <TextAreaSection
                title="Enter RoDTEP"
                name="rodtep"
                value={formData.rodtep}
                onChange={noop}
                placeholder="WE INTEND TO CLAIM REWARDS UNDER THE 'REMISSION OF DUTIES AND TAXES ON EXPORTED PRODUCT (RoDTEP)' SCHEME."
                disabled
              />
            </FormSection>

            <FormSection title="REX No.">
              <TextAreaSection
                title="Enter REX No."
                name="rexNo"
                value={formData.rexNo}
                onChange={noop}
                placeholder="Ishita Industries having REX reg n [NREXEJP]xxxxx of the products covered by this document declares that, except..."
                disabled
              />
            </FormSection>
          </div>
        </div>

        <DialogFooter className="border-t border-line bg-surface-2 px-4 py-3 sm:px-6">
          <Button variant="outline" onClick={onClose} className="px-10">
            Close
          </Button>
          <Button onClick={onEdit} className="px-10">
            Edit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceViewDialog;
