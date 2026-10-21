import React, { useContext, useEffect } from "react";
import { UserContext } from "../../context/userContext";
import useChat from "../../hooks/useChat";
import ConversationHeader from "./ConversationHeader";
import MessageList from "./MessageList";
import MessageComposer from "./MessageComposer";

export default function ConversationPanel({
  conversationId,
  mini = false,
  onBack,
}) {
  const chat = useChat();
  const { user } = useContext(UserContext);
  const { syncConversation, registerPanel } = chat;

  const conversation = chat.conversations[conversationId];
  const messages = chat.messages[conversationId];
  const error = chat.errors[conversationId];
  const accessRevoked = Boolean(chat.revoked[conversationId]);
  const currentUserId = user?._id || user?.id;
  const taskPath =
    user?.role === "admin" ? "/admin/task-details" : "/user/task-details";

  const handleDraftChange = (text) => {
    chat.setDraft(conversationId, text);
  };

  const handleSendMessage = (text) => {
    chat.setDraft(conversationId, "");
    void chat.send(conversationId, text);
  };

  const handleRetryMessage = (message) => {
    void chat.send(conversationId, message.text, message.clientMessageId);
  };

  const handleReloadMessages = () => {
    void syncConversation(conversationId);
  };

  useEffect(() => {
    if (!accessRevoked) {
      void syncConversation(conversationId);
    }
  }, [conversationId, syncConversation, accessRevoked]);

  useEffect(() => {
    if (mini) return;
    return registerPanel(conversationId);
  }, [conversationId, mini, registerPanel]);

  if (accessRevoked) {
    return (
      <div role="alert" className="p-6 text-sm text-gray-500">
        Bạn không còn quyền truy cập cuộc trò chuyện này.
      </div>
    );
  }

  return (
    <section
      aria-label="Cuộc trò chuyện"
      className="flex h-full min-h-0 flex-col bg-white dark:bg-slate-800"
    >
      <ConversationHeader
        conversation={conversation}
        mini={mini}
        onBack={onBack}
        taskPath={taskPath}
      />

      <MessageList
        key={conversationId}
        conversationId={conversationId}
        messages={messages}
        currentUserId={currentUserId}
        loaded={chat.loaded[conversationId]}
        error={error}
        hasOlder={chat.hasOlder[conversationId]}
        lastReadSequence={conversation?.lastReadSequence}
        onLoadOlder={chat.loadOlder}
        onMarkRead={chat.markRead}
        onRetry={handleRetryMessage}
      />

      {error && (
        <div role="alert" className="px-4 py-2 text-xs text-red-500">
          {error}{" "}
          <button onClick={handleReloadMessages} className="underline">
            Tải lại
          </button>
        </div>
      )}

      {conversation && !conversation.viewerPermissions.canSend ? (
        <p className="border-t border-gray-100 dark:border-slate-700 p-4 text-xs text-gray-500">
          Cuộc trò chuyện chỉ đọc. Tài khoản đối tác đã bị xóa.
        </p>
      ) : (
        <MessageComposer
          conversationId={conversationId}
          value={chat.drafts[conversationId] || ""}
          disabled={!conversation?.viewerPermissions.canSend}
          onChange={handleDraftChange}
          onSend={handleSendMessage}
        />
      )}
    </section>
  );
}
