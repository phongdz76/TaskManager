import mongoose from "mongoose";
import User from "../models/User.js";
import Task from "../models/Task.js";
import Message from "../models/Message.js";
import ConversationMember from "../models/ConversationMember.js";
import { getIdString, getTaskParticipantIds } from "./chatAccessService.js";

export const buildChatUser = (user, id) =>
  user
    ? {
        id: getIdString(user),
        username: user.username,
        profileImageUrl: user.profileImageUrl,
        role: user.role,
      }
    : { id: getIdString(id), username: "Tài khoản đã xóa", deleted: true };

const buildReplyPreview = (reply, users, conversationId) => {
  if (
    !reply ||
    getIdString(reply.conversationId) !== getIdString(conversationId)
  )
    return null;

  return {
    id: getIdString(reply),
    sequence: reply.sequence,
    type: reply.type || "text",
    text: reply.text,
    sender: buildChatUser(
      users.get(getIdString(reply.senderId)),
      reply.senderId,
    ),
  };
};

export async function buildMessageResponses(messages) {
  const replyIds = messages
    .map((message) => message.replyToMessageId)
    .filter(Boolean);
  const replies = await Message.find({ _id: { $in: replyIds } }).lean();
  const replyMap = new Map(
    replies.map((message) => [getIdString(message), message]),
  );
  const users = await User.find({
    _id: { $in: [...messages, ...replies].map((message) => message.senderId) },
  })
    .select("username profileImageUrl role")
    .lean();
  const byId = new Map(users.map((u) => [getIdString(u), u]));
  return messages.map((m) => ({
    id: getIdString(m),
    conversationId: getIdString(m.conversationId),
    sender: buildChatUser(byId.get(getIdString(m.senderId)), m.senderId),
    sequence: m.sequence,
    clientMessageId: m.clientMessageId,
    text: m.text,
    type: m.type || "text",
    images: (m.images || []).map((image) => ({
      id: getIdString(image),
      originalName: image.originalName,
      format: image.format,
      width: image.width,
      height: image.height,
      bytes: image.bytes,
    })),
    replyTo: buildReplyPreview(
      replyMap.get(getIdString(m.replyToMessageId)),
      byId,
      m.conversationId,
    ),
    createdAt: m.createdAt,
  }));
}

// Batched hydration, also used by individual metadata responses.
export async function buildConversationResponses(conversations, viewerId) {
  const ids = conversations.map((c) => c._id);
  const tasks = await Task.find({
    _id: { $in: conversations.map((c) => c.taskId).filter(Boolean) },
  }).lean();
  const taskMap = new Map(tasks.map((t) => [getIdString(t), t]));
  const participantIds = conversations.flatMap((c) =>
    c.type === "direct"
      ? c.directParticipants
      : getTaskParticipantIds(
          taskMap.get(getIdString(c.taskId)) || { assignedTo: [] },
        ),
  );
  const users = await User.find({ _id: { $in: participantIds } })
    .select("username profileImageUrl role")
    .lean();
  const userMap = new Map(users.map((u) => [getIdString(u), u]));
  const members = await ConversationMember.find({
    conversationId: { $in: ids },
    userId: viewerId,
  }).lean();
  const readMap = new Map(
    members.map((m) => [getIdString(m.conversationId), m.lastReadSequence]),
  );
  const unread = ids.length
    ? await Message.aggregate([
        {
          $match: {
            conversationId: { $in: ids },
            senderId: {
              $ne: new mongoose.Types.ObjectId(getIdString(viewerId)),
            },
          },
        },
        {
          $match: {
            $or: ids.map((id) => ({
              conversationId: id,
              sequence: { $gt: readMap.get(getIdString(id)) || 0 },
            })),
          },
        },
        { $group: { _id: "$conversationId", count: { $sum: 1 } } },
      ])
    : [];
  const unreadMap = new Map(unread.map((m) => [getIdString(m), m.count]));
  const lastMessages = await Message.find({
    _id: { $in: conversations.map((c) => c.lastMessageId).filter(Boolean) },
  }).lean();
  const messageMap = new Map(
    (await buildMessageResponses(lastMessages)).map((m) => [m.id, m]),
  );
  return conversations.map((c) => {
    const task = taskMap.get(getIdString(c.taskId));
    const participants = (
      c.type === "direct"
        ? c.directParticipants.map(getIdString)
        : getTaskParticipantIds(task || { assignedTo: [] })
    ).map((id) => buildChatUser(userMap.get(id), id));
    const partner = participants.find((p) => p.id !== getIdString(viewerId));
    return {
      id: getIdString(c),
      type: c.type,
      title:
        c.type === "task"
          ? task?.title || "Công việc đã xóa"
          : partner?.username,
      participants,
      partner: c.type === "direct" ? partner : undefined,
      task: task
        ? {
            id: getIdString(task),
            title: task.title,
            status: task.status,
            priority: task.priority,
            dueDate: task.dueDate,
            progress: task.progress,
            createdBy: getIdString(task.createdBy),
            assignedTo: task.assignedTo.map(getIdString),
          }
        : undefined,
      lastMessage: messageMap.get(getIdString(c.lastMessageId)) || null,
      lastMessageAt: c.lastMessageAt,
      unreadCount: unreadMap.get(getIdString(c)) || 0,
      lastReadSequence: readMap.get(getIdString(c)) || 0,
      viewerPermissions: {
        canRead: true,
        canSend:
          !c.archivedAt &&
          (c.type === "task"
            ? Boolean(task)
            : participants.every((p) => !p.deleted)),
      },
    };
  });
}
