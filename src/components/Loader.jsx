import React from "react";

const Loader = ({ text = "Loading...", className = "" }) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-gray-200 border-t-gray-800" />
      {text && <p className="mt-3 text-sm text-gray-400">{text}</p>}
    </div>
  );
};

export default Loader;
