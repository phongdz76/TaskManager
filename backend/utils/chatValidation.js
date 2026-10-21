import { createChatError } from "../services/chatAccessService.js";

export const getChatPageLimit = (value, fallback = 30) => {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 100)
    throw createChatError(400, "Limit must be 1–100");
  return Number(value);
};
export const getMessageSequence = (value) => {
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)))
    throw createChatError(400, "Invalid message cursor");
  return Number(value);
};
