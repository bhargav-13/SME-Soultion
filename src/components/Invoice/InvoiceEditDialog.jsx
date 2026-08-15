import { Plus } from "lucide-react";
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

const InvoiceEditDialog = ({
  isOpen,
  onClose,
  onSave,
  formData,
  onChange,
  items,
  onItemsChange,
  onAddItem,
  packings,
  onPackingsChange,
  onAddPacking,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-1.5rem)] gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="border-b border-line px-4 py-3.5 text-left sm:px-6">
          <DialogTitle className="text-[15px] font-semibold text-ink sm:text-[18px]">Edit invoice</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="space-y-6">
            <FormSection title="Exporter">
              <ExporterSection formData={formData} onChange={onChange} />
            </FormSection>

            <FormSection title="Importer (Bill To)">
              <ImporterSection
                title="Bill To"
                prefix="billTo"
                formData={formData}
                onChange={onChange}
              />
            </FormSection>

            <FormSection title="Importer (Ship To)">
              <ImporterSection
                title="Ship To"
                prefix="shipTo"
                formData={formData}
                onChange={onChange}
              />
            </FormSection>

            <FormSection title="Invoice Details">
              <InvoiceDetailsSection formData={formData} onChange={onChange} />
            </FormSection>

            <FormSection
              title="Items Details"
              action={
                <Button size="sm" onClick={onAddItem}>
                  <Plus className="size-4" />
                  Add item
                </Button>
              }
            >
              <ItemsDetailsSection items={items} onItemsChange={onItemsChange} />
            </FormSection>

            <FormSection
              title="Packing Details"
              action={
                <Button size="sm" onClick={onAddPacking}>
                  <Plus className="size-4" />
                  Add item
                </Button>
              }
            >
              <PackingDetailsSection
                packings={packings}
                onPackingsChange={onPackingsChange}
              />
            </FormSection>

            <FormSection title="Extra Changes">
              <AdditionalChargesSection formData={formData} onChange={onChange} />
            </FormSection>

            <FormSection title="Bank Details">
              <BankDetailsSection formData={formData} onChange={onChange} />
            </FormSection>

            <FormSection title="ARN No">
              <TextAreaSection
                title="Enter ARN No."
                name="arnNo"
                value={formData.arnNo}
                onChange={onChange}
                placeholder="SUPPLY MEANT FOR EXPORT UNDER BOND OR LUT WITHOUT PAYMENT OF INTEGRATED TAX (IGST), LUT ARN..."
              />
            </FormSection>

            <FormSection title="RoDTEP">
              <TextAreaSection
                title="Enter RoDTEP"
                name="rodtep"
                value={formData.rodtep}
                onChange={onChange}
                placeholder="WE INTEND TO CLAIM REWARDS UNDER THE 'REMISSION OF DUTIES AND TAXES ON EXPORTED PRODUCT (RoDTEP)' SCHEME."
              />
            </FormSection>

            <FormSection title="REX No.">
              <TextAreaSection
                title="Enter REX No."
                name="rexNo"
                value={formData.rexNo}
                onChange={onChange}
                placeholder="Ishita Industries having REX reg n [NREXEJP]xxxxx of the products covered by this document declares that, except..."
              />
            </FormSection>
          </div>
        </div>

        <DialogFooter className="border-t border-line bg-surface-2 px-4 py-3 sm:px-6">
          <Button variant="outline" onClick={onClose} className="px-10">
            Cancel
          </Button>
          <Button onClick={onSave} className="px-10">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceEditDialog;
