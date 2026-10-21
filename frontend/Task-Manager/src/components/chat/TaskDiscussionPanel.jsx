import React, { useContext, useState } from "react";
import { Link } from "react-router-dom";
import { LuMessageCircle, LuExternalLink } from "react-icons/lu";
import { UserContext } from "../../context/userContext";
import useChat from "../../hooks/useChat";
import ConversationPanel from "./ConversationPanel";

export default function TaskDiscussionPanel({ taskId }) {
  const chat = useChat();
  const { user } = useContext(UserContext);
  const [conversationId, setConversationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const prefix = user?.role === "admin" ? "/admin" : "/user";

  const handleOpenDiscussion = async () => {
    setLoading(true);
    setError("");

    try {
      const conversation = await chat.openTask(taskId);
      if (conversation) {
        setConversationId(conversation.id);
      }
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          "Không thể mở thảo luận công việc.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!chat) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100">
      <div className="flex flex-wrap items-center justify-between gap-3 p-6">
        <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-gray-100">
          <LuMessageCircle className="text-indigo-600 dark:text-indigo-400" />
          Thảo luận công việc
        </h3>

        {conversationId && (
          <Link
            to={`${prefix}/chat?conversation=${conversationId}`}
            className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400"
          >
            Mở toàn màn hình <LuExternalLink />
          </Link>
        )}
      </div>

      {conversationId ? (
        <div className="h-[480px] border-t border-gray-100 dark:border-slate-700">
          <ConversationPanel conversationId={conversationId} />
        </div>
      ) : (
        <div className="px-6 pb-6">
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Trao đổi cùng người tạo và người được giao. Quản trị viên có quyền
            xem thảo luận.
          </p>
          {error && (
            <p role="alert" className="mb-3 text-sm text-red-500">
              {error}
            </p>
          )}
          <button
            type="button"
            disabled={loading}
            onClick={handleOpenDiscussion}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Đang mở..." : "Mở thảo luận"}
          </button>
        </div>
      )}
    </section>
  );
}
