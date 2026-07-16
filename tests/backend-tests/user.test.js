import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import {
  createApp,
  createTestUser,
  createTestAdmin,
  createTestTask,
  getAuthToken,
} from "./helpers.js";
import Task from "../../backend/models/Task.js";

// Mock mailer
vi.mock("../../backend/config/mailer.js", () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
}));

const app = createApp();

// ──────────────────────────────────────────
// GET USERS (Admin Only)
// ──────────────────────────────────────────
describe("GET /api/users", () => {
  it("should return only users with role 'user' for admin", async () => {
    const admin = await createTestAdmin();
    await createTestUser({ email: "u1@example.com", username: "u1" });
    await createTestUser({ email: "u2@example.com", username: "u2" });
    const token = getAuthToken(admin);

    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    expect(res.body.every((u) => u.role === "user")).toBe(true);
  });
});

// ──────────────────────────────────────────
// GET ADMINS
// ──────────────────────────────────────────
describe("GET /api/users/admins", () => {
  it("should return only admin users", async () => {
    const admin = await createTestAdmin();
    await createTestUser({ email: "regular@example.com" });
    const token = getAuthToken(admin);

    const res = await request(app)
      .get("/api/users/admins")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].role).toBe("admin");
  });
});

// ──────────────────────────────────────────
// GET USER BY ID
// ──────────────────────────────────────────
describe("GET /api/users/:id", () => {
  it("should return user for admin", async () => {
    const admin = await createTestAdmin();
    const user = await createTestUser({ email: "byid@example.com" });
    const token = getAuthToken(admin);

    const res = await request(app)
      .get(`/api/users/${user._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("byid@example.com");
  });

  it("should return user for self", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user);

    const res = await request(app)
      .get(`/api/users/${user._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it("should return 403 when user tries to get another user", async () => {
    const user1 = await createTestUser({ email: "u1@ex.com" });
    const user2 = await createTestUser({ email: "u2@ex.com", username: "u2" });
    const token = getAuthToken(user1);

    const res = await request(app)
      .get(`/api/users/${user2._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it("should return 400 for invalid user ID", async () => {
    const admin = await createTestAdmin();
    const token = getAuthToken(admin);

    const res = await request(app)
      .get("/api/users/invalid-id")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
  });
});

// ──────────────────────────────────────────
// UPDATE USER ROLE
// ──────────────────────────────────────────
describe("PATCH /api/users/:id/role", () => {
  it("should update user role to admin", async () => {
    const admin = await createTestAdmin();
    const user = await createTestUser({ email: "promote@example.com" });
    const token = getAuthToken(admin);

    const res = await request(app)
      .patch(`/api/users/${user._id}/role`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "admin" });

    expect(res.status).toBe(200);
  });

  it("should return 403 when trying to edit another admin's role", async () => {
    const admin1 = await createTestAdmin({ email: "admin1@example.com" });
    const admin2 = await createTestAdmin({ email: "admin2@example.com", username: "admin2" });
    const token = getAuthToken(admin1);

    const res = await request(app)
      .patch(`/api/users/${admin2._id}/role`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "user" });

    expect(res.status).toBe(403);
  });

  it("should return 400 for invalid role", async () => {
    const admin = await createTestAdmin();
    const user = await createTestUser({ email: "badrole@example.com" });
    const token = getAuthToken(admin);

    const res = await request(app)
      .patch(`/api/users/${user._id}/role`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "superadmin" });

    expect(res.status).toBe(400);
  });
});

// ──────────────────────────────────────────
// DELETE USER
// ──────────────────────────────────────────
describe("DELETE /api/users/:id", () => {
  it("should delete user and cascade tasks", async () => {
    const admin = await createTestAdmin();
    const user = await createTestUser({ email: "todelete@example.com" });
    const token = getAuthToken(admin);

    // Create tasks by this user
    await createTestTask(user._id, { title: "User Task 1" });
    await createTestTask(user._id, { title: "User Task 2" });

    const res = await request(app)
      .delete(`/api/users/${user._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);

    // Verify tasks created by user are deleted
    const remainingTasks = await Task.countDocuments({ createdBy: user._id });
    expect(remainingTasks).toBe(0);
  });

  it("should return 403 when trying to delete an admin", async () => {
    const admin1 = await createTestAdmin({ email: "adm1@example.com" });
    const admin2 = await createTestAdmin({ email: "adm2@example.com", username: "adm2" });
    const token = getAuthToken(admin1);

    const res = await request(app)
      .delete(`/api/users/${admin2._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it("should return 404 for non-existent user", async () => {
    const admin = await createTestAdmin();
    const token = getAuthToken(admin);
    const fakeId = "507f1f77bcf86cd799439011";

    const res = await request(app)
      .delete(`/api/users/${fakeId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ──────────────────────────────────────────
// ASSIGNABLE USERS & TEAM MEMBERS
// ──────────────────────────────────────────
describe("GET /api/users/assignable", () => {
  it("should return all users for any authenticated user", async () => {
    const user = await createTestUser();
    await createTestUser({ email: "a@example.com", username: "a" });
    const token = getAuthToken(user);

    const res = await request(app)
      .get("/api/users/assignable")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });
});

describe("GET /api/users/team-members-summary", () => {
  it("should return team members summary", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user);

    const res = await request(app)
      .get("/api/users/team-members-summary")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("teamMembers");
  });
});

// ──────────────────────────────────────────
// USERS WITH TASK COUNTS
// ──────────────────────────────────────────
describe("GET /api/users (with task counts)", () => {
  it("should return users with task count information", async () => {
    const admin = await createTestAdmin();
    const user = await createTestUser({ email: "counted@example.com" });
    const token = getAuthToken(admin);

    await createTestTask(user._id, { status: "Pending" });
    await createTestTask(user._id, { status: "Completed" });

    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    const targetUser = res.body.find((u) => u.email === "counted@example.com");
    expect(targetUser).toHaveProperty("pendingTasks");
    expect(targetUser).toHaveProperty("completedTasks");
  });
});
