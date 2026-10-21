import { Writable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import cloudinary from "../../backend/config/cloudinary.js";
import Message from "../../backend/models/Message.js";
import Task from "../../backend/models/Task.js";
import {
  createApp,
  createTestUser,
  createTestAdmin,
  createTestTask,
  getAuthToken,
} from "./helpers.js";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8mQAAAAASUVORK5CYII=",
  "base64",
);
const headers = (user) => ({ Authorization: `Bearer ${getAuthToken(user)}` });
let app, alice, bob, outsider, admin, conversation;

const upload = (user = alice, id = conversation.id, key = "image-message") =>
  request(app)
    .post(`/api/chat/conversations/${id}/messages`)
    .set(headers(user))
    .field("clientMessageId", key)
    .attach("images", png, {
      filename: "picture.png",
      contentType: "image/png",
    });

beforeEach(async () => {
  app = createApp();
  [alice, bob, outsider, admin] = await Promise.all([
    createTestUser({ username: "Alice", email: "alice@images.test" }),
    createTestUser({ username: "Bob", email: "bob@images.test" }),
    createTestUser({ username: "Carol", email: "carol@images.test" }),
    createTestAdmin(),
  ]);
  cloudinary.config({
    cloud_name: "chat-tests",
    api_key: "test-key",
    api_secret: "test-secret",
  });
  vi.spyOn(cloudinary.uploader, "destroy").mockResolvedValue({ result: "ok" });
  vi.spyOn(cloudinary.uploader, "upload_stream").mockImplementation(
    (options, callback) =>
      new Writable({
        write(chunk, encoding, done) {
          done();
        },
        final(done) {
          callback(null, {
            public_id: options.public_id,
            format: "png",
            width: 1,
            height: 1,
            bytes: png.length,
          });
          done();
        },
      }),
  );

  const response = await request(app)
    .post("/api/chat/conversations/direct")
    .set(headers(alice))
    .send({ userId: bob.id });
  conversation = response.body;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Chat images and replies", () => {
  it("stores a private Cloudinary image and never exposes its public ID or URL", async () => {
    const result = await upload();
    expect(result.status).toBe(201);
    expect(result.body).toMatchObject({ type: "image", text: "" });
    expect(result.body.images).toHaveLength(1);
    expect(result.body.images[0]).toMatchObject({
      originalName: "picture.png",
      width: 1,
    });
    expect(result.body.images[0]).not.toHaveProperty("publicId");
    expect(result.body.images[0]).not.toHaveProperty("url");
    expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "authenticated",
        resource_type: "image",
        overwrite: false,
      }),
      expect.any(Function),
    );
    expect(
      (await Message.findById(result.body.id)).images[0].publicId,
    ).toContain("task-manager/chat/");
  });

  it("returns the same message on retry without uploading the image again", async () => {
    const first = await upload();
    const retry = await upload();
    expect(retry.status).toBe(200);
    expect(retry.body.id).toBe(first.body.id);
    expect(cloudinary.uploader.upload_stream).toHaveBeenCalledTimes(1);
  });

  it("rejects outsiders before uploading and rechecks authorization when serving an image", async () => {
    for (const user of [outsider, admin])
      expect((await upload(user)).status).toBe(403);
    expect(cloudinary.uploader.upload_stream).not.toHaveBeenCalled();
    const sent = await upload();
    const imagePath = `/api/chat/conversations/${conversation.id}/messages/${sent.body.id}/images/${sent.body.images[0].id}`;
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(png, { headers: { "content-type": "image/png" } }),
        ),
    );
    expect((await request(app).get(imagePath)).status).toBe(401);
    expect((await request(app).get(imagePath).set(headers(admin))).status).toBe(
      403,
    );
    expect(fetch).not.toHaveBeenCalled();
    const image = await request(app).get(imagePath).set(headers(bob));
    expect(image.status).toBe(200);
    expect(image.headers["content-type"]).toContain("image/png");
    expect(image.headers["cache-control"]).toBe("private, no-store");
    expect(image.body).toEqual(png);
  });

  it("rejects disguised files, oversized files and excessive image counts", async () => {
    const fake = await request(app)
      .post(`/api/chat/conversations/${conversation.id}/messages`)
      .set(headers(alice))
      .field("clientMessageId", "fake")
      .attach("images", Buffer.from("<svg onload='alert(1)' />"), {
        filename: "fake.png",
        contentType: "image/png",
      });
    expect(fake.status).toBe(400);
    const huge = await request(app)
      .post(`/api/chat/conversations/${conversation.id}/messages`)
      .set(headers(alice))
      .field("clientMessageId", "large")
      .attach("images", Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: "large.png",
        contentType: "image/png",
      });
    expect(huge.status).toBe(413);
    let many = request(app)
      .post(`/api/chat/conversations/${conversation.id}/messages`)
      .set(headers(alice))
      .field("clientMessageId", "many");
    for (let i = 0; i < 5; i++)
      many = many.attach("images", png, {
        filename: `${i}.png`,
        contentType: "image/png",
      });
    expect((await many).status).toBe(400);
    expect(cloudinary.uploader.upload_stream).not.toHaveBeenCalled();
  });

  it("cleans up uploaded images if permission is revoked during the upload", async () => {
    const task = await createTestTask(alice.id, { assignedTo: [bob.id] });
    const room = await request(app)
      .post(`/api/chat/tasks/${task.id}/conversation`)
      .set(headers(alice));
    cloudinary.uploader.upload_stream.mockImplementation(
      (options, callback) =>
        new Writable({
          write(chunk, encoding, done) {
            done();
          },
          final(done) {
            Task.updateOne(
              { _id: task.id },
              { $set: { assignedTo: [alice.id] } },
            )
              .then(() => {
                callback(null, {
                  public_id: options.public_id,
                  format: "png",
                  width: 1,
                  height: 1,
                  bytes: png.length,
                });
                done();
              })
              .catch(done);
          },
        }),
    );
    expect((await upload(bob, room.body.id)).status).toBe(403);
    expect(await Message.countDocuments()).toBe(0);
    expect(cloudinary.uploader.destroy).toHaveBeenCalledTimes(1);
  });

  it("stores a reply to text or an image and retains the quote in history", async () => {
    const parent = await upload();
    const reply = await request(app)
      .post(`/api/chat/conversations/${conversation.id}/messages`)
      .set(headers(bob))
      .send({
        text: "Đã xem ảnh",
        clientMessageId: "reply",
        replyToMessageId: parent.body.id,
      });
    expect(reply.status).toBe(201);
    expect(reply.body.replyTo).toMatchObject({
      id: parent.body.id,
      type: "image",
      sender: { username: "Alice" },
    });
    const history = await request(app)
      .get(`/api/chat/conversations/${conversation.id}/messages`)
      .set(headers(alice));
    expect(history.body.items[1].replyTo.id).toBe(parent.body.id);
  });

  it("rejects a reply to a message in another conversation", async () => {
    const parent = await upload();
    const other = await request(app)
      .post("/api/chat/conversations/direct")
      .set(headers(alice))
      .send({ userId: outsider.id });
    const reply = await request(app)
      .post(`/api/chat/conversations/${other.body.id}/messages`)
      .set(headers(alice))
      .send({
        text: "Invalid quote",
        clientMessageId: "cross-room",
        replyToMessageId: parent.body.id,
      });
    expect(reply.status).toBe(400);
  });

  it("does not upload when the referenced message or text is invalid", async () => {
    const result = await upload().field("replyToMessageId", "not-an-id");
    expect(result.status).toBe(400);
    expect(cloudinary.uploader.upload_stream).not.toHaveBeenCalled();
  });
});
