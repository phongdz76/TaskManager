import * as chatQueryService from "../services/chatQueryService.js";
import {
  openConversation,
  sendMessage,
  readConversation,
} from "../services/chatService.js";
import {
  afterCommit,
  notifyConversation,
  notifyUser,
} from "../realtime/chatEvents.js";
import { getChatImage } from "../services/chatImageService.js";

const sendChatError = (res, error) => {
  if (error.status) {
    return res.status(error.status).json({ message: error.message });
  }

  console.error("Chat request failed:", error.message);

  const transactionsUnavailable =
    error.code === 20 || error.codeName === "IllegalOperation";

  if (transactionsUnavailable) {
    return res.status(503).json({
      message: "Chat requires a MongoDB replica set",
    });
  }

  return res.status(500).json({ message: "Chat service unavailable" });
};

// @desc    Get users available for a new conversation
// @route   GET /api/chat/users
// @access  Private
export const getChatUsers = async (req, res) => {
  try {
    const result = await chatQueryService.getUsers(req.user, req.query);
    res.status(200).json(result);
  } catch (error) {
    sendChatError(res, error);
  }
};

// @desc    Create or reopen a direct conversation
// @route   POST /api/chat/conversations/direct
// @access  Private
export const openDirectConversation = async (req, res) => {
  try {
    const conversation = await openConversation(
      "direct",
      req.body.userId,
      req.user._id,
    );

    res.status(200).json(conversation);
    afterCommit(() => notifyConversation(conversation.id));
  } catch (error) {
    sendChatError(res, error);
  }
};

// @desc    Create or reopen the discussion for a task
// @route   POST /api/chat/tasks/:taskId/conversation
// @access  Private (task creator, assignee or admin)
export const openTaskConversation = async (req, res) => {
  try {
    const conversation = await openConversation(
      "task",
      req.params.taskId,
      req.user._id,
    );

    res.status(200).json(conversation);
    afterCommit(() => notifyConversation(conversation.id));
  } catch (error) {
    sendChatError(res, error);
  }
};

// @desc    Get conversations and the total unread count
// @route   GET /api/chat/conversations
// @access  Private
export const getConversations = async (req, res) => {
  try {
    const result = await chatQueryService.listConversations(
      req.user,
      req.query,
    );
    res.status(200).json(result);
  } catch (error) {
    sendChatError(res, error);
  }
};

// @desc    Get conversation details and current permissions
// @route   GET /api/chat/conversations/:id
// @access  Private (conversation participants)
export const getConversationById = async (req, res) => {
  try {
    const conversation = await chatQueryService.getConversation(
      req.params.id,
      req.user,
    );

    res.status(200).json(conversation);
  } catch (error) {
    sendChatError(res, error);
  }
};

// @desc    Get older messages or synchronize missed messages
// @route   GET /api/chat/conversations/:id/messages
// @access  Private (conversation participants)
export const getConversationMessages = async (req, res) => {
  try {
    const result = await chatQueryService.getMessages(
      req.params.id,
      req.user,
      req.query,
    );

    res.status(200).json(result);
  } catch (error) {
    sendChatError(res, error);
  }
};

// @desc    Save a message, or return the existing message on retry
// @route   POST /api/chat/conversations/:id/messages
// @access  Private (conversation participants)
export const sendConversationMessage = async (req, res) => {
  try {
    const { message, created } = await sendMessage(
      req.params.id,
      req.user._id,
      req.body,
      req.files || [],
    );

    res.status(created ? 201 : 200).json(message);

    if (created) {
      afterCommit(() => notifyConversation(req.params.id, "message:new"));
    }
  } catch (error) {
    sendChatError(res, error);
  }
};

// @desc    Advance the current user's read position
// @route   PUT /api/chat/conversations/:id/read
// @access  Private (conversation participants)
export const markConversationRead = async (req, res) => {
  try {
    const result = await readConversation(
      req.params.id,
      req.user._id,
      req.body.lastReadSequence,
    );

    res.status(200).json(result);
    afterCommit(() => notifyUser(req.user._id, "conversation:read", result));
  } catch (error) {
    sendChatError(res, error);
  }
};

// @desc    Read a private Cloudinary image after checking conversation access
// @route   GET /api/chat/conversations/:id/messages/:messageId/images/:imageId
// @access  Private (conversation participants)
export const getConversationImage = async (req, res) => {
  try {
    const { data, contentType } = await getChatImage(
      req.params.id,
      req.params.messageId,
      req.params.imageId,
      req.user._id,
    );

    res.set("Cache-Control", "private, no-store");
    res.set("X-Content-Type-Options", "nosniff");
    res.type(contentType).send(data);
  } catch (error) {
    sendChatError(res, error);
  }
};

export default {
  getChatUsers,
  openDirectConversation,
  openTaskConversation,
  getConversations,
  getConversationById,
  getConversationMessages,
  sendConversationMessage,
  markConversationRead,
  getConversationImage,
};
