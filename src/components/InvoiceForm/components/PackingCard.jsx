import React from "react";
import { X } from "lucide-react";
import FormInput from "../FormInput";

const PackingCard = ({ 
  item, 
  index, 
  onChange, 
  onRemove, 
  canRemove,
  disabled = false,
}) => {
  return (
    <div className="relative rounded-xl border border-line bg-surface p-5">
      {/* Packing Number and Remove Button */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[13px] font-medium text-ink-3">Packing #{index + 1}</span>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-ink-3 transition hover:text-danger"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormInput
          label="Item No."
          name={`packingItemNo_${index}`}
          value={item.packingItemNo || ""}
          onChange={(e) => onChange(index, e)}
          placeholder="Enter No."
          disabled={disabled}
        />
        <FormInput
          label="Description"
          name={`packingDescription_${index}`}
          value={item.packingDescription || ""}
          onChange={(e) => onChange(index, e)}
          placeholder="Enter Item Name"
          disabled={disabled}
        />
        <FormInput
          label="Total Qty (Pcs)"
          name={`totalQtyPcs_${index}`}
          value={item.totalQtyPcs || ""}
          onChange={(e) => onChange(index, e)}
          placeholder="Enter Qty."
          disabled={disabled}
        />
        <FormInput
          label="Qty In Each Carton"
          name={`qtyInEachCarton_${index}`}
          value={item.qtyInEachCarton || ""}
          onChange={(e) => onChange(index, e)}
          placeholder="Enter Each Carton"
          disabled={disabled}
        />
        <FormInput
          label="No. of Carton"
          name={`noOfCarton_${index}`}
          value={item.noOfCarton || ""}
          onChange={(e) => onChange(index, e)}
          placeholder="Enter No."
          disabled={disabled}
        />
        <FormInput
          label="Gross Weight"
          name={`grossWeight_${index}`}
          value={item.grossWeight || ""}
          onChange={(e) => onChange(index, e)}
          placeholder="Enter Gross Weight"
          disabled={disabled}
        />
        <FormInput
          label="Net Weight"
          name={`netWeight_${index}`}
          value={item.netWeight || ""}
          onChange={(e) => onChange(index, e)}
          placeholder="Enter Net Weight"
          disabled={disabled}
        />
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <FormInput
              label="Total Carton With"
              name={`totalCartonWith_${index}`}
              value={item.noOfCarton || ""}
              onChange={(e) => onChange(index, e)}
              placeholder="--"
              disabled={disabled}
            />
          </div>
          <div className="flex-1">
            <FormInput
              label="Wooden Pallet"
              name={`woodenPallet_${index}`}
              value={item.woodenPallet || ""}
              onChange={(e) => onChange(index, e)}
              placeholder="--"
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackingCard;

