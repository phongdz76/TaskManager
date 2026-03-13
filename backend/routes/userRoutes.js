import express from "express";
import { protect, adminOnly } from "../middlewares/authMiddleware.js";
import {
  getUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  getAdmins,
} from "../controllers/userController.js";

const router = express.Router();

router.get("/", protect, adminOnly, getUsers); // Get all users (admin only)
router.get("/admins", protect, adminOnly, getAdmins); // Get all admins (admin only)
router.get("/:id", protect, getUserById); // Get user by ID (admin or the user themselves)
router.patch("/:id/role", protect, adminOnly, updateUserRole); // Update user role (admin only)
router.delete("/:id", protect, adminOnly, deleteUser); // Delete user (admin only)

export default router;
