import React from "react";
import { ORDER_STATUS } from "../../utils/clientShop";

const OrderStatusBadge = ({ status, dispatchedPc, totalPc }) => {
  const config = ORDER_STATUS[status] || {
    label: status || "Unknown",
    className: "bg-gray-100 text-gray-700",
  };

  const label =
    status === "DISPATCHED" && totalPc != null
      ? `Dispatched ${dispatchedPc ?? 0}/${totalPc}`
      : config.label;

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${config.className}`}>
      {label}
    </span>
  );
};

export default OrderStatusBadge;
