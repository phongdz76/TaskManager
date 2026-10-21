import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    clientMessageId: { type: String, required: true, maxlength: 100 },
    sequence: { type: Number, required: true },
    type: { type: String, default: "text", enum: ["text"] },
    text: { type: String, required: true, trim: true, maxlength: 4000 },
  },
  { timestamps: true },
);
messageSchema.index({ conversationId: 1, sequence: 1 }, { unique: true });
messageSchema.index(
  { conversationId: 1, senderId: 1, clientMessageId: 1 },
  { unique: true },
);
const Message = mongoose.model("Message", messageSchema);
export default Message;
