import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import {
  createApp,
  createTestUser,
  createTestAdmin,
  createTestTask,
  getAuthToken,
  getValidTaskData,
} from "./helpers.js";

// Mock mailer
vi.mock("../../backend/config/mailer.js", () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
}));

const app = createApp();

// ──────────────────────────────────────────
// CREATE TASK
// ──────────────────────────────────────────
describe("POST /api/tasks", () => {
  it("should create a task with full data", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user);
    const taskData = getValidTaskData([user._id.toString()]);

    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send(taskData);

    expect(res.status).toBe(201);
    expect(res.body.task).toHaveProperty("_id");
    expect(res.body.task.title).toBe(taskData.title);
    expect(res.body.task.priority).toBe("Medium");
  });

  it("should create a task with only title (minimal data)", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user);

    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Minimal Task" });

    expect(res.status).toBe(201);
    expect(res.body.task.title).toBe("Minimal Task");
    // assignedTo should default to creator
    expect(res.body.task.assignedTo).toHaveLength(1);
    expect(res.body.task.assignedTo[0].toString()).toBe(user._id.toString());
  });

  it("should return 400 when title is empty", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user);

    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "" });

    expect(res.status).toBe(400);
  });

  it("should return 400 when title is too short (< 3 chars)", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user);

    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "AB" });

    expect(res.status).toBe(400);
  });

  it("should return 400 for invalid priority", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user);

    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Valid Title", priority: "Critical" });

    expect(res.status).toBe(400);
  });

  it("should return 400 when due date is in the past", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 2);

    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Past Due Task", dueDate: yesterday.toISOString() });

    expect(res.status).toBe(400);
  });

  it("should return 400 when start date is after due date", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user);

    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Bad Dates Task",
        startDate: nextMonth.toISOString(),
        dueDate: nextWeek.toISOString(),
      });

    expect(res.status).toBe(400);
  });

  it("should auto-calculate progress from todoChecklist", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user);

    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Checklist Task",
        todoChecklist: [
          { text: "Item 1", completed: true },
          { text: "Item 2", completed: false },
          { text: "Item 3", completed: true },
        ],
      });

    expect(res.status).toBe(201);
    // 2/3 = 67%
    expect(res.body.task.progress).toBe(67);
    expect(res.body.task.status).toBe("In-Progress");
  });
});

// ──────────────────────────────────────────
// GET TASKS
// ──────────────────────────────────────────
describe("GET /api/tasks", () => {
  it("should return all tasks for admin", async () => {
    const admin = await createTestAdmin();
    const user = await createTestUser({ email: "other@example.com" });
    const token = getAuthToken(admin);

    await createTestTask(user._id, { title: "User Task" });
    await createTestTask(admin._id, { title: "Admin Task" });

    const res = await request(app)
      .get("/api/tasks")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.tasks.length).toBe(2);
    expect(res.body).toHaveProperty("statusSummary");
    expect(res.body).toHaveProperty("pagination");
  });

  it("should return only assigned/created tasks for regular user", async () => {
    const user1 = await createTestUser({ email: "user1@example.com" });
    const user2 = await createTestUser({ email: "user2@example.com", username: "user2" });
    const token = getAuthToken(user1);

    await createTestTask(user1._id, { title: "My Task" });
    await createTestTask(user2._id, { title: "Other Task", assignedTo: [user2._id] });

    const res = await request(app)
      .get("/api/tasks")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.tasks.length).toBe(1);
    expect(res.body.tasks[0].title).toBe("My Task");
  });

  it("should filter tasks by status", async () => {
    const admin = await createTestAdmin();
    const token = getAuthToken(admin);

    await createTestTask(admin._id, { title: "Pending Task", status: "Pending" });
    await createTestTask(admin._id, { title: "Completed Task", status: "Completed" });

    const res = await request(app)
      .get("/api/tasks?status=Pending")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.tasks.length).toBe(1);
    expect(res.body.tasks[0].status).toBe("Pending");
  });

  it("should paginate results correctly", async () => {
    const admin = await createTestAdmin();
    const token = getAuthToken(admin);

    for (let i = 0; i < 5; i++) {
      await createTestTask(admin._id, { title: `Task ${i}` });
    }

    const res = await request(app)
      .get("/api/tasks?page=1&limit=2")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.tasks.length).toBe(2);
    expect(res.body.pagination.totalPages).toBe(3);
    expect(res.body.pagination.totalTasks).toBe(5);
  });

  it("should return correct statusSummary counts", async () => {
    const admin = await createTestAdmin();
    const token = getAuthToken(admin);

    await createTestTask(admin._id, { status: "Pending" });
    await createTestTask(admin._id, { status: "In-Progress" });
    await createTestTask(admin._id, { status: "Completed" });
    await createTestTask(admin._id, { status: "Completed" });

    const res = await request(app)
      .get("/api/tasks")
      .set("Authorization", `Bearer ${token}`);

    expect(res.body.statusSummary.total).toBe(4);
    expect(res.body.statusSummary.pending).toBe(1);
    expect(res.body.statusSummary.inProgress).toBe(1);
    expect(res.body.statusSummary.completed).toBe(2);
  });
});

