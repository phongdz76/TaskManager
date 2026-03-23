import React from "react";

export default function Button({
  label,
  onClick,
  disabled,
  outline,
  small,
  icon: Icon,
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full
        rounded-lg
        transition
        font-semibold
        flex
        items-center
        justify-center
        gap-2
        disabled:opacity-50
        disabled:cursor-not-allowed
        ${outline ? "bg-white" : "bg-blue-600"}
        ${outline ? "border-gray-300 border" : "border-blue-600"}
        ${outline ? "text-gray-700" : "text-white"}
        ${outline ? "hover:bg-gray-50" : "hover:bg-blue-700"}
        ${small ? "py-2 text-sm" : "py-3 text-base"}
      `}
    >
      {Icon && <Icon size={20} />}
      {label}
    </button>
  );
}
