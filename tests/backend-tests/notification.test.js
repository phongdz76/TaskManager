import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import {
  createApp,
  createTestUser,
  createTestNotification,
  getAuthToken,
} from "./helpers.js";
import { createNotification } from "../../backend/controllers/notificationController.js";

// Mock mailer
vi.mock("../../backend/config/mailer.js", () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
}));

const app = createApp();

// ──────────────────────────────────────────
// GET NOTIFICATIONS
// ──────────────────────────────────────────
describe("GET /api/notifications", () => {
  it("should return notifications for the logged-in user", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user);

    await createTestNotification(user._id, { message: "Notif 1" });
    await createTestNotification(user._id, { message: "Notif 2" });

    const res = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });
});

// ──────────────────────────────────────────
// MARK AS READ
// ──────────────────────────────────────────
describe("PUT /api/notifications/:id/read", () => {
  it("should mark notification as read", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user);
    const notif = await createTestNotification(user._id);

    const res = await request(app)
      .put(`/api/notifications/${notif._id}/read`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.isRead).toBe(true);
  });

  it("should return 401 for another user's notification", async () => {
    const user1 = await createTestUser({ email: "n1@example.com" });
    const user2 = await createTestUser({ email: "n2@example.com", username: "n2" });
    const notif = await createTestNotification(user1._id);
    const token = getAuthToken(user2);

    const res = await request(app)
      .put(`/api/notifications/${notif._id}/read`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(401);
  });

  it("should return 400 for invalid notification ID", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user);

    const res = await request(app)
      .put("/api/notifications/invalid-id/read")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it("should return 404 for non-existent notification", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user);
    const fakeId = "507f1f77bcf86cd799439011";

    const res = await request(app)
      .put(`/api/notifications/${fakeId}/read`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ──────────────────────────────────────────
// MARK ALL AS READ
// ──────────────────────────────────────────
describe("PUT /api/notifications/read-all", () => {
  it("should mark all notifications as read", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user);

    await createTestNotification(user._id, { isRead: false });
    await createTestNotification(user._id, { isRead: false });

    const res = await request(app)
      .put("/api/notifications/read-all")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);

    // Verify all are read
    const checkRes = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${token}`);

    expect(checkRes.body.every((n) => n.isRead)).toBe(true);
  });
});

// ──────────────────────────────────────────
// DELETE ALL
// ──────────────────────────────────────────
describe("DELETE /api/notifications/clear-all", () => {
  it("should delete all notifications for the user", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user);

    await createTestNotification(user._id);
    await createTestNotification(user._id);

    const res = await request(app)
      .delete("/api/notifications/clear-all")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);

    const checkRes = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${token}`);

    expect(checkRes.body.length).toBe(0);
  });
});

// ──────────────────────────────────────────
// createNotification HELPER
// ──────────────────────────────────────────
describe("createNotification helper", () => {
  it("should create a notification with correct data", async () => {
    const user = await createTestUser();

    const notif = await createNotification(
      user._id,
      "Test message",
      "task_created",
      user._id,
    );

    expect(notif).not.toBeNull();
    expect(notif.message).toBe("Test message");
    expect(notif.type).toBe("task_created");
    expect(notif.recipient.toString()).toBe(user._id.toString());
  });

  it("should return null when recipientId is null", async () => {
    const result = await createNotification(null, "msg", "general");
    expect(result).toBeNull();
  });
});
