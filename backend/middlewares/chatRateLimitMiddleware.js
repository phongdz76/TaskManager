import { rateLimit } from "express-rate-limit";

const createChatRateLimit = (limit) =>
  rateLimit({
    windowMs: 60_000,
    limit,
    keyGenerator: (req) => req.user._id.toString(),
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Too many chat requests, try again shortly" },
  });

export const chatRequestLimit = createChatRateLimit(600);
export const openConversationLimit = createChatRateLimit(30);
export const sendMessageLimit = createChatRateLimit(60);
