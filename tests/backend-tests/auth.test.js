import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { createApp, createTestUser, createTestAdmin, createGoogleUser, VALID_USER_DATA } from "./helpers.js";

// Mock the mailer to avoid sending real emails
vi.mock("../../backend/config/mailer.js", () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
}));

const app = createApp();

// ──────────────────────────────────────────
// REGISTER
// ──────────────────────────────────────────
describe("POST /api/auth/register", () => {
  it("should register a new user with valid data", async () => {
    const res = await request(app).post("/api/auth/register").send(VALID_USER_DATA);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("token");
    expect(res.body).toHaveProperty("_id");
    expect(res.body.name).toBe(VALID_USER_DATA.username);
    expect(res.body.email).toBe(VALID_USER_DATA.email);
    expect(res.body.role).toBe("user");
  });

  it("should return 400 when username, email, or password is missing", async () => {
    const cases = [
      { email: "a@b.com", password: "StrongPass1!" },
      { username: "user", password: "StrongPass1!" },
      { username: "user", email: "a@b.com" },
    ];

    for (const body of cases) {
      const res = await request(app).post("/api/auth/register").send(body);
      expect(res.status).toBe(400);
    }
  });

  it("should return 400 for invalid email format", async () => {
    const res = await request(app).post("/api/auth/register").send({
      username: "user",
      email: "invalid-email",
      password: "StrongPass1!",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/email/i);
  });

  it("should return 400 for weak password", async () => {
    const weakPasswords = ["short", "alllowercase1!", "ALLUPPERCASE1!", "NoSpecialChar1", "NoDigit!abc"];

    for (const password of weakPasswords) {
      const res = await request(app).post("/api/auth/register").send({
        username: "user",
        email: `test-${Date.now()}@example.com`,
        password,
      });
      expect(res.status).toBe(400);
    }
  });

  it("should return 400 for username too short or too long", async () => {
    // Too short (< 2)
    const resShort = await request(app).post("/api/auth/register").send({
      username: "a",
      email: "short@example.com",
      password: "StrongPass1!",
    });
    expect(resShort.status).toBe(400);

    // Too long (> 50)
    const resLong = await request(app).post("/api/auth/register").send({
      username: "a".repeat(51),
      email: "long@example.com",
      password: "StrongPass1!",
    });
    expect(resLong.status).toBe(400);
  });

  it("should return 400 when email already exists", async () => {
    await createTestUser({ email: "duplicate@example.com" });

    const res = await request(app).post("/api/auth/register").send({
      username: "user2",
      email: "duplicate@example.com",
      password: "StrongPass1!",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it("should register as admin with valid adminInviteToken", async () => {
    const res = await request(app).post("/api/auth/register").send({
      ...VALID_USER_DATA,
      email: "admin-invite@example.com",
      adminInviteToken: process.env.ADMIN_INVITE_TOKEN,
    });

    expect(res.status).toBe(201);
    expect(res.body.role).toBe("admin");
  });

  it("should register as user when adminInviteToken is wrong", async () => {
    const res = await request(app).post("/api/auth/register").send({
      ...VALID_USER_DATA,
      email: "wrong-token@example.com",
      adminInviteToken: "wrong-token",
    });

    expect(res.status).toBe(201);
    expect(res.body.role).toBe("user");
  });
});

// ──────────────────────────────────────────
// LOGIN
// ──────────────────────────────────────────
describe("POST /api/auth/login", () => {
  it("should login successfully with valid credentials", async () => {
    await createTestUser({ email: "login@example.com", password: "TestPass1!" });

    const res = await request(app).post("/api/auth/login").send({
      email: "login@example.com",
      password: "TestPass1!",
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.email).toBe("login@example.com");
  });

  it("should return 401 for non-existent email", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "nonexistent@example.com",
      password: "TestPass1!",
    });

    expect(res.status).toBe(401);
  });

  it("should return 401 for wrong password", async () => {
    await createTestUser({ email: "wrongpw@example.com", password: "TestPass1!" });

    const res = await request(app).post("/api/auth/login").send({
      email: "wrongpw@example.com",
      password: "WrongPassword1!",
    });

    expect(res.status).toBe(401);
  });

  it("should return 400 when email or password is missing", async () => {
    const res1 = await request(app).post("/api/auth/login").send({ password: "TestPass1!" });
    expect(res1.status).toBe(400);

    const res2 = await request(app).post("/api/auth/login").send({ email: "a@b.com" });
    expect(res2.status).toBe(400);
  });

  it("should return 400 for invalid email format", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "not-an-email",
      password: "TestPass1!",
    });

    expect(res.status).toBe(400);
  });

  it("should return 401 for Google-only account trying password login", async () => {
    await createGoogleUser({ email: "google@example.com" });

    const res = await request(app).post("/api/auth/login").send({
      email: "google@example.com",
      password: "AnyPassword1!",
    });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/google/i);
  });
});

