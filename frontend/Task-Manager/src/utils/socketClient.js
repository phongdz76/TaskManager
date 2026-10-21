import { io } from "socket.io-client";
import { BASE_URL } from "./apiPaths";

export const createChatSocket = (token) =>
  io(import.meta.env.VITE_CHAT_SOCKET_URL || BASE_URL, {
    auth: { token },
    transports: ["websocket"],
    autoConnect: false,
  });
