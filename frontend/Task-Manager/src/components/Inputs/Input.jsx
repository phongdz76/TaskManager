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
  helperText,
  showHelperOnFocus = false,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const isPasswordField = type === "password";
  const inputType = isPasswordField && showPassword ? "text" : type;
  const shouldShowHelperText =
    Boolean(helperText) && (!showHelperOnFocus || isFocused);

  return (
    <div className="w-full min-w-0">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
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
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          required={required}
          className={`
            w-full
            px-4
            py-3
            border
            rounded-lg
            outline-none
            transition
            bg-white
            dark:bg-slate-800
            dark:text-white
            disabled:opacity-50
            disabled:cursor-not-allowed
            ${isPasswordField ? "pr-12" : ""}
            ${error ? "border-red-500" : "border-gray-300 dark:border-slate-600"}
            ${error ? "focus:border-red-500" : "focus:border-blue-500 dark:focus:border-blue-400"}
          `}
        />
        {isPasswordField && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={disabled}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50"
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
      {shouldShowHelperText && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{helperText}</p>
      )}
    </div>
  );
}
