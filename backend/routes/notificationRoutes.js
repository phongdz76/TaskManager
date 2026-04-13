import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteAllNotifications,
} from "../controllers/notificationController.js";

const router = express.Router();

router.route("/").get(protect, getNotifications);  // Get all notifications for the authenticated user
router.route("/clear-all").delete(protect, deleteAllNotifications); // Clear all notifications for the authenticated user
router.route("/read-all").put(protect, markAllAsRead); // Mark all notifications as read for the authenticated user
router.route("/:id/read").put(protect, markAsRead); // Mark a specific notification as read

export default router;
