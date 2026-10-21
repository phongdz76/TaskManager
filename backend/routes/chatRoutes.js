import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  chatRequestLimit,
  openConversationLimit,
  sendMessageLimit,
} from "../middlewares/chatRateLimitMiddleware.js";
import {
  getChatUsers,
  openDirectConversation,
  openTaskConversation,
  getConversations,
  getConversationById,
  getConversationMessages,
  sendConversationMessage,
  markConversationRead,
} from "../controllers/chatController.js";

const router = express.Router();

// Chat routes require authentication before applying per-user rate limits.
router.use(protect);
router.use(chatRequestLimit);

// Conversation management
router.get("/users", getChatUsers);
router.get("/conversations", getConversations);
router.get("/conversations/:id", getConversationById);
router.post(
  "/conversations/direct",
  openConversationLimit,
  openDirectConversation,
);
router.post(
  "/tasks/:taskId/conversation",
  openConversationLimit,
  openTaskConversation,
);

// Message history, sending and read state
router.get("/conversations/:id/messages", getConversationMessages);
router.post(
  "/conversations/:id/messages",
  sendMessageLimit,
  sendConversationMessage,
);
router.put("/conversations/:id/read", markConversationRead);

export default router;
