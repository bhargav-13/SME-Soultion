import React from "react";

const PrimaryActionButton = ({
  onClick,
  children,
  icon: Icon,
  type = "button",
  className = "",
  iconClassName = "w-5 h-5",
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`flex items-center gap-2 bg-white border border-gray-900 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-50 transition font-medium cursor-pointer ${className}`.trim()}
    >
      {Icon ? <Icon className={iconClassName} /> : null}
      {children}
    </button>
  );
};

export default PrimaryActionButton;