// ──────────────────────────────────────────
// GET TASK BY ID
// ──────────────────────────────────────────
describe("GET /api/tasks/:id", () => {
  it("should return task for admin", async () => {
    const admin = await createTestAdmin();
    const user = await createTestUser({ email: "taskowner@example.com" });
    const task = await createTestTask(user._id);
    const token = getAuthToken(admin);

    const res = await request(app)
      .get(`/api/tasks/${task._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe(task.title);
  });

  it("should return task for assigned user", async () => {
    const user = await createTestUser();
    const task = await createTestTask(user._id, { assignedTo: [user._id] });
    const token = getAuthToken(user);

    const res = await request(app)
      .get(`/api/tasks/${task._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it("should return 403 for unrelated user", async () => {
    const creator = await createTestUser({ email: "creator@example.com" });
    const outsider = await createTestUser({ email: "outsider@example.com", username: "outsider" });
    const task = await createTestTask(creator._id, { assignedTo: [creator._id] });
    const token = getAuthToken(outsider);

    const res = await request(app)
      .get(`/api/tasks/${task._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it("should return 400 for invalid task ID", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user);

    const res = await request(app)
      .get("/api/tasks/invalid-id")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
  });
});

// ──────────────────────────────────────────
// UPDATE TASK
// ──────────────────────────────────────────
describe("PUT /api/tasks/:id", () => {
  it("should update task as admin", async () => {
    const admin = await createTestAdmin();
    const user = await createTestUser({ email: "taskuser@example.com" });
    const task = await createTestTask(user._id);
    const token = getAuthToken(admin);

    const res = await request(app)
      .put(`/api/tasks/${task._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Updated By Admin" });

    expect(res.status).toBe(200);
    expect(res.body.updatedTask.title).toBe("Updated By Admin");
  });

  it("should update task as creator", async () => {
    const user = await createTestUser();
    const task = await createTestTask(user._id);
    const token = getAuthToken(user);

    const res = await request(app)
      .put(`/api/tasks/${task._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Updated By Creator" });

    expect(res.status).toBe(200);
  });

  it("should return 403 for non-creator non-admin user", async () => {
    const creator = await createTestUser({ email: "cr@example.com" });
    const other = await createTestUser({ email: "ot@example.com", username: "other" });
    const task = await createTestTask(creator._id, { assignedTo: [other._id] });
    const token = getAuthToken(other);

    const res = await request(app)
      .put(`/api/tasks/${task._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Unauthorized Update" });

    expect(res.status).toBe(403);
  });

  it("should return 400 when trying to update status directly", async () => {
    const user = await createTestUser();
    const task = await createTestTask(user._id);
    const token = getAuthToken(user);

    const res = await request(app)
      .put(`/api/tasks/${task._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "Completed" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cannot update status/i);
  });

  it("should auto-sync progress and status when todoChecklist changes", async () => {
    const user = await createTestUser();
    const task = await createTestTask(user._id);
    const token = getAuthToken(user);

    const res = await request(app)
      .put(`/api/tasks/${task._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        todoChecklist: [
          { text: "Step 1", completed: true },
          { text: "Step 2", completed: true },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.updatedTask.progress).toBe(100);
    expect(res.body.updatedTask.status).toBe("Completed");
  });
});

// ──────────────────────────────────────────
// DELETE TASK
// ──────────────────────────────────────────
describe("DELETE /api/tasks/:id", () => {
  it("should delete task as admin", async () => {
    const admin = await createTestAdmin();
    const user = await createTestUser({ email: "del@example.com" });
    const task = await createTestTask(user._id);
    const token = getAuthToken(admin);

    const res = await request(app)
      .delete(`/api/tasks/${task._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it("should delete task as creator", async () => {
    const user = await createTestUser();
    const task = await createTestTask(user._id);
    const token = getAuthToken(user);

    const res = await request(app)
      .delete(`/api/tasks/${task._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it("should return 403 for non-creator non-admin", async () => {
    const creator = await createTestUser({ email: "c2@example.com" });
    const other = await createTestUser({ email: "o2@example.com", username: "other2" });
    const task = await createTestTask(creator._id, { assignedTo: [other._id] });
    const token = getAuthToken(other);

    const res = await request(app)
      .delete(`/api/tasks/${task._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});

// ──────────────────────────────────────────
// UPDATE STATUS
// ──────────────────────────────────────────
describe("PUT /api/tasks/:id/status", () => {
  it("should update status successfully", async () => {
    const user = await createTestUser();
    const task = await createTestTask(user._id);
    const token = getAuthToken(user);

    const res = await request(app)
      .put(`/api/tasks/${task._id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "In-Progress" });

    expect(res.status).toBe(200);
    expect(res.body.task.status).toBe("In-Progress");
  });

  it("should return 400 for invalid status", async () => {
    const user = await createTestUser();
    const task = await createTestTask(user._id);
    const token = getAuthToken(user);

    const res = await request(app)
      .put(`/api/tasks/${task._id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "Done" });

    expect(res.status).toBe(400);
  });

  it("should mark all checklist items completed when status = Completed", async () => {
    const user = await createTestUser();
    const task = await createTestTask(user._id, {
      todoChecklist: [
        { text: "Item A", completed: false },
        { text: "Item B", completed: false },
      ],
    });
    const token = getAuthToken(user);

    const res = await request(app)
      .put(`/api/tasks/${task._id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "Completed" });

    expect(res.status).toBe(200);
    expect(res.body.task.progress).toBe(100);
    expect(res.body.task.todoChecklist.every((item) => item.completed)).toBe(true);
  });
});

// ──────────────────────────────────────────
// TOGGLE PIN
// ──────────────────────────────────────────
describe("PATCH /api/tasks/:id/pin", () => {
  it("should toggle pin status", async () => {
    const user = await createTestUser();
    const task = await createTestTask(user._id, { isPinned: false });
    const token = getAuthToken(user);

    const res = await request(app)
      .patch(`/api/tasks/${task._id}/pin`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.isPinned).toBe(true);
  });

  it("should return 403 for unrelated user", async () => {
    const creator = await createTestUser({ email: "pin1@example.com" });
    const other = await createTestUser({ email: "pin2@example.com", username: "pinother" });
    const task = await createTestTask(creator._id, { assignedTo: [creator._id] });
    const token = getAuthToken(other);

    const res = await request(app)
      .patch(`/api/tasks/${task._id}/pin`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});
