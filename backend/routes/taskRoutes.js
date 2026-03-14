import express from "express";
import { protect, adminOnly } from "../middlewares/authMiddleware.js";

import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  updateTaskChecklist,
  getDashboardData,
  getUserDashboardData,
} from "../controllers/taskController.js";
const router = express.Router();

// Task Management Routes
router.get("/dashboard-data", protect, getDashboardData); // Get dashboard data (admin)
router.get("/user-dashboard-data", protect, getUserDashboardData); // Get dashboard data (user)
router.get("/", protect, getTasks); // Get all tasks (admin) or assigned tasks (user)
router.get("/:id", protect, getTaskById); // Get task by ID (admin or assigned user)
router.post("/", protect, adminOnly, createTask); // Create new task (admin)
router.put("/:id", protect, updateTask); // Update task (admin)
router.delete("/:id", protect, adminOnly, deleteTask); // Delete task (admin)
router.put("/:id/status", protect, updateTaskStatus); // Update task status (admin or assigned user)
router.put("/:id/todo", protect, updateTaskChecklist); // Update task checklist (admin or assigned user)

export default router;
