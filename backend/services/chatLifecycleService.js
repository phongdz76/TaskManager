import Conversation from "../models/Conversation.js";
import ConversationMember from "../models/ConversationMember.js";
import Task from "../models/Task.js";
import { syncConversationMembers } from "./chatMembershipService.js";
import { getConversationAccess } from "./chatAccessService.js";
import { withChatTransaction } from "./chatService.js";
import {
  notifyUser,
  notifyConversation,
  disconnectUser,
} from "../realtime/chatEvents.js";

export async function syncTaskChat(taskId) {
  const conversation = await Conversation.findOne({ type: "task", taskId });
  if (!conversation) return;
  const members = await withChatTransaction(async (session) => {
    const previousMembers = await ConversationMember.find({
      conversationId: conversation._id,
      revokedAt: null,
    }).session(session);

    // Serialize membership updates with reassignment when two requests finish
    // in a different order from their task writes.
    const task = await Task.findOneAndUpdate(
      { _id: taskId },
      { $inc: { chatVersion: 1 } },
      { session, returnDocument: "after" },
    );

    if (task) {
      await syncConversationMembers(conversation, task, session);
    } else {
      await Conversation.updateOne(
        { _id: conversation._id },
        { $set: { archivedAt: new Date() } },
        { session },
      );
      await ConversationMember.updateMany(
        { conversationId: conversation._id },
        { $set: { revokedAt: new Date() } },
        { session },
      );
    }

    return previousMembers;
  });

  for (const member of members) {
    try {
      await getConversationAccess(conversation._id, member.userId);
    } catch (error) {
      if (![401, 403, 404].includes(error.status)) throw error;
      notifyUser(member.userId, "conversation:access-revoked", {
        conversationId: String(conversation._id),
      });
    }
  }
  await notifyConversation(conversation._id);
}

export async function syncUserChats(
  userId,
  { deleted = false, taskIds = [] } = {},
) {
  if (deleted) disconnectUser(userId);
  const memberships = await ConversationMember.find({
    userId,
    revokedAt: null,
  });
  const taskConversations = await Conversation.find({
    type: "task",
    $or: [
      { _id: { $in: memberships.map((m) => m.conversationId) } },
      { taskId: { $in: taskIds } },
    ],
  });
  for (const conversation of taskConversations)
    await syncTaskChat(conversation.taskId);
  const direct = await Conversation.find({
    type: "direct",
    directParticipants: userId,
  });
  for (const conversation of direct) await notifyConversation(conversation._id);
}
