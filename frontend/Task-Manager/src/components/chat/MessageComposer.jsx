import React from "react";
import { LuSend } from "react-icons/lu";

export default function MessageComposer({
  conversationId,
  value,
  onChange,
  onSend,
  disabled,
}) {
  const handleSubmit = (event) => {
    event.preventDefault();
    if (!disabled && value.trim() && value.trim().length <= 4000)
      onSend(value.trim());
  };

  const handleKeyDown = (event) => {
    const isEnter = event.key === "Enter";
    const isComposing = event.nativeEvent.isComposing || event.keyCode === 229;

    if (isEnter && !event.shiftKey && !isComposing) {
      handleSubmit(event);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-gray-100 dark:border-slate-700 p-3"
    >
      <div className="flex items-end gap-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900/50 p-2 focus-within:border-blue-500">
        <textarea
          id={`chat-composer-${conversationId}`}
          aria-label="Tin nhắn"
          rows={2}
          maxLength={4000}
          disabled={disabled}
          placeholder="Nhập tin nhắn..."
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          className="min-w-0 flex-1 resize-none bg-transparent text-sm text-gray-800 dark:text-gray-100 outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          aria-label="Gửi tin nhắn"
          disabled={disabled || !value.trim()}
          className="rounded-lg bg-blue-600 p-2.5 text-white hover:bg-blue-700 disabled:opacity-40"
        >
          <LuSend size={18} />
        </button>
      </div>
      <p className="mt-1.5 text-right text-[10px] text-gray-400">
        {value.length}/4000 · Shift+Enter xuống dòng
      </p>
    </form>
  );
}
