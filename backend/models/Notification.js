import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        "task_created",
        "task_updated",
        "task_deleted",
        "task_assigned",
        "progress_updated",
        "checklist_completed",
        "user_deleted",
        "admin_granted",
        "general"
      ],
      default: "general",
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId, // Could be task or user ID
      required: false,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
