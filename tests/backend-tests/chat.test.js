import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import {
  createApp,
  createTestUser,
  createTestAdmin,
  createTestTask,
  getAuthToken,
} from "./helpers.js";
import Conversation from "../../backend/models/Conversation.js";
import ConversationMember from "../../backend/models/ConversationMember.js";
import Message from "../../backend/models/Message.js";
import Task from "../../backend/models/Task.js";
import User from "../../backend/models/User.js";

let app, a, b, c, admin;
const as = (user) => ({ Authorization: `Bearer ${getAuthToken(user)}` });
const direct = (user = a, target = b) =>
  request(app)
    .post("/api/chat/conversations/direct")
    .set(as(user))
    .send({ userId: String(target._id) });
const send = (id, user, key, text = "Xin chào") =>
  request(app)
    .post(`/api/chat/conversations/${id}/messages`)
    .set(as(user))
    .send({ clientMessageId: key, text });
beforeEach(async () => {
  app = createApp();
  [a, b, c, admin] = await Promise.all([
    createTestUser({ email: "a@test.com", username: "Alice" }),
    createTestUser({ email: "b@test.com", username: "Bob" }),
    createTestUser({ email: "c@test.com", username: "Carol" }),
    createTestAdmin(),
  ]);
  await Promise.all([
    Conversation.init(),
    ConversationMember.init(),
    Message.init(),
  ]);
});

