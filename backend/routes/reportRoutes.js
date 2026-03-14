import express from "express";
import { protect, adminOnly } from "../middlewares/authMiddleware.js";
import {
  exportTasksReport,
  exportUsersReport,
} from "../controllers/reportController.js";

const router = express.Router();

// Placeholder for report generation logic
router.get("/export/tasks", protect, adminOnly, exportTasksReport);
router.get("/export/users", protect, adminOnly, exportUsersReport);

export default router;
