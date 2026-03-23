import React, { useState } from "react";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";

export default function Input({
  id,
  label,
  type = "text",
  disabled,
  required,
  placeholder,
  value,
  onChange,
  error,
}) {
  const [showPassword, setShowPassword] = useState(false);

  const isPasswordField = type === "password";
  const inputType = isPasswordField && showPassword ? "text" : type;

  return (
    <div className="w-full">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          type={inputType}
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          className={`
            w-full
            px-4
            py-3
            border
            rounded-lg
            outline-none
            transition
            disabled:opacity-50
            disabled:cursor-not-allowed
            ${isPasswordField ? "pr-12" : ""}
            ${error ? "border-red-500" : "border-gray-300"}
            ${error ? "focus:border-red-500" : "focus:border-blue-500"}
          `}
        />
        {isPasswordField && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={disabled}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            {showPassword ? (
              <AiFillEyeInvisible size={20} />
            ) : (
              <AiFillEye size={20} />
            )}
          </button>
        )}
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
