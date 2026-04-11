import React from "react";

export default function PageLoader({
  message = "Loading...",
  minHeightClass = "min-h-[50vh]",
  className = "",
}) {
  return (
    <div
      className={`${minHeightClass} flex flex-col items-center justify-center ${className}`.trim()}
    >
      <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
      <p className="mt-4 text-gray-500 font-medium">{message}</p>
    </div>
  );
}
