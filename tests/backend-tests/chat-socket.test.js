import { createServer } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { io as createClient } from "socket.io-client";
import request from "supertest";
import {
  createApp,
  createTestUser,
  createTestTask,
  getAuthToken,
} from "./helpers.js";
import { attachChatServer } from "../../backend/realtime/socketServer.js";
import { setChatIO } from "../../backend/realtime/chatEvents.js";

let server, socketServer, app, alice, bob, address;
const clients = [];
const headers = (user) => ({ Authorization: `Bearer ${getAuthToken(user)}` });

const nextEvent = (client, event) =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`Timed out waiting for ${event}`)),
      5000,
    );
    client.once(event, (data) => {
      clearTimeout(timeout);
      resolve(data);
    });
  });

const connectClient = async (user) => {
  const client = createClient(address, {
    auth: { token: getAuthToken(user) },
    transports: ["websocket"],
    forceNew: true,
    autoConnect: false,
  });
  clients.push(client);
  const connected = nextEvent(client, "connect");
  client.connect();
  await connected;
  return client;
};

beforeEach(async () => {
  app = createApp();
  [alice, bob] = await Promise.all([
    createTestUser({ username: "Alice", email: "alice@socket.test" }),
    createTestUser({ username: "Bob", email: "bob@socket.test" }),
  ]);
  server = createServer(app);
  socketServer = await attachChatServer(server);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  address = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  clients.splice(0).forEach((client) => client.disconnect());
  await new Promise((resolve) => socketServer.close(resolve));
  setChatIO(null);
});

describe("Chat realtime", () => {
  it("rejects an invalid token", async () => {
    const client = createClient(address, {
      auth: { token: "invalid" },
      transports: ["websocket"],
      autoConnect: false,
    });
    clients.push(client);
    const failed = nextEvent(client, "connect_error");
    client.connect();
    expect((await failed).message).toContain("Not authorized");
  });

  it("notifies all recipient devices after a saved REST message", async () => {
    const { body: conversation } = await request(app)
      .post("/api/chat/conversations/direct")
      .set(headers(alice))
      .send({ userId: bob.id });
    const [first, second] = await Promise.all([
      connectClient(bob),
      connectClient(bob),
    ]);
    const events = [
      nextEvent(first, "message:new"),
      nextEvent(second, "message:new"),
    ];

    const sent = await request(app)
      .post(`/api/chat/conversations/${conversation.id}/messages`)
      .set(headers(alice))
      .send({ text: "Realtime hello", clientMessageId: "socket-message" });
    expect(sent.status).toBe(201);
    for (const event of await Promise.all(events)) {
      expect(event).toEqual({ conversationId: conversation.id });
    }
    const history = await request(app)
      .get(`/api/chat/conversations/${conversation.id}/messages`)
      .set(headers(bob));
    expect(history.body.items[0].text).toBe("Realtime hello");
  });

  it("revokes an already connected device when task assignment changes", async () => {
    const task = await createTestTask(alice.id, { assignedTo: [bob.id] });
    const { body: conversation } = await request(app)
      .post(`/api/chat/tasks/${task.id}/conversation`)
      .set(headers(alice));
    const client = await connectClient(bob);
    const revoked = nextEvent(client, "conversation:access-revoked");

    const result = await request(app)
      .put(`/api/tasks/${task.id}`)
      .set(headers(alice))
      .send({ assignedTo: [alice.id] });
    expect(result.status).toBe(200);
    expect(await revoked).toEqual({ conversationId: conversation.id });
    expect(
      (
        await request(app)
          .get(`/api/chat/conversations/${conversation.id}/messages`)
          .set(headers(bob))
      ).status,
    ).toBe(403);
  });
});
