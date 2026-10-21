import { beforeEach, describe, expect, it, vi } from "vitest";
import { createChatStore } from "@frontend/context/chatStore.js";

const user = { _id: "alice", username: "Alice" };
const conversation = {
  id: "room",
  type: "direct",
  title: "Bob",
  lastReadSequence: 0,
  viewerPermissions: { canRead: true, canSend: true },
};

const message = (sequence, overrides = {}) => ({
  id: `message-${sequence}`,
  conversationId: "room",
  sequence,
  clientMessageId: `client-${sequence}`,
  sender: { id: "bob", username: "Bob" },
  text: `Message ${sequence}`,
  createdAt: "2026-10-22T10:00:00Z",
  ...overrides,
});

let api;

beforeEach(() => {
  api = {
    getConversation: vi.fn().mockResolvedValue(conversation),
    getConversations: vi
      .fn()
      .mockResolvedValue({
        items: [conversation],
        unreadTotal: 0,
        nextCursor: null,
      }),
    getMessages: vi
      .fn()
      .mockResolvedValue({ items: [message(1)], nextAfter: 1, hasMore: false }),
    sendMessage: vi.fn(),
    markRead: vi.fn(),
  };
});

describe("Shared chat state", () => {
  it("restores a conversation when a new authorized response grants access again", async () => {
    const store = createChatStore(user, api);
    store.removeConversation("room");

    await store.refreshList();
    expect(store.getSnapshot().revoked.room).toBe(false);
    expect(store.getSnapshot().conversationIds).toEqual(["room"]);

    await store.syncConversation("room");
    expect(store.getSnapshot().messages.room).toHaveLength(1);
  });

  it("uses the history cursor to fetch missed messages after a newer send response", async () => {
    const store = createChatStore(user, api);
    await store.syncConversation("room");

    api.sendMessage.mockResolvedValue(
      message(4, { sender: { id: "alice" }, clientMessageId: "mine" }),
    );
    await store.send("room", "Mine", "mine");

    api.getMessages.mockResolvedValue({
      items: [
        message(2),
        message(3),
        message(4, { sender: { id: "alice" }, clientMessageId: "mine" }),
      ],
      nextAfter: 4,
      hasMore: false,
    });
    await store.syncConversation("room");

    expect(api.getMessages).toHaveBeenLastCalledWith("room", {
      after: 1,
      limit: 100,
    });
    expect(
      store.getSnapshot().messages.room.map((item) => item.sequence),
    ).toEqual([1, 2, 3, 4]);
  });

  it("does not restore cached content from a request completed after revocation", async () => {
    let resolveMessages;
    api.getMessages.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveMessages = resolve;
        }),
    );
    const store = createChatStore(user, api);
    const request = store.syncConversation("room");
    await vi.waitFor(() => expect(api.getMessages).toHaveBeenCalled());

    store.setDraft("room", "Private draft");
    store.openWindow("room");
    store.removeConversation("room");
    resolveMessages({ items: [message(1)], nextAfter: 1, hasMore: false });
    await request;

    expect(store.getSnapshot().messages.room).toBeUndefined();
    expect(store.getSnapshot().drafts.room).toBeUndefined();
    expect(store.getSnapshot().windows).toEqual([]);
    expect(store.getSnapshot().revoked.room).toBe(true);
  });

  it("does not resurrect a revoked conversation from an older list response", async () => {
    let resolveList;
    api.getConversations.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveList = resolve;
        }),
    );
    const store = createChatStore(user, api);
    const request = store.refreshList();

    store.removeConversation("room");
    resolveList({ items: [conversation], unreadTotal: 0, nextCursor: null });
    await request;

    expect(store.getSnapshot().conversationIds).toEqual([]);
    expect(store.getSnapshot().conversations.room).toBeUndefined();
  });

  it("keeps the retry identity and one message after a timeout", async () => {
    const store = createChatStore(user, api);
    api.sendMessage.mockRejectedValueOnce(new Error("Timeout"));
    await store.send("room", "Hello", "retry-id");
    expect(store.getSnapshot().messages.room[0].status).toBe("failed");

    api.sendMessage.mockResolvedValueOnce(
      message(1, {
        sender: { id: "alice" },
        clientMessageId: "retry-id",
        text: "Hello",
      }),
    );
    await store.send("room", "Hello", "retry-id");

    expect(api.sendMessage).toHaveBeenNthCalledWith(2, "room", {
      text: "Hello",
      clientMessageId: "retry-id",
    });
    expect(store.getSnapshot().messages.room).toHaveLength(1);
    expect(store.getSnapshot().messages.room[0].sequence).toBe(1);
  });

  it("preserves a draft while closing the floating window", () => {
    const store = createChatStore(user, api);
    store.setDraft("room", "Draft to keep");
    store.openWindow("room");
    store.toggleWindow("room");
    expect(store.getSnapshot().windows[0].minimized).toBe(true);

    store.closeWindow("room");
    expect(store.getSnapshot().drafts.room).toBe("Draft to keep");
  });

  it("discards responses from a disposed account session", async () => {
    let resolveConversation;
    api.getConversation.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveConversation = resolve;
        }),
    );
    const store = createChatStore(user, api);
    const request = store.syncConversation("room");
    store.destroy();
    resolveConversation(conversation);
    await request;

    expect(store.getSnapshot().conversations).toEqual({});
    expect(api.getMessages).not.toHaveBeenCalled();
  });
});
