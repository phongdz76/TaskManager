import User from "../../backend/models/User.js";
import Task from "../../backend/models/Task.js";
import Notification from "../../backend/models/Notification.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import express from "express";
import cors from "cors";
import authRoutes from "../../backend/routes/authRoutes.js";
import userRoutes from "../../backend/routes/userRoutes.js";
import taskRoutes from "../../backend/routes/taskRoutes.js";
import reportRoutes from "../../backend/routes/reportRoutes.js";
import notificationRoutes from "../../backend/routes/notificationRoutes.js";
import uploadRoutes from "../../backend/routes/uploadRoutes.js";

/**
 * Create a fully configured Express app for testing.
 * Mirrors server.js without calling listen().
 */
export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/tasks", taskRoutes);
  app.use("/api/reports", reportRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/upload", uploadRoutes);

  return app;
}

/**
 * Create a test user directly in the database.
 */
export async function createTestUser(overrides = {}) {
  const salt = await bcrypt.genSalt(10);
  const rawPassword = overrides.password || "TestPass1!";
  const hashedPassword = await bcrypt.hash(rawPassword, salt);

  const userData = {
    username: "testuser",
    email: "testuser@example.com",
    role: "user",
    ...overrides,
    password: hashedPassword,
  };

  const user = await User.create(userData);
  return user;
}

/**
 * Create a test admin user.
 */
export async function createTestAdmin(overrides = {}) {
  return createTestUser({
    username: "testadmin",
    email: "testadmin@example.com",
    role: "admin",
    ...overrides,
  });
}

/**
 * Create a Google-only user (no password).
 */
export async function createGoogleUser(overrides = {}) {
  const userData = {
    username: "googleuser",
    email: "googleuser@example.com",
    password: null,
    googleId: "google-id-12345",
    role: "user",
    ...overrides,
  };

  return User.create(userData);
}

/**
 * Generate a JWT token for a user.
 */
export function getAuthToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

/**
 * Build Authorization header object.
 */
export function buildAuthHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Create a test task directly in the database.
 */
export async function createTestTask(createdById, overrides = {}) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  const taskData = {
    title: "Test Task",
    description: "Test task description",
    priority: "Medium",
    status: "Pending",
    startDate: tomorrow,
    dueDate: nextWeek,
    assignedTo: overrides.assignedTo || [createdById],
    createdBy: createdById,
    todoChecklist: [],
    attachments: [],
    progress: 0,
    isPinned: false,
    ...overrides,
  };

  return Task.create(taskData);
}

/**
 * Create a test notification.
 */
export async function createTestNotification(recipientId, overrides = {}) {
  return Notification.create({
    recipient: recipientId,
    message: "Test notification",
    type: "general",
    isRead: false,
    ...overrides,
  });
}

/**
 * Common valid user data for registration.
 */
export const VALID_USER_DATA = {
  username: "newuser",
  email: "newuser@example.com",
  password: "StrongPass1!",
};

/**
 * Get valid task creation data.
 */
export function getValidTaskData(assignedToIds = []) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  return {
    title: "New Test Task",
    description: "A valid task for testing",
    priority: "Medium",
    startDate: tomorrow.toISOString(),
    dueDate: nextWeek.toISOString(),
    ...(assignedToIds.length > 0 && { assignedTo: assignedToIds }),
  };
}
