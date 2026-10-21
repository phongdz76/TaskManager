import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import ConversationMember from "../models/ConversationMember.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import Task from "../models/Task.js";
import {
  getConversationAccess,
  createChatError,
  getIdString,
  canAccessTask,
  validateChatId,
} from "./chatAccessService.js";

import {
  buildConversationResponses,
  buildMessageResponses,
} from "./chatResponseService.js";
import { syncConversationMembers } from "./chatMembershipService.js";
import {
  storeChatImages,
  deleteChatImages,
  validateChatImageFiles,
} from "./chatImageService.js";

export async function withChatTransaction(work) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(() => work(session));
  } finally {
    await session.endSession();
  }
}

export async function openConversation(type, targetId, viewerId) {
  validateChatId(targetId);
  let result;
  // Duplicate-key on concurrent upserts is outside MongoDB's automatic
  // transaction retry; start a fresh transaction to read the winner.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      result = await withChatTransaction(async (session) => {
        const viewer = await User.findById(viewerId).session(session);
        if (!viewer)
          throw createChatError(401, "Not authorized, user not found");
        let filter, data, task;
        if (type === "direct") {
          if (getIdString(viewerId) === targetId)
            throw createChatError(400, "Cannot chat with yourself");
          if (!(await User.exists({ _id: targetId }).session(session)))
            throw createChatError(404, "User not found");
          const participants = [getIdString(viewerId), targetId].sort();
          filter = { type, directKey: participants.join(":") };
          data = { ...filter, directParticipants: participants };
          await User.updateMany(
            { _id: { $in: participants } },
            { $inc: { chatVersion: 1 } },
            { session },
          );
        } else {
          task = await Task.findById(targetId).session(session);
          if (!task) throw createChatError(404, "Task not found");
          if (!canAccessTask(task, viewer))
            throw createChatError(403, "Access denied");
          await Task.updateOne(
            { _id: task._id },
            { $inc: { chatVersion: 1 } },
            { session },
          );
          await User.updateOne(
            { _id: viewerId },
            { $inc: { chatVersion: 1 } },
            { session },
          );
          filter = { type, taskId: task._id };
          data = filter;
        }
        const conversation = await Conversation.findOneAndUpdate(
          filter,
          { $setOnInsert: data },
          { upsert: true, returnDocument: "after", session },
        );
        await syncConversationMembers(conversation, task, session, viewerId);
        return conversation;
      });
      break;
    } catch (error) {
      if (error.code !== 11000 || attempt === 2) throw error;
    }
  }
  return (await buildConversationResponses([result], viewerId))[0];
}

export async function sendMessage(conversationId, viewerId, body, files = []) {
  const text = body.text === undefined ? "" : body.text;
  if (
    typeof text !== "string" ||
    (!text.trim() && !files.length) ||
    text.trim().length > 4000
  )
    throw createChatError(400, "Text must contain 1–4000 characters");
  if (
    typeof body.clientMessageId !== "string" ||
    !/^[\w-]{1,100}$/.test(body.clientMessageId)
  )
    throw createChatError(400, "Invalid clientMessageId");

  validateChatImageFiles(files);
  const filter = {
    conversationId,
    senderId: viewerId,
    clientMessageId: body.clientMessageId,
  };
  const access = await getConversationAccess(conversationId, viewerId);
  const previous = await Message.findOne(filter);

  if (previous) {
    return {
      message: (await buildMessageResponses([previous]))[0],
      created: false,
    };
  }

  if (!access.canSend) throw createChatError(409, "Conversation is read-only");

  const replyToMessageId = body.replyToMessageId || null;
  if (replyToMessageId) {
    validateChatId(replyToMessageId);
    if (!(await Message.exists({ _id: replyToMessageId, conversationId }))) {
      throw createChatError(
        400,
        "Reply must reference a message in this conversation",
      );
    }
  }

  const images = await storeChatImages(conversationId, files);
  let result;

  try {
    result = await withChatTransaction(async (session) => {
      const access = await getConversationAccess(
        conversationId,
        viewerId,
        session,
        true,
      );
      const existing = await Message.findOne(filter).session(session);
      if (existing) return { message: existing, created: false };
      if (!access.canSend)
        throw createChatError(409, "Conversation is read-only");
      const messageId = new mongoose.Types.ObjectId();
      const conversation = await Conversation.findOneAndUpdate(
        { _id: conversationId },
        {
          $inc: { lastMessageSeq: 1 },
          $set: { lastMessageId: messageId, lastMessageAt: new Date() },
        },
        { returnDocument: "after", session },
      );
      const [message] = await Message.create(
        [
          {
            _id: messageId,
            ...filter,
            sequence: conversation.lastMessageSeq,
            text: text.trim(),
            type: images.length ? "image" : "text",
            images,
            replyToMessageId,
          },
        ],
        { session },
      );
      return { message, created: true };
    });
  } catch (error) {
    // Check for a committed message before cleanup: a database timeout can leave
    // the commit outcome uncertain. Never delete an image referenced by history.
    if (images.length) {
      try {
        const referenced = await Message.exists({
          "images.publicId": { $in: images.map((image) => image.publicId) },
        });
        if (!referenced) await deleteChatImages(images);
      } catch {
        console.error("Chat image cleanup deferred after database failure");
      }
    }
    throw error;
  }

  if (!result.created && images.length) await deleteChatImages(images);
  return {
    message: (await buildMessageResponses([result.message]))[0],
    created: result.created,
  };
}

export async function readConversation(conversationId, viewerId, sequence) {
  if (!Number.isSafeInteger(sequence) || sequence < 1)
    throw createChatError(400, "Invalid lastReadSequence");
  return withChatTransaction(async (session) => {
    await getConversationAccess(conversationId, viewerId, session, true);
    if (!(await Message.exists({ conversationId, sequence }).session(session)))
      throw createChatError(400, "Message does not belong to conversation");
    const member = await ConversationMember.findOneAndUpdate(
      { conversationId, userId: viewerId },
      {
        $max: { lastReadSequence: sequence },
        $set: { revokedAt: null },
      },
      { upsert: true, returnDocument: "after", session },
    );
    return { conversationId, lastReadSequence: member.lastReadSequence };
  });
}