// ──────────────────────────────────────────
// FORGOT PASSWORD
// ──────────────────────────────────────────
describe("POST /api/auth/forgot-password", () => {
  it("should return 200 with generic message for existing email", async () => {
    await createTestUser({ email: "forgot@example.com" });

    const res = await request(app).post("/api/auth/forgot-password").send({
      email: "forgot@example.com",
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/reset link/i);
  });

  it("should return 200 with same message for non-existent email (security)", async () => {
    const res = await request(app).post("/api/auth/forgot-password").send({
      email: "nonexistent@example.com",
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/reset link/i);
  });

  it("should return 400 when email is missing or invalid", async () => {
    const res1 = await request(app).post("/api/auth/forgot-password").send({});
    expect(res1.status).toBe(400);

    const res2 = await request(app).post("/api/auth/forgot-password").send({ email: "bad" });
    expect(res2.status).toBe(400);
  });
});

// ──────────────────────────────────────────
// RESET PASSWORD
// ──────────────────────────────────────────
describe("POST /api/auth/reset-password", () => {
  it("should reset password with valid token", async () => {
    const user = await createTestUser({ email: "reset@example.com", password: "OldPass1!" });

    // Generate a valid reset token (same logic as controller)
    const jwt = await import("jsonwebtoken");
    const resetToken = jwt.default.sign(
      { id: user._id },
      process.env.JWT_SECRET + user.password,
      { expiresIn: "15m" },
    );

    const res = await request(app).post("/api/auth/reset-password").send({
      resetToken,
      newPassword: "NewStrongPass1!",
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/success/i);

    // Verify can login with new password
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "reset@example.com",
      password: "NewStrongPass1!",
    });
    expect(loginRes.status).toBe(200);
  });

  it("should return 400 for invalid or expired token", async () => {
    const res = await request(app).post("/api/auth/reset-password").send({
      resetToken: "invalid-token-data",
      newPassword: "NewStrongPass1!",
    });

    expect(res.status).toBe(400);
  });

  it("should return 400 for weak new password", async () => {
    const user = await createTestUser({ email: "resetweak@example.com" });
    const jwt = await import("jsonwebtoken");
    const resetToken = jwt.default.sign(
      { id: user._id },
      process.env.JWT_SECRET + user.password,
      { expiresIn: "15m" },
    );

    const res = await request(app).post("/api/auth/reset-password").send({
      resetToken,
      newPassword: "weak",
    });

    expect(res.status).toBe(400);
  });

  it("should return 400 when token or password is missing", async () => {
    const res1 = await request(app).post("/api/auth/reset-password").send({ newPassword: "StrongPass1!" });
    expect(res1.status).toBe(400);

    const res2 = await request(app).post("/api/auth/reset-password").send({ resetToken: "some-token" });
    expect(res2.status).toBe(400);
  });
});

// ──────────────────────────────────────────
// PROFILE
// ──────────────────────────────────────────
describe("GET /api/auth/profile", () => {
  it("should return user profile when authenticated", async () => {
    const user = await createTestUser();
    const jwt = await import("jsonwebtoken");
    const token = jwt.default.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    const res = await request(app)
      .get("/api/auth/profile")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(user.email);
    expect(res.body).not.toHaveProperty("password");
    expect(res.body).toHaveProperty("hasPassword");
  });

  it("should return 401 when no token provided", async () => {
    const res = await request(app).get("/api/auth/profile");
    expect(res.status).toBe(401);
  });
});

describe("PUT /api/auth/profile", () => {
  it("should update username successfully", async () => {
    const user = await createTestUser();
    const jwt = await import("jsonwebtoken");
    const token = jwt.default.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    const res = await request(app)
      .put("/api/auth/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ username: "updatedname" });

    expect(res.status).toBe(200);
    expect(res.body.username).toBe("updatedname");
  });

  it("should update password when currentPassword is correct", async () => {
    const user = await createTestUser({ email: "changepw@example.com", password: "OldPass1!" });
    const jwt = await import("jsonwebtoken");
    const token = jwt.default.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    const res = await request(app)
      .put("/api/auth/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({
        currentPassword: "OldPass1!",
        newPassword: "NewSecurePass1!",
      });

    expect(res.status).toBe(200);

    // Verify login with new password works
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "changepw@example.com",
      password: "NewSecurePass1!",
    });
    expect(loginRes.status).toBe(200);
  });
});
