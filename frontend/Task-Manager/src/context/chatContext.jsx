import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { UserContext } from "./userContext";
import { createChatStore } from "./chatStore";
import { createChatSocket } from "../utils/socketClient";

// eslint-disable-next-line react-refresh/only-export-components
export const ChatContext = createContext(null);

function ChatSession({ user, token, children }) {
  const [store] = useState(() => createChatStore(user));
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => {
    const socket =
      import.meta.env.VITE_CHAT_REALTIME === "false"
        ? null
        : createChatSocket(token);
    socket?.on("connect", () => {
      store.setConnected(true);
      store.resync();
    });
    socket?.on("disconnect", () => store.setConnected(false));
    socket?.on("connect_error", () => store.setConnected(false));
    for (const event of [
      "message:new",
      "conversation:updated",
      "conversation:read",
    ])
      socket?.on(event, store.handleEvent);
    socket?.on("conversation:access-revoked", ({ conversationId }) => {
      store.removeConversation(conversationId);
      void store.refreshList();
    });
    socket?.connect();
    store.resync();
    const resync = () => {
      if (document.visibilityState === "visible") store.resync();
    };
    const timer = window.setInterval(resync, 15_000);
    window.addEventListener("online", resync);
    window.addEventListener("focus", resync);
    document.addEventListener("visibilitychange", resync);
    return () => {
      socket?.disconnect();
      socket?.removeAllListeners();
      window.clearInterval(timer);
      window.removeEventListener("online", resync);
      window.removeEventListener("focus", resync);
      document.removeEventListener("visibilitychange", resync);
    };
  }, [store, token]);
  useEffect(() => store.retainSession(), [store]);
  return (
    <ChatContext.Provider value={{ ...state, ...store }}>
      {children}
    </ChatContext.Provider>
  );
}

export default function ChatProvider({ children }) {
  const { user } = useContext(UserContext);
  const token = localStorage.getItem("token");
  const userId = user?._id || user?.id;
  if (!userId || !token)
    return <ChatContext.Provider value={null}>{children}</ChatContext.Provider>;
  return (
    <ChatSession key={`${userId}:${token}`} user={user} token={token}>
      {children}
    </ChatSession>
  );
}
