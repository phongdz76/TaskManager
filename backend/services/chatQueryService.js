import mongoose from "mongoose";
import User from "../models/User.js";
import Conversation from "../models/Conversation.js";
import ConversationMember from "../models/ConversationMember.js";
import Message from "../models/Message.js";
import {
  getConversationAccess,
  createChatError,
  validateChatId,
  getIdString,
} from "./chatAccessService.js";
import {
  buildChatUser,
  buildConversationResponses,
  buildMessageResponses,
} from "./chatResponseService.js";
import {
  getChatPageLimit,
  getMessageSequence,
} from "../utils/chatValidation.js";

export async function getUsers(viewer, query) {
  const limit = getChatPageLimit(query.limit);
  if (
    query.search !== undefined &&
    (typeof query.search !== "string" || query.search.length > 100)
  )
    throw createChatError(400, "Invalid search");
  const filter = { _id: { $ne: viewer._id } };
  if (query.cursor)
    filter._id.$gt = new mongoose.Types.ObjectId(validateChatId(query.cursor));
  if (query.search?.trim())
    filter.username = {
      $regex: query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      $options: "i",
    };
  const users = await User.find(filter)
    .select("username profileImageUrl role")
    .sort({ _id: 1 })
    .limit(limit + 1)
    .lean();
  return {
    items: users.slice(0, limit).map((u) => buildChatUser(u)),
    hasMore: users.length > limit,
    nextCursor: users.length > limit ? getIdString(users[limit - 1]) : null,
  };
}

export async function listConversations(viewer, query) {
  const limit = getChatPageLimit(query.limit);
  if (query.type && !["direct", "task"].includes(query.type))
    throw createChatError(400, "Invalid conversation type");
  const memberIds = await ConversationMember.find({
    userId: viewer._id,
    revokedAt: null,
  }).distinct("conversationId");
  const allowed = await Conversation.aggregate([
    { $match: { _id: { $in: memberIds } } },
    {
      $lookup: {
        from: "tasks",
        localField: "taskId",
        foreignField: "_id",
        as: "currentTask",
      },
    },
    {
      $match: {
        $or: [
          { type: "direct", directParticipants: viewer._id },
          {
            type: "task",
            archivedAt: null,
            "currentTask.0": { $exists: true },
            ...(viewer.role === "admin"
              ? {}
              : {
                  $or: [
                    { "currentTask.createdBy": viewer._id },
                    { "currentTask.assignedTo": viewer._id },
                  ],
                }),
          },
        ],
      },
    },
    { $project: { currentTask: 0 } },
  ]);
  const allIds = allowed.map((c) => c._id);
  const unread = allIds.length
    ? await Message.aggregate([
        {
          $match: {
            conversationId: { $in: allIds },
            senderId: { $ne: viewer._id },
          },
        },
        {
          $lookup: {
            from: "conversationmembers",
            let: { cid: "$conversationId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$conversationId", "$$cid"] },
                      { $eq: ["$userId", viewer._id] },
                    ],
                  },
                },
              },
            ],
            as: "member",
          },
        },
        {
          $match: {
            $expr: {
              $gt: [
                "$sequence",
                {
                  $ifNull: [
                    { $arrayElemAt: ["$member.lastReadSequence", 0] },
                    0,
                  ],
                },
              ],
            },
          },
        },
        { $count: "total" },
      ])
    : [];
  let items = allowed.filter((c) => !query.type || c.type === query.type);
  items.sort(
    (a, b) =>
      b.lastMessageAt - a.lastMessageAt ||
      getIdString(b).localeCompare(getIdString(a)),
  );
  if (query.cursor) {
    let cursor;
    try {
      cursor = JSON.parse(Buffer.from(query.cursor, "base64url").toString());
      validateChatId(cursor.id);
      if (!Number.isFinite(cursor.time)) throw new Error();
    } catch {
      throw createChatError(400, "Invalid conversation cursor");
    }
    items = items.filter(
      (c) =>
        +c.lastMessageAt < cursor.time ||
        (+c.lastMessageAt === cursor.time && getIdString(c) < cursor.id),
    );
  }
  const page = items.slice(0, limit);
  const last = page.at(-1);
  return {
    items: await buildConversationResponses(page, viewer._id),
    hasMore: items.length > limit,
    nextCursor:
      items.length > limit
        ? Buffer.from(
            JSON.stringify({
              time: +last.lastMessageAt,
              id: getIdString(last),
            }),
          ).toString("base64url")
        : null,
    unreadTotal: unread[0]?.total || 0,
  };
}

export async function getConversation(conversationId, viewer) {
  const { conversation } = await getConversationAccess(
    conversationId,
    viewer._id,
  );
  return (await buildConversationResponses([conversation], viewer._id))[0];
}

export async function getMessages(conversationId, viewer, query) {
  await getConversationAccess(conversationId, viewer._id);
  const limit = getChatPageLimit(query.limit);
  if (query.before !== undefined && query.after !== undefined)
    throw createChatError(400, "Use before or after, not both");
  const after = query.after !== undefined;
  const filter = { conversationId: conversationId };
  if (query.before !== undefined)
    filter.sequence = { $lt: getMessageSequence(query.before) };
  if (after) filter.sequence = { $gt: getMessageSequence(query.after) };
  const messages = await Message.find(filter)
    .sort({ sequence: after ? 1 : -1 })
    .limit(limit + 1)
    .lean();
  let page = messages.slice(0, limit);
  if (!after) page = page.reverse();
  return {
    items: await buildMessageResponses(page),
    nextBefore: page[0]?.sequence ?? null,
    nextAfter: page.at(-1)?.sequence ?? null,
    hasMore: messages.length > limit,
  };
}
