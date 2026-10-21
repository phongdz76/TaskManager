import React, { useContext, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LuMessageCircle, LuPlus, LuX } from "react-icons/lu";
import { UserContext } from "../../context/userContext";
import useChat from "../../hooks/useChat";
import ConversationList from "./ConversationList";
import MiniChatWindow from "./MiniChatWindow";
import NewChatDialog from "./NewChatDialog";

export default function FloatingChatDock() {
  const chat = useChat();
  const { user } = useContext(UserContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [showPicker, setShowPicker] = useState(false);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [width, setWidth] = useState(window.innerWidth);
  const prefix = user?.role === "admin" ? "/admin" : "/user";

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleExpandConversation = (id) => {
    setShowPicker(false);
    setShowNewChatDialog(false);
    navigate(`${prefix}/chat?conversation=${id}`);
  };

  const handleSelectConversation = (id) => {
    setShowPicker(false);
    setShowNewChatDialog(false);

    if (width < 768) {
      handleExpandConversation(id);
      return;
    }

    chat.openWindow(id);
  };

  if (!chat || !/^\/(admin|user)\//.test(location.pathname)) return null;
  if (width < 768 && location.pathname === `${prefix}/chat`) return null;

  const visibleWindows = chat.windows
    .filter((windowState) => !chat.mainPanels[windowState.id])
    .slice(width >= 1400 ? -2 : -1);

  return (
    <>
      <div className="pointer-events-none fixed bottom-0 right-5 z-40 hidden items-end gap-3 md:flex md:right-24">
        {visibleWindows.map((windowState) => (
          <MiniChatWindow
            key={windowState.id}
            windowState={windowState}
            onExpand={handleExpandConversation}
          />
        ))}
      </div>

      {showPicker && (
        <section
          aria-label="Danh sách chat nhanh"
          className="fixed bottom-24 right-4 z-40 flex h-[min(510px,70dvh)] w-[min(360px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-800 shadow-xl dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100"
        >
          <header className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-slate-700">
            <h2 className="font-bold">Chat nhanh</h2>
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Tạo chat nhanh"
                onClick={() => setShowNewChatDialog(true)}
                className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                <LuPlus />
              </button>
              <button
                type="button"
                aria-label="Đóng danh sách chat nhanh"
                onClick={() => setShowPicker(false)}
                className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                <LuX />
              </button>
            </div>
          </header>
          <div className="min-h-0 flex-1">
            <ConversationList onSelect={handleSelectConversation} />
          </div>
        </section>
      )}

      <button
        id="chat-launcher"
        type="button"
        aria-label="Chat nhanh"
        aria-expanded={showPicker}
        onClick={() => setShowPicker(!showPicker)}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700"
      >
        <LuMessageCircle size={25} />
        {chat.unreadTotal > 0 && (
          <span
            aria-label={`${chat.unreadTotal} tin chưa đọc`}
            className="absolute -right-1 -top-1 rounded-full border-2 border-white bg-red-500 px-1.5 text-[10px] leading-5 text-white dark:border-slate-800"
          >
            {chat.unreadTotal > 99 ? "99+" : chat.unreadTotal}
          </span>
        )}
      </button>

      {showNewChatDialog && (
        <NewChatDialog
          onClose={() => setShowNewChatDialog(false)}
          onOpen={handleSelectConversation}
        />
      )}
    </>
  );
}
