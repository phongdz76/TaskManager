import React from "react";

export default function PageContainer({ children, className = "" }) {
  return (
    <div
      className={`max-w-7xl mx-auto pt-4 pb-10 animate-fade-in ${className}`.trim()}
    >
      {children}
    </div>
  );
}
