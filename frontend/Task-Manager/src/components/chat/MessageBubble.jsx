import React from "react";

const MESSAGE_STATUS_LABELS = {
  pending: "Đang gửi...",
  failed: "Gửi thất bại",
};

export default function MessageBubble({ message, isOwnMessage, onRetry }) {
  const timeLabel = new Date(message.createdAt).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const statusLabel = MESSAGE_STATUS_LABELS[message.status] || "Đã gửi";

  return (
    <div
      data-sequence={message.sequence || undefined}
      className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"}`}
    >
      {!isOwnMessage && (
        <span className="mb-1 text-[11px] text-gray-500">
          {message.sender.username}
        </span>
      )}

      <p
        className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm ${
          isOwnMessage
            ? "rounded-br-md bg-blue-600 text-white"
            : "rounded-bl-md bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-100"
        }`}
      >
        {message.text}
      </p>

      <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-400">
        <time dateTime={message.createdAt}>{timeLabel}</time>

        {isOwnMessage && <span>{statusLabel}</span>}

        {message.status === "failed" && (
          <button
            type="button"
            onClick={() => onRetry(message)}
            className="text-red-500 underline"
          >
            Thử lại
          </button>
        )}
      </div>
    </div>
  );
}
