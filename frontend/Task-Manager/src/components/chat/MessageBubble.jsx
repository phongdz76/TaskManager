import React from "react";
import { LuReply } from "react-icons/lu";
import ChatImage from "./ChatImage";

const MESSAGE_STATUS_LABELS = {
  pending: "Đang gửi...",
  failed: "Gửi thất bại",
};

export default function MessageBubble({
  message,
  isOwnMessage,
  onRetry,
  onReply,
}) {
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

      {message.replyTo && (
        <blockquote className="mb-1 max-w-[85%] rounded-lg border-l-2 border-blue-500 bg-blue-50 px-3 py-2 text-left text-xs dark:bg-slate-700">
          <p className="font-semibold text-blue-600 dark:text-blue-300">
            {message.replyTo.sender.username}
          </p>
          <p className="mt-1 line-clamp-2 whitespace-pre-wrap break-words text-gray-500 dark:text-gray-300">
            {message.replyTo.text || "Ảnh"}
          </p>
        </blockquote>
      )}

      {message.images?.length > 0 && (
        <div className="mb-1 grid max-w-[85%] gap-1">
          {message.images.map((image) => (
            <ChatImage
              key={image.id}
              conversationId={message.conversationId}
              messageId={message.id}
              image={image}
            />
          ))}
        </div>
      )}

      {message.text && (
        <button
          type="button"
          onClick={() => onReply?.(message)}
          title="Bấm vào tin nhắn để trả lời"
          aria-label={`Trả lời tin nhắn: ${message.text}`}
          disabled={!onReply || !message.sequence}
          className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm ${
            isOwnMessage
              ? "rounded-br-md bg-blue-600 text-white"
              : "rounded-bl-md bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-100"
          } text-left focus-visible:outline-2 focus-visible:outline-blue-400`}
        >
          {message.text}
        </button>
      )}

      <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-400">
        <time dateTime={message.createdAt}>{timeLabel}</time>

        {isOwnMessage && <span>{statusLabel}</span>}

        {onReply && message.sequence && (
          <button
            type="button"
            onClick={() => onReply(message)}
            aria-label="Trả lời tin nhắn này"
            className="flex items-center gap-1 text-gray-500 hover:text-blue-600 dark:text-gray-400"
          >
            <LuReply size={13} />
            Trả lời
          </button>
        )}

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
