import express from "express";
import { protect, adminOnly } from "../middlewares/authMiddleware.js";
import {
  getUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  getAdmins,
  getAssignableUsers,
} from "../controllers/userController.js";

const router = express.Router();

router.get("/", protect, adminOnly, getUsers); // Get all users (admin only)
router.get("/admins", protect, adminOnly, getAdmins); // Get all admins (admin only)
router.get("/assignable", protect, getAssignableUsers); // Get all users for task assignment (any user)
router.get("/:id", protect, getUserById); // Get user by ID (any authenticated user)
router.patch("/:id/role", protect, adminOnly, updateUserRole); // Update user role (admin only)
router.delete("/:id", protect, adminOnly, deleteUser); // Delete user (admin only)

export default router;
