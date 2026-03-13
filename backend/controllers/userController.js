import Task from "../models/Task.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";

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
        const pendingTasks = await Task.countDocuments({
          assignedTo: user._id,
          status: "Pending",
        });
        const inProgressTasks = await Task.countDocuments({
          assignedTo: user._id,
          status: "In Progress",
        });
        const completedTasks = await Task.countDocuments({
          assignedTo: user._id,
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
    res.json(admins);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get user by ID (admin or the user themselves)
// @route   GET /api/users/:id
// @access  Private
export const getUserById = async (req, res) => {
  try {
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
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.role = role;
    await user.save();
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
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Optional: Also delete tasks assigned to this user
    await Task.deleteMany({ assignedTo: user._id });
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export default {
  getUsers,
  getUserById,
  getAdmins,
  updateUserRole,
  deleteUser,
};
