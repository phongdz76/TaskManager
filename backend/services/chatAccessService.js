import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import User from "../models/User.js";
import Task from "../models/Task.js";

export const createChatError = (status, message) =>
  Object.assign(new Error(message), { status });
export const getIdString = (value) => String(value?._id || value);
export const getTaskParticipantIds = (task) => [
  ...new Set(
    [task.createdBy, ...task.assignedTo].filter(Boolean).map(getIdString),
  ),
];
export const canAccessTask = (task, user) =>
  Boolean(
    task &&
      (user.role === "admin" ||
        getTaskParticipantIds(task).includes(getIdString(user))),
  );
export function validateChatId(value) {
  if (typeof value !== "string" || !mongoose.isObjectIdOrHexString(value))
    throw createChatError(400, "Invalid ID");
  return value;
}

// Read current role/account and current task on every operation. Membership is
// a subscription/read watermark, never the source of permission.
export async function getConversationAccess(
  conversationId,
  userId,
  session = null,
  lock = false,
) {
  validateChatId(getIdString(conversationId));
  const user = await User.findById(userId).session(session);
  if (!user) throw createChatError(401, "Not authorized, user not found");
  const conversation =
    await Conversation.findById(conversationId).session(session);
  if (!conversation) throw createChatError(404, "Conversation not found");
  let task = null;
  let canSend = !conversation.archivedAt;
  if (conversation.type === "direct") {
    if (
      !conversation.directParticipants
        .map(getIdString)
        .includes(getIdString(user))
    )
      throw createChatError(403, "Access denied");
    const count = await User.countDocuments({
      _id: { $in: conversation.directParticipants },
    }).session(session);
    canSend = canSend && count === 2;
  } else {
    task = await Task.findById(conversation.taskId).session(session);
    if (!canAccessTask(task, user)) throw createChatError(403, "Access denied");
  }
  if (lock) {
    // Writes serialize send with deletion, role changes and reassignment across
    // instances. withTransaction retries with fresh permissions after conflicts.
    await User.updateMany(
      {
        _id: {
          $in:
            conversation.type === "direct"
              ? conversation.directParticipants
              : [user._id],
        },
      },
      { $inc: { chatVersion: 1 } },
      { session },
    );
    if (task)
      await Task.updateOne(
        { _id: task._id },
        { $inc: { chatVersion: 1 } },
        { session },
      );
  }
  return { conversation, user, task, canSend };
}
