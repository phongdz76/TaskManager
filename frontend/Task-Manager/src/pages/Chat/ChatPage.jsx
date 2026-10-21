import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LuMessageCircle, LuPlus, LuRefreshCw } from "react-icons/lu";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import PageContainer from "../../components/common/PageContainer";
import ConversationList from "../../components/chat/ConversationList";
import ConversationPanel from "../../components/chat/ConversationPanel";
import ConversationInfoPanel from "../../components/chat/ConversationInfoPanel";
import NewChatDialog from "../../components/chat/NewChatDialog";
import useChat from "../../hooks/useChat";
import useUserAuth from "../../hooks/useUserAuth";

export default function ChatPage() {
  useUserAuth();

  const chat = useChat();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const conversationId = searchParams.get("conversation");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSelectConversation = (id) => {
    setSearchParams({ conversation: id });
    setShowNewChatDialog(false);
  };

  const handleBackToList = () => {
    setSearchParams({});
  };

  return (
    <DashboardLayout activeMenu="Chat">
      <PageContainer>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
              Chat
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Trao đổi với thành viên và thảo luận công việc.
            </p>
          </div>

          {chat && (
            <div className="flex items-center gap-3">
              <span
                role="status"
                className="hidden text-xs text-gray-500 sm:block"
              >
                {chat.connected ? "Đã kết nối" : "Đang đồng bộ định kỳ"}
              </span>
              <button
                type="button"
                aria-label="Làm mới chat"
                onClick={chat.resync}
                className="rounded-lg border border-gray-200 dark:border-slate-600 p-2.5 text-gray-500 dark:text-gray-300"
              >
                <LuRefreshCw size={18} />
              </button>
              <button
                type="button"
                onClick={() => setShowNewChatDialog(true)}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <LuPlus size={18} />
                Cuộc trò chuyện mới
              </button>
            </div>
          )}
        </div>

        {chat ? (
          <div className="flex h-[calc(100dvh-235px)] min-h-[420px] overflow-hidden rounded-2xl border border-gray-100 bg-white text-gray-800 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100">
            <aside
              className={`${conversationId ? "hidden md:block" : "block"} h-full w-full shrink-0 border-r border-gray-100 md:w-72 lg:w-80 dark:border-slate-700`}
            >
              <ConversationList
                selectedId={conversationId}
                onSelect={handleSelectConversation}
              />
            </aside>

            <div
              className={`${conversationId ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}
            >
              {conversationId ? (
                <ConversationPanel
                  key={conversationId}
                  conversationId={conversationId}
                  onBack={handleBackToList}
                />
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-gray-500 dark:text-gray-400">
                  <LuMessageCircle size={40} className="text-blue-500" />
                  <p className="font-semibold">Chọn một cuộc trò chuyện</p>
                  <p className="text-sm">
                    Hoặc bắt đầu nhắn tin với một thành viên.
                  </p>
                </div>
              )}
            </div>

            {conversationId && (
              <ConversationInfoPanel
                conversation={chat.conversations[conversationId]}
              />
            )}
          </div>
        ) : (
          <p role="status" className="p-6 text-sm text-gray-500">
            Đang tải chat...
          </p>
        )}

        {showNewChatDialog && chat && (
          <NewChatDialog
            onClose={() => setShowNewChatDialog(false)}
            onOpen={handleSelectConversation}
          />
        )}
      </PageContainer>
    </DashboardLayout>
  );
}