describe("Chat REST", () => {
  it("authenticates the directory and returns only public user fields", async () => {
    expect((await request(app).get("/api/chat/users")).status).toBe(401);
    const result = await request(app)
      .get("/api/chat/users?limit=1&search=Bob")
      .set(as(a));
    expect(result.status).toBe(200);
    expect(result.body.items).toHaveLength(1);
    expect(result.body.items[0]).toMatchObject({ username: "Bob" });
    expect(result.body.items[0]).not.toHaveProperty("email");
    expect(result.body.items[0]).not.toHaveProperty("password");
    expect(
      (await request(app).get("/api/chat/users?search=%5B").set(as(a))).status,
    ).toBe(200);
  });
  it("creates one direct conversation for concurrent opens by both participants", async () => {
    const results = await Promise.all([direct(), direct(b, a), direct()]);
    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(new Set(results.map((r) => r.body.id)).size).toBe(1);
    expect(await Conversation.countDocuments()).toBe(1);
    expect(await ConversationMember.countDocuments()).toBe(2);
    expect((await direct(a, a)).status).toBe(400);
    expect(
      (
        await request(app)
          .post("/api/chat/conversations/direct")
          .set(as(a))
          .send({ userId: String(new mongoose.Types.ObjectId()) })
      ).status,
    ).toBe(404);
  });
  it("denies outsiders and admins access to other people's direct messages", async () => {
    const { body: room } = await direct();
    for (const user of [c, admin]) {
      expect(
        (
          await request(app)
            .get(`/api/chat/conversations/${room.id}`)
            .set(as(user))
        ).status,
      ).toBe(403);
      expect(
        (
          await request(app)
            .get(`/api/chat/conversations/${room.id}/messages`)
            .set(as(user))
        ).status,
      ).toBe(403);
      expect((await send(room.id, user, "forbidden")).status).toBe(403);
      expect(
        (
          await request(app)
            .put(`/api/chat/conversations/${room.id}/read`)
            .set(as(user))
            .send({ lastReadSequence: 1 })
        ).status,
      ).toBe(403);
    }
  });
  it("deduplicates retries and concurrent sends, with contiguous committed sequences", async () => {
    const { body: room } = await direct();
    const results = await Promise.all([
      send(room.id, a, "same"),
      send(room.id, a, "same"),
      send(room.id, b, "other"),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 201, 201]);
    expect(results[0].body.id).toBe(results[1].body.id);
    expect(await Message.countDocuments()).toBe(2);
    const messages = await Message.find().sort({ sequence: 1 });
    expect(messages.map((m) => m.sequence)).toEqual([1, 2]);
    const saved = await Conversation.findById(room.id);
    expect(saved.lastMessageSeq).toBe(2);
    expect(String(saved.lastMessageId)).toBe(String(messages[1]._id));
  });
  it("paginates both directions and keeps the read watermark monotonic", async () => {
    const { body: room } = await direct();
    for (let i = 0; i < 5; i++) await send(room.id, a, `msg-${i}`);
    await send(room.id, b, "mine");
    const page = await request(app)
      .get(`/api/chat/conversations/${room.id}/messages?limit=2`)
      .set(as(b));
    expect(page.body.items.map((m) => m.sequence)).toEqual([5, 6]);
    expect(page.body.hasMore).toBe(true);
    const older = await request(app)
      .get(`/api/chat/conversations/${room.id}/messages?before=5&limit=2`)
      .set(as(b));
    expect(older.body.items.map((m) => m.sequence)).toEqual([3, 4]);
    const missed = await request(app)
      .get(`/api/chat/conversations/${room.id}/messages?after=0&limit=2`)
      .set(as(b));
    expect(missed.body.items.map((m) => m.sequence)).toEqual([1, 2]);
    expect(
      (await request(app).get("/api/chat/conversations?type=task").set(as(b)))
        .body.unreadTotal,
    ).toBe(5);
    for (const value of [4, 2]) {
      const result = await request(app)
        .put(`/api/chat/conversations/${room.id}/read`)
        .set(as(b))
        .send({ lastReadSequence: value });
      expect(result.body.lastReadSequence).toBe(4);
    }
    expect(
      (await request(app).get("/api/chat/conversations").set(as(b))).body
        .unreadTotal,
    ).toBe(1);
    expect(
      (
        await request(app)
          .put(`/api/chat/conversations/${room.id}/read`)
          .set(as(b))
          .send({ lastReadSequence: 999 })
      ).status,
    ).toBe(400);
  });
  it("rolls back both message and sequence on transaction failure", async () => {
    const { body: room } = await direct();
    const session = await mongoose.startSession();
    try {
      await expect(
        session.withTransaction(async () => {
          await Conversation.updateOne(
            { _id: room.id },
            { $inc: { lastMessageSeq: 1 } },
            { session },
          );
          await Message.create(
            [
              {
                conversationId: room.id,
                senderId: a._id,
                clientMessageId: "abort",
                sequence: 1,
                text: "not committed",
              },
            ],
            { session },
          );
          throw new Error("abort");
        }),
      ).rejects.toThrow("abort");
    } finally {
      await session.endSession();
    }
    expect(await Message.countDocuments()).toBe(0);
    expect((await Conversation.findById(room.id)).lastMessageSeq).toBe(0);
  });
  it("creates task membership for every assignee; admin follows only after opening", async () => {
    const task = await createTestTask(a._id, {
      assignedTo: [b._id, a._id, b._id],
    });
    const url = `/api/chat/tasks/${task.id}/conversation`;
    const [first, second] = await Promise.all([
      request(app).post(url).set(as(a)),
      request(app).post(url).set(as(b)),
    ]);
    expect(first.status).toBe(200);
    expect(first.body.id).toBe(second.body.id);
    expect(first.body.participants).toHaveLength(2);
    expect(
      (await request(app).get("/api/chat/conversations").set(as(b))).body.items,
    ).toHaveLength(1);
    expect(
      (await request(app).get("/api/chat/conversations").set(as(admin))).body
        .items,
    ).toHaveLength(0);
    expect((await request(app).post(url).set(as(c))).status).toBe(403);
    expect((await request(app).post(url).set(as(admin))).status).toBe(200);
    expect(
      (await request(app).get("/api/chat/conversations").set(as(admin))).body
        .items,
    ).toHaveLength(1);
  });
  it("revokes reassigned users and grants new assignees access to full history", async () => {
    const task = await createTestTask(a._id, { assignedTo: [b._id] });
    const { body: room } = await request(app)
      .post(`/api/chat/tasks/${task.id}/conversation`)
      .set(as(a));
    await send(room.id, b, "before");
    const result = await request(app)
      .put(`/api/tasks/${task.id}`)
      .set(as(a))
      .send({ assignedTo: [c.id] });
    expect(result.status).toBe(200);
    expect((await send(room.id, b, "after")).status).toBe(403);
    expect(
      (
        await request(app)
          .get(`/api/chat/conversations/${room.id}/messages`)
          .set(as(b))
      ).status,
    ).toBe(403);
    expect(
      (await request(app).get("/api/chat/conversations").set(as(b))).body.items,
    ).toHaveLength(0);
    expect(
      (await request(app).get("/api/chat/conversations").set(as(c))).body.items,
    ).toHaveLength(1);
    expect(
      (
        await request(app)
          .get(`/api/chat/conversations/${room.id}/messages`)
          .set(as(c))
      ).body.items,
    ).toHaveLength(1);
  });
  it("serializes a send racing with task reassignment", async () => {
    const task = await createTestTask(a._id, { assignedTo: [b._id] });
    const { body: room } = await request(app)
      .post(`/api/chat/tasks/${task.id}/conversation`)
      .set(as(a));
    const [, result] = await Promise.all([
      request(app)
        .put(`/api/tasks/${task.id}`)
        .set(as(a))
        .send({ assignedTo: [c.id] }),
      send(room.id, b, "racing"),
    ]);
    expect([201, 403]).toContain(result.status);
    expect((await send(room.id, b, "after-revocation")).status).toBe(403);
  });
  it("removes admin-only subscriptions after role downgrade", async () => {
    const task = await createTestTask(a._id, { assignedTo: [b._id] });
    const { body: room } = await request(app)
      .post(`/api/chat/tasks/${task.id}/conversation`)
      .set(as(admin));
    expect(
      (
        await request(app)
          .patch(`/api/users/${admin.id}/role`)
          .set(as(admin))
          .send({ role: "user" })
      ).status,
    ).toBe(200);
    expect((await send(room.id, admin, "no-longer-admin")).status).toBe(403);
    expect(
      (
        await ConversationMember.findOne({
          conversationId: room.id,
          userId: admin._id,
        })
      ).revokedAt,
    ).not.toBeNull();
  });
  it("keeps DM history read-only after deletion and revokes cascaded task rooms", async () => {
    const { body: dm } = await direct();
    await send(dm.id, a, "history");
    const task = await createTestTask(a._id, { assignedTo: [b._id] });
    const { body: room } = await request(app)
      .post(`/api/chat/tasks/${task.id}/conversation`)
      .set(as(a));
    expect(
      (await request(app).delete(`/api/users/${a.id}`).set(as(admin))).status,
    ).toBe(200);
    expect(await User.findById(a.id)).toBeNull();
    expect(await Task.findById(task.id)).toBeNull();
    const metadata = await request(app)
      .get(`/api/chat/conversations/${dm.id}`)
      .set(as(b));
    expect(metadata.body.viewerPermissions.canSend).toBe(false);
    expect(metadata.body.partner.deleted).toBe(true);
    expect(
      (
        await request(app)
          .get(`/api/chat/conversations/${dm.id}/messages`)
          .set(as(b))
      ).body.items[0].sender.deleted,
    ).toBe(true);
    expect((await send(dm.id, b, "closed")).status).toBe(409);
    expect((await send(room.id, b, "deleted-task")).status).toBe(403);
  });
  it("validates IDs, cursors and text without accepting sender identity", async () => {
    const { body: room } = await direct();
    for (const text of [" ", "x".repeat(4001), null, {}])
      expect((await send(room.id, a, "bad", text)).status).toBe(400);
    for (const query of [
      "before=bad",
      "after=-1",
      "before=2&after=0",
      "limit=101",
    ])
      expect(
        (
          await request(app)
            .get(`/api/chat/conversations/${room.id}/messages?${query}`)
            .set(as(a))
        ).status,
      ).toBe(400);
    expect(
      (await request(app).get("/api/chat/conversations/not-an-id").set(as(a)))
        .status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .get("/api/chat/conversations?cursor=broken")
          .set(as(a))
      ).status,
    ).toBe(400);
    const result = await request(app)
      .post(`/api/chat/conversations/${room.id}/messages`)
      .set(as(a))
      .send({
        senderId: c.id,
        clientMessageId: "identity",
        text: "<script>alert(1)</script>",
      });
    expect(result.body.sender.id).toBe(a.id);
  });
});
