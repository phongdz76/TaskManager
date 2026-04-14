import React from "react";

export default function Heading({ title, subtitle, center }) {
  return (
    <div className={center ? "text-center" : "text-left"}>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{title}</h2>
      {subtitle && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{subtitle}</p>
      )}
    </div>
  );
}
