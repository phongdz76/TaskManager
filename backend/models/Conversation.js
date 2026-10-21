import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["direct", "task"], required: true },
    directKey: String,
    directParticipants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
    lastMessageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    lastMessageSeq: { type: Number, default: 0 },
    lastMessageAt: { type: Date, default: Date.now },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
conversationSchema.index(
  { directKey: 1 },
  { unique: true, partialFilterExpression: { type: "direct" } },
);
conversationSchema.index(
  { taskId: 1 },
  { unique: true, partialFilterExpression: { type: "task" } },
);
conversationSchema.index({ lastMessageAt: -1, _id: -1 });
const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;
