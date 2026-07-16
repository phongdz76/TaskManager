import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { createApp, createTestUser, createTestAdmin, getAuthToken } from "./helpers.js";

// Mock mailer
vi.mock("../../backend/config/mailer.js", () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
}));

const app = createApp();

// ──────────────────────────────────────────
// PROTECT MIDDLEWARE
// ──────────────────────────────────────────
describe("protect middleware", () => {
  it("should allow request with valid token", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user);

    const res = await request(app)
      .get("/api/auth/profile")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it("should return 401 when no token is provided", async () => {
    const res = await request(app).get("/api/auth/profile");
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/not authorized/i);
  });

  it("should return 401 for expired token", async () => {
    const user = await createTestUser();
    const expiredToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "0s",
    });

    // Wait briefly for token to expire
    await new Promise((resolve) => setTimeout(resolve, 100));

    const res = await request(app)
      .get("/api/auth/profile")
      .set("Authorization", `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
  });

  it("should return 401 for malformed token", async () => {
    const res = await request(app)
      .get("/api/auth/profile")
      .set("Authorization", "Bearer totally.invalid.token");

    expect(res.status).toBe(401);
  });

  it("should attach user to req.user without password", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user);

    const res = await request(app)
      .get("/api/auth/profile")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(user.email);
    // password should not be in the response
    expect(res.body.password).toBeUndefined();
  });
});

// ──────────────────────────────────────────
// ADMIN ONLY MIDDLEWARE
// ──────────────────────────────────────────
describe("adminOnly middleware", () => {
  it("should allow admin to access admin-only routes", async () => {
    const admin = await createTestAdmin();
    const token = getAuthToken(admin);

    // dashboard-data is an admin-only route
    const res = await request(app)
      .get("/api/tasks/dashboard-data")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it("should return 403 for regular user on admin-only routes", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user);

    const res = await request(app)
      .get("/api/tasks/dashboard-data")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it("should return 401 for deleted user with valid token", async () => {
    const user = await createTestUser({ email: "deleted@example.com" });
    const token = getAuthToken(user);

    // Delete the user from DB
    const User = (await import("../../backend/models/User.js")).default;
    await User.findByIdAndDelete(user._id);

    const res = await request(app)
      .get("/api/auth/profile")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(401);
  });
});
