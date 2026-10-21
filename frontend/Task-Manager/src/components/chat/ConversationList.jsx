import React, { useState } from "react";
import { LuMessageCircle, LuListTodo } from "react-icons/lu";
import useChat from "../../hooks/useChat";

export default function ConversationList({ selectedId, onSelect }) {
  const chat = useChat();
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);

  const handleLoadMore = async () => {
    setLoadingMore(true);

    try {
      await chat.refreshList(chat.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  };

  const conversations = chat.conversationIds
    .map((id) => chat.conversations[id])
    .filter(Boolean)
    .filter(
      (c) =>
        (!filter || c.type === filter) &&
        c.title?.toLowerCase().includes(search.trim().toLowerCase()),
    );
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-3 p-4 border-b border-gray-100 dark:border-slate-700">
        <input
          aria-label="Tìm hội thoại"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm người hoặc công việc..."
          className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900/50 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <div className="flex gap-1" aria-label="Loại hội thoại">
          {[
            ["", "Tất cả"],
            ["direct", "Cá nhân"],
            ["task", "Công việc"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${filter === value ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {chat.loading && (
          <p className="p-4 text-sm text-gray-500" role="status">
            Đang tải hội thoại...
          </p>
        )}
        {chat.listError && (
          <div className="p-4 text-sm text-red-500" role="alert">
            {chat.listError}
            <button
              className="ml-2 underline"
              onClick={() => chat.refreshList()}
            >
              Thử lại
            </button>
          </div>
        )}
        {!chat.loading && !chat.listError && !conversations.length && (
          <p className="p-4 text-center text-sm text-gray-500">
            Chưa có hội thoại phù hợp.
          </p>
        )}
        {conversations.map((conversation) => {
          const Icon =
            conversation.type === "task" ? LuListTodo : LuMessageCircle;
          return (
            <button
              type="button"
              key={conversation.id}
              aria-label={`Mở hội thoại ${conversation.title}`}
              onClick={() => onSelect(conversation.id)}
              aria-current={conversation.id === selectedId ? "true" : undefined}
              className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${conversation.id === selectedId ? "bg-blue-50 dark:bg-blue-900/30" : "hover:bg-gray-50 dark:hover:bg-slate-700/50"}`}
            >
              {conversation.partner?.profileImageUrl ? (
                <img
                  src={conversation.partner.profileImageUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-slate-700 dark:text-blue-300">
                  <Icon size={20} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {conversation.title}
                </p>
                <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
                  {conversation.lastMessage?.text || "Bắt đầu cuộc trò chuyện"}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <time className="text-[10px] text-gray-400">
                  {new Date(conversation.lastMessageAt).toLocaleDateString(
                    "vi-VN",
                    { day: "2-digit", month: "2-digit" },
                  )}
                </time>
                {conversation.unreadCount > 0 && (
                  <span className="rounded-full bg-blue-600 px-1.5 text-[10px] leading-5 text-white">
                    {conversation.unreadCount > 99
                      ? "99+"
                      : conversation.unreadCount}
                  </span>
                )}
              </div>
            </button>
          );
        })}
        {chat.nextCursor && (
          <button
            type="button"
            disabled={loadingMore}
            onClick={handleLoadMore}
            className="w-full p-3 text-sm text-blue-600 disabled:opacity-50"
          >
            {loadingMore ? "Đang tải..." : "Tải thêm hội thoại"}
          </button>
        )}
      </div>
    </div>
  );
}
