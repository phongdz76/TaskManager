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
router.get("/dashboard-data", protect, adminOnly, getDashboardData); // Get dashboard data (admin)
router.get("/user-dashboard-data", protect, getUserDashboardData); // Get dashboard data (user)
router.get("/", protect, getTasks); // Get all tasks (admin) or assigned/created tasks (user)
router.get("/:id", protect, getTaskById); // Get task by ID (admin, assigned user, or creator)
router.post("/", protect, createTask); // Create new task (all authenticated users)
router.put("/:id", protect, updateTask); // Update task (admin or creator)
router.delete("/:id", protect, deleteTask); // Delete task (admin or creator)
router.put("/:id/status", protect, updateTaskStatus); // Update task status (admin, assigned user, or creator)
router.put("/:id/todo", protect, updateTaskChecklist); // Update task checklist (admin, assigned user, or creator)

export default router;
