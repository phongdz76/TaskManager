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
router.get("/export/my-tasks", protect, exportMyTasks);

// All authenticated users can export team members
router.get("/export/team-members", protect, exportTeamMembers);

// Admin-only reports
router.get("/export/tasks", protect, adminOnly, exportTasksReport);
router.get("/export/users", protect, adminOnly, exportUsersReport);

export default router;
