import React from "react";

const SIZES = {
  md: { base: "gap-2 px-6 py-2 text-base", icon: "w-5 h-5" },
  sm: { base: "gap-1.5 px-3 py-1.5 text-sm", icon: "w-4 h-4" },
};

const PrimaryActionButton = ({
  onClick,
  children,
  icon: Icon,
  type = "button",
  className = "",
  iconClassName,
  size = "md",
}) => {
  const sizeStyles = SIZES[size] || SIZES.md;
  return (
    <button
      type={type}
      onClick={onClick}
      className={`flex items-center bg-white border border-gray-900 text-gray-800 rounded-lg hover:bg-gray-50 transition font-medium cursor-pointer whitespace-nowrap ${sizeStyles.base} ${className}`.trim()}
    >
      {Icon ? <Icon className={iconClassName || sizeStyles.icon} /> : null}
      {children}
    </button>
  );
};

export default PrimaryActionButton;
