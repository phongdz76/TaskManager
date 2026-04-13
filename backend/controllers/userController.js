import Task from "../models/Task.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import { buildWorkspaceTeamMembersSummary } from "../utils/teamMembersSummary.js";
import { createNotification } from "./notificationController.js";

// @desc    Get all users for task assignment (any authenticated user)
// @route   GET /api/users/assignable
// @access  Private
export const getAssignableUsers = async (req, res) => {
  try {
    const users = await User.find().select(
      "_id username email profileImageUrl role",
    );
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get team members task summary (workspace-wide)
// @route   GET /api/users/team-members-summary
// @access  Private
export const getTeamMembersSummary = async (req, res) => {
  try {
    const teamMembers = await buildWorkspaceTeamMembersSummary(req.user._id);
    res.json({ teamMembers });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get all users (admin only)
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = async (req, res) => {
  try {
    const users = await User.find({ role: "user" }).select(
      "-password -googleId",
    );
    const usersWithTaskCount = await Promise.all(
      users.map(async (user) => {
        const userTaskFilter = {
          $or: [{ assignedTo: user._id }, { createdBy: user._id }],
        };

        const pendingTasks = await Task.countDocuments({
          ...userTaskFilter,
          status: "Pending",
        });
        const inProgressTasks = await Task.countDocuments({
          ...userTaskFilter,
          status: { $in: ["In-Progress", "In Progress"] },
        });
        const completedTasks = await Task.countDocuments({
          ...userTaskFilter,
          status: "Completed",
        });
        return {
          ...user._doc,
          pendingTasks,
          inProgressTasks,
          completedTasks,
        };
      }),
    );
    res.json(usersWithTaskCount);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get all admins (admin only)
// @route   GET /api/users/admins
// @access  Private/Admin
export const getAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" }).select(
      "-password -googleId",
    );
    const adminsWithTaskCount = await Promise.all(
      admins.map(async (admin) => {
        const adminTaskFilter = {
          $or: [{ assignedTo: admin._id }, { createdBy: admin._id }],
        };

        const pendingTasks = await Task.countDocuments({
          ...adminTaskFilter,
          status: "Pending",
        });
        const inProgressTasks = await Task.countDocuments({
          ...adminTaskFilter,
          status: { $in: ["In-Progress", "In Progress"] },
        });
        const completedTasks = await Task.countDocuments({
          ...adminTaskFilter,
          status: "Completed",
        });
        return {
          ...admin._doc,
          pendingTasks,
          inProgressTasks,
          completedTasks,
        };
      }),
    );
    res.json(adminsWithTaskCount);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get user by ID (any authenticated user)
// @route   GET /api/users/:id
// @access  Private
export const getUserById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    const user = await User.findById(req.params.id).select(
      "-password -googleId",
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update user role (admin only)
// @route   PATCH /api/users/:id/role
// @access  Private/Admin
export const updateUserRole = async (req, res) => {
  const { role } = req.body;
  if (!["user", "admin"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent editing another admin's role
    if (
      user.role === "admin" &&
      req.user._id.toString() !== user._id.toString()
    ) {
      return res.status(403).json({ message: "Cannot edit other admins" });
    }

    user.role = role;
    await user.save();

    if (role === "admin") {
      await createNotification(
        user._id,
        `You have been granted admin privileges`,
        "admin_granted",
        user._id,
      );
      await createNotification(
        req.user._id,
        `Admin privileges granted to user ${user.username}`,
        "admin_granted",
        user._id,
      );
    }

    res.status(200).json({ message: "User role updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete user (admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent deleting admins
    if (user.role === "admin") {
      return res.status(403).json({ message: "Cannot delete admin accounts" });
    }

    // Delete tasks created by this user, and unassign them from tasks they were assigned to
    await Task.deleteMany({ createdBy: user._id });
    await Task.updateMany(
      { assignedTo: user._id },
      { $pull: { assignedTo: user._id } }
    );
    await User.findByIdAndDelete(req.params.id);

    await createNotification(
      req.user._id,
      `User ${user.username} deleted successfully`,
      "user_deleted",
    );

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export default {
  getUsers,
  getUserById,
  getAdmins,
  getAssignableUsers,
  getTeamMembersSummary,
  updateUserRole,
  deleteUser,
};
