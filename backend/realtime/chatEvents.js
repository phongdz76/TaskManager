import ConversationMember from "../models/ConversationMember.js";
import { getConversationAccess } from "../services/chatAccessService.js";

let io;
export const setChatIO = (server) => {
  io = server;
};
export const notifyUser = (id, event, payload) =>
  io?.to(`user:${id}`).emit(event, payload);
export const disconnectUser = (id) =>
  io?.in(`user:${id}`).disconnectSockets(true);

export async function notifyConversation(
  conversationId,
  event = "conversation:updated",
) {
  if (!io) return;
  const members = await ConversationMember.find({
    conversationId,
    revokedAt: null,
  }).lean();
  for (const member of members) {
    try {
      await getConversationAccess(conversationId, member.userId);
      // Only invalidation identifiers travel over the socket. Content is fetched
      // through the authorized REST path, including after a concurrent revoke.
      notifyUser(member.userId, event, {
        conversationId: String(conversationId),
      });
    } catch (error) {
      if ([401, 403, 404].includes(error.status))
        notifyUser(member.userId, "conversation:access-revoked", {
          conversationId: String(conversationId),
        });
      else throw error;
    }
  }
}

export function afterCommit(work) {
  // Failure to broadcast must never turn a committed send into an HTTP failure.
  Promise.resolve()
    .then(work)
    .catch((error) => console.error("Chat event failed:", error.message));
}
