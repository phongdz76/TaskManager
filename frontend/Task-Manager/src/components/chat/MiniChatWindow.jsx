import React, { useRef } from "react";
import { LuExternalLink, LuMinus, LuX, LuMessageCircle } from "react-icons/lu";
import useChat from "../../hooks/useChat";
import ConversationPanel from "./ConversationPanel";

export default function MiniChatWindow({ windowState, onExpand }) {
  const chat = useChat();
  const { id, minimized } = windowState;
  const title = chat.conversations[id]?.title || "Cuộc trò chuyện";
  const minimizeButtonRef = useRef(null);

  const handleToggleWindow = () => {
    chat.toggleWindow(id);
    requestAnimationFrame(() => {
      if (minimized) {
        document.getElementById(`chat-composer-${id}`)?.focus();
      } else {
        minimizeButtonRef.current?.focus();
      }
    });
  };

  const handleCloseWindow = () => {
    chat.closeWindow(id);
    document.getElementById("chat-launcher")?.focus();
  };

  return (
    <section
      aria-label={`Chat nhanh: ${title}`}
      className="pointer-events-auto w-[330px] overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-xl dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100"
    >
      <header className="flex items-center gap-1 bg-blue-600 px-3 py-2 text-white">
        <button
          type="button"
          onClick={handleToggleWindow}
          className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-semibold"
          aria-label={`${minimized ? "Khôi phục" : "Thu nhỏ"} ${title}`}
          aria-expanded={!minimized}
        >
          <LuMessageCircle className="shrink-0" />
          <span className="truncate">{title}</span>
        </button>
        <button
          type="button"
          aria-label={`Mở toàn màn hình ${title}`}
          onClick={() => onExpand(id)}
          className="rounded p-1.5 hover:bg-white/15"
        >
          <LuExternalLink size={15} />
        </button>
        <button
          ref={minimizeButtonRef}
          type="button"
          aria-label={`${minimized ? "Khôi phục cửa sổ" : "Thu nhỏ cửa sổ"} ${title}`}
          onClick={handleToggleWindow}
          className="rounded p-1.5 hover:bg-white/15"
        >
          <LuMinus size={15} />
        </button>
        <button
          type="button"
          aria-label={`Đóng ${title}`}
          onClick={handleCloseWindow}
          className="rounded p-1.5 hover:bg-white/15"
        >
          <LuX size={17} />
        </button>
      </header>

      {!minimized && (
        <div className="h-[410px]">
          <ConversationPanel conversationId={id} mini />
        </div>
      )}
    </section>
  );
}
