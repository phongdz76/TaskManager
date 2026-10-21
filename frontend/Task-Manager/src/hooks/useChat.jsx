import { useContext } from "react";
import { ChatContext } from "../context/chatContext";

export default function useChat() {
  return useContext(ChatContext);
}
