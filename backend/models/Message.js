import mongoose from "mongoose";

const imageSchema = new mongoose.Schema({
  publicId: { type: String, required: true },
  format: { type: String, enum: ["jpg", "png"], required: true },
  originalName: { type: String, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  bytes: { type: Number, required: true },
});

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
    type: { type: String, default: "text", enum: ["text", "image"] },
    text: { type: String, default: "", trim: true, maxlength: 4000 },
    images: { type: [imageSchema], default: [] },
    replyToMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
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
