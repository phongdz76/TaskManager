import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { LuArrowDown } from "react-icons/lu";
import MessageBubble from "./MessageBubble";

export default function MessageList({
  conversationId,
  messages,
  currentUserId,
  loaded,
  error,
  hasOlder,
  lastReadSequence,
  onLoadOlder,
  onMarkRead,
  onRetry,
  onReply,
}) {
  const scrollRef = useRef(null);
  const scrollState = useRef({
    initial: true,
    nearBottom: true,
    previousHeight: null,
    lastId: null,
  });

  const [nearBottom, setNearBottom] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const handleScroll = () => {
    const container = scrollRef.current;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const isNearBottom = distanceFromBottom < 60;

    scrollState.current.nearBottom = isNearBottom;
    setNearBottom(isNearBottom);
  };

  const handleLoadOlder = async () => {
    setLoadingOlder(true);
    scrollState.current.previousHeight = scrollRef.current.scrollHeight;

    try {
      await onLoadOlder(conversationId);
    } finally {
      setLoadingOlder(false);
    }
  };

  const handleScrollToBottom = () => {
    const container = scrollRef.current;
    container.scrollTop = container.scrollHeight;
  };

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const markVisibleMessagesRead = () => {
      if (
        document.visibilityState !== "visible" ||
        !container.getClientRects().length
      ) {
        return;
      }

      const containerBounds = container.getBoundingClientRect();
      const visibleTop = Math.max(0, containerBounds.top);
      const visibleBottom = Math.min(
        window.innerHeight,
        containerBounds.bottom,
      );

      if (visibleBottom <= visibleTop) return;

      const messageElements = [
        ...container.querySelectorAll("[data-sequence]"),
      ];
      const visibleMessages = messageElements.filter((element) => {
        const bounds = element.getBoundingClientRect();
        return bounds.bottom > visibleTop && bounds.bottom <= visibleBottom + 1;
      });

      const sequence = Math.max(
        0,
        ...visibleMessages.map((element) => Number(element.dataset.sequence)),
      );

      if (sequence) {
        void onMarkRead(conversationId, sequence);
      }
    };

    const frame = requestAnimationFrame(markVisibleMessagesRead);
    const handleImageLoad = () => {
      if (scrollState.current.nearBottom) {
        container.scrollTop = container.scrollHeight;
      }
      markVisibleMessagesRead();
    };
    container.addEventListener("load", handleImageLoad, true);
    container.addEventListener("scroll", markVisibleMessagesRead);
    document.addEventListener("visibilitychange", markVisibleMessagesRead);
    window.addEventListener("focus", markVisibleMessagesRead);
    window.addEventListener("scroll", markVisibleMessagesRead, true);
    window.addEventListener("resize", markVisibleMessagesRead);

    return () => {
      cancelAnimationFrame(frame);
      container.removeEventListener("load", handleImageLoad, true);
      container.removeEventListener("scroll", markVisibleMessagesRead);
      document.removeEventListener("visibilitychange", markVisibleMessagesRead);
      window.removeEventListener("focus", markVisibleMessagesRead);
      window.removeEventListener("scroll", markVisibleMessagesRead, true);
      window.removeEventListener("resize", markVisibleMessagesRead);
    };
  }, [conversationId, messages, lastReadSequence, onMarkRead]);

  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container || !messages?.length) return;

    const previous = scrollState.current;
    const lastMessage = messages.at(-1);
    const isNewOwnMessage =
      lastMessage.sender.id === currentUserId &&
      lastMessage.id !== previous.lastId;

    if (previous.previousHeight !== null) {
      container.scrollTop += container.scrollHeight - previous.previousHeight;
      previous.previousHeight = null;
    } else if (previous.initial || previous.nearBottom || isNewOwnMessage) {
      container.scrollTop = container.scrollHeight;
    }

    previous.initial = false;
    previous.lastId = lastMessage.id;
  }, [messages, currentUserId]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3"
        aria-label="Tin nhắn trong hội thoại"
      >
        {hasOlder && (
          <button
            type="button"
            disabled={loadingOlder}
            onClick={handleLoadOlder}
            className="block mx-auto text-xs text-blue-600 disabled:opacity-50"
          >
            {loadingOlder ? "Đang tải..." : "Tải tin nhắn trước"}
          </button>
        )}

        {!loaded && !error && (
          <p role="status" className="text-center text-sm text-gray-500">
            Đang tải tin nhắn...
          </p>
        )}

        {loaded && !messages?.length && (
          <p className="py-10 text-center text-sm text-gray-500">
            Chưa có tin nhắn. Bắt đầu trao đổi tại đây.
          </p>
        )}

        {(messages || []).map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwnMessage={message.sender.id === currentUserId}
            onRetry={onRetry}
            onReply={onReply}
          />
        ))}
      </div>

      {!nearBottom && (
        <button
          type="button"
          onClick={handleScrollToBottom}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-xs shadow"
        >
          <LuArrowDown />
          Tin mới nhất
        </button>
      )}
    </div>
  );
}
