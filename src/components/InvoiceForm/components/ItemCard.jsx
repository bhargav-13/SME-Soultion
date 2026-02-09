import React from "react";
import { X } from "lucide-react";
import FormInput from "../FormInput";
import FormSelect from "../FormSelect";

const ItemCard = ({
  item,
  index,
  onChange,
  onRemove,
  canRemove,
  disabled = false,
  currencyOptions = [
    { value: "EUR", label: "EUR", iconText: "€" },
    { value: "USD", label: "USD", iconText: "$" },
  ],
}) => {
  const currencyValue = item.currency || "";
  const currencyIcon = currencyValue === "USD" ? "$" : "€";
  const parsedQty = Number(item.itemQty);
  const parsedUnitPrice = Number(item.unitPrice);
  const parsedCurrencyRate = Number(item.currencyCurrentPrice);
  const totalAmountInr =
    Number.isFinite(parsedQty) &&
    Number.isFinite(parsedUnitPrice) &&
    Number.isFinite(parsedCurrencyRate) &&
    parsedQty > 0 &&
    parsedUnitPrice > 0 &&
    parsedCurrencyRate > 0
      ? (parsedQty * parsedUnitPrice * parsedCurrencyRate).toFixed(2)
      : "";

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 relative">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-500">
          Item #{index + 1}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-gray-400 hover:text-red-500 transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <FormInput
          label="Item No."
          name={`itemNo_${index}`}
          value={item.itemNo || ""}
          onChange={(e) => onChange(index, e)}
          placeholder="Enter No."
          disabled={disabled}
        />
        <FormInput
          label="Part No."
          name={`partNo_${index}`}
          value={item.partNo || ""}
          onChange={(e) => onChange(index, e)}
          placeholder="Enter No."
          disabled={disabled}
        />
        <FormInput
          label="Description"
          name={`itemDescription_${index}`}
          value={item.itemDescription || ""}
          onChange={(e) => onChange(index, e)}
          placeholder="Enter Item Name"
          disabled={disabled}
        />
        <div className="col-span-2">
          <FormInput
            label="HS Code"
            name={`hsCode_${index}`}
            value={item.hsCode || ""}
            onChange={(e) => onChange(index, e)}
            placeholder="Enter HS Code"
            disabled={disabled}
          />
        </div>
        <FormInput
          label="Qty (Pcs)"
          name={`itemQty_${index}`}
          value={item.itemQty || ""}
          onChange={(e) => onChange(index, e)}
          placeholder="Enter Qty."
          disabled={disabled}
        />
        <div className="col-span-2 flex gap-2">
          <div className="flex-1">
            <FormInput
              label="Unit Price (USD/EURO)"
              name={`unitPrice_${index}`}
              value={item.unitPrice || ""}
              onChange={(e) => onChange(index, e)}
              placeholder="Enter Unit Price"
              disabled={disabled}
            />
          </div>
          <div className="relative w-28">
            <FormSelect
              label=""
              name={`currency_${index}`}
              value={currencyValue}
              onChange={(e) => onChange(index, e)}
              options={currencyOptions}
              showIcon
              iconText={currencyIcon}
              placeholder="USD/EURO"
              disabled={disabled}
            />
          </div>
        </div>
        <FormInput
          label="Currency Current Price"
          name={`currencyCurrentPrice_${index}`}
          value={item.currencyCurrentPrice || ""}
          onChange={(e) => onChange(index, e)}
          placeholder="Enter Current Price"
          disabled={disabled}
        />
        <div className="col-span-3">
          <FormInput
            label="Total Amount In INR (Auto-Calculate)"
            name={`totalAmountInr_${index}`}
            value={totalAmountInr}
            onChange={() => {}}
            placeholder="Enter Current Price"
            disabled
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <FormInput
          label="Total Qty (Pcs)"
          name={`totalQty_${index}`}
          value={item.totalQty || ""}
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
          label="No. of carton"
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
      </div>

      <div className="grid grid-cols-3 gap-4 mt-4">
        <FormInput
          label="Net Weight"
          name={`netWeight_${index}`}
          value={item.netWeight || ""}
          onChange={(e) => onChange(index, e)}
          placeholder="Enter Net Weight"
          disabled={disabled}
        />
        <FormInput
          label="Total Carton with"
          name={`totalCartonWith_${index}`}
          value={item.totalCartonWith || ""}
          onChange={(e) => onChange(index, e)}
          placeholder="Enter"
          disabled={disabled}
        />
        <FormInput
          label="Wooden pallet"
          name={`woodenPallet_${index}`}
          value={item.woodenPallet || ""}
          onChange={(e) => onChange(index, e)}
          placeholder="Enter"
          disabled={disabled}
        />
      </div>
    </div>
  );
};

export default ItemCard;
