import express from "express";
import { protect, adminOnly } from "../middlewares/authMiddleware.js";
import {
  exportTasksReport,
  exportUsersReport,
  exportMyTasks,
  exportTeamMembers,
} from "../controllers/reportController.js";

const router = express.Router();

// User can export their own tasks
router.get("/export/my-tasks", protect, exportMyTasks); // All authenticated users can export their own tasks

// All authenticated users can export team members
router.get("/export/team-members", protect, exportTeamMembers); // All authenticated users can export team members

// Admin-only reports
router.get("/export/tasks", protect, adminOnly, exportTasksReport); // Admin-only report to export all tasks
router.get("/export/users", protect, adminOnly, exportUsersReport); // Admin-only report to export all users

export default router;
