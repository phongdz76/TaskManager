import mongoose from "mongoose";

const conversationMemberSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Conversation",
    required: true,
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  lastReadSequence: { type: Number, default: 0 },
  joinedAt: { type: Date, default: Date.now },
  revokedAt: { type: Date, default: null },
});
conversationMemberSchema.index(
  { conversationId: 1, userId: 1 },
  { unique: true },
);
conversationMemberSchema.index({ userId: 1, revokedAt: 1, conversationId: 1 });
const ConversationMember = mongoose.model(
  "ConversationMember",
  conversationMemberSchema,
);
export default ConversationMember;
