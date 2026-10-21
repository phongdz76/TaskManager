import chatApi from "../utils/chatApi";

export const mergeMessages = (current, incoming) => {
  const merged = [...current];
  for (const message of incoming) {
    const index = merged.findIndex(
      (item) =>
        item.id === message.id ||
        (item.clientMessageId === message.clientMessageId &&
          item.sender.id === message.sender.id),
    );
    if (index < 0) {
      merged.push(message);
    } else if (!merged[index].sequence || message.sequence) {
      merged[index] = message;
    }
  }
  return merged.sort(
    (a, b) => (a.sequence || Infinity) - (b.sequence || Infinity),
  );
};
const errorMessage = (error) =>
  error?.response?.data?.message || "Không thể kết nối chat. Vui lòng thử lại.";
const emptyState = () => ({
  conversations: {},
  conversationIds: [],
  messages: {},
  drafts: {},
  imageDrafts: {},
  replyTargets: {},
  loaded: {},
  hasOlder: {},
  errors: {},
  revoked: {},
  windows: [],
  mainPanels: {},
  unreadTotal: 0,
  loading: true,
  listError: "",
  nextCursor: null,
  connected: false,
});

// A single cache belongs to the signed-in account and is shared by all views.
export function createChatStore(user, api = chatApi) {
  let state = emptyState();
  let active = true;
  let sessionVersion = 0;
  const listeners = new Set();
  const versions = new Map();
  const syncing = new Map();
  const reading = new Map();
  const syncedSequences = new Map();
  const syncAgain = new Set();
  let listing = null;
  const localImageUrls = new Map();

  const releaseImages = (id, images) => {
    for (const image of images) {
      URL.revokeObjectURL(image.previewUrl);
      localImageUrls.get(id)?.delete(image.previewUrl);
    }
  };

  const releaseAllImages = () => {
    for (const urls of localImageUrls.values()) {
      for (const url of urls) URL.revokeObjectURL(url);
    }
    localImageUrls.clear();
  };
  const update = (value) => {
    if (!active) return;
    state = { ...state, ...value };
    listeners.forEach((listener) => listener());
  };
  const valid = (id, version) => active && versions.get(id) === version;
  const saveConversation = (conversation) =>
    update({
      revoked: { ...state.revoked, [conversation.id]: false },
      conversations: {
        ...state.conversations,
        [conversation.id]: conversation,
      },
    });
  const removeConversation = (id) => {
    versions.set(id, (versions.get(id) || 0) + 1);
    syncedSequences.delete(id);
    syncAgain.delete(id);
    for (const url of localImageUrls.get(id) || []) URL.revokeObjectURL(url);
    localImageUrls.delete(id);
    const next = {};
    for (const key of [
      "conversations",
      "messages",
      "drafts",
      "imageDrafts",
      "replyTargets",
      "loaded",
      "hasOlder",
      "errors",
    ]) {
      next[key] = { ...state[key] };
      delete next[key][id];
    }
    update({
      ...next,
      conversationIds: state.conversationIds.filter((item) => item !== id),
      windows: state.windows.filter((item) => item.id !== id),
      revoked: { ...state.revoked, [id]: true },
    });
  };
  const handleError = (id, error) => {
    if ([403, 404].includes(error?.response?.status)) removeConversation(id);
    else update({ errors: { ...state.errors, [id]: errorMessage(error) } });
  };
  const refreshList = (cursor = null) => {
    if (listing) return listing;
    const requestVersions = new Map(versions);

    listing = (async () => {
      try {
        const result = await api.getConversations({
          limit: 30,
          ...(cursor ? { cursor } : {}),
        });
        if (!active) return;
        const items = result.items.filter((conversation) => {
          const id = conversation.id;
          return (requestVersions.get(id) || 0) === (versions.get(id) || 0);
        });
        const conversations = { ...state.conversations };
        const revoked = { ...state.revoked };
        for (const conversation of items) {
          conversations[conversation.id] = conversation;
          revoked[conversation.id] = false;
        }

        update({
          conversations,
          revoked,
          conversationIds: [
            ...new Set([
              ...(cursor ? state.conversationIds : []),
              ...items.map((conversation) => conversation.id),
            ]),
          ],
          unreadTotal: result.unreadTotal,
          nextCursor: result.nextCursor,
          loading: false,
          listError: "",
        });
      } catch (error) {
        update({ loading: false, listError: errorMessage(error) });
      } finally {
        listing = null;
      }
    })();
    return listing;
  };
  const syncConversation = (id) => {
    if (syncing.has(id)) return syncing.get(id);
    if (!versions.has(id)) versions.set(id, 0);
    const version = versions.get(id);
    const promise = (async () => {
      try {
        const conversation = await api.getConversation(id);
        if (!valid(id, version)) return;
        saveConversation(conversation);
        let after = syncedSequences.get(id) || 0;
        const initial = !state.loaded[id];
        let more = true;
        while (more && valid(id, version)) {
          const result = await api.getMessages(
            id,
            initial ? { limit: 30 } : { after, limit: 100 },
          );
          if (!valid(id, version)) return;
          if (result.nextAfter !== null) {
            syncedSequences.set(id, result.nextAfter);
          }
          update({
            messages: {
              ...state.messages,
              [id]: mergeMessages(state.messages[id] || [], result.items),
            },
            loaded: { ...state.loaded, [id]: true },
            hasOlder: initial
              ? { ...state.hasOlder, [id]: result.hasMore }
              : state.hasOlder,
            errors: { ...state.errors, [id]: "" },
          });
          after = result.nextAfter;
          more = !initial && result.hasMore && after !== null;
        }
      } catch (error) {
        if (valid(id, version)) handleError(id, error);
      } finally {
        syncing.delete(id);
        if (syncAgain.delete(id) && !state.revoked[id] && active) {
          void syncConversation(id);
        }
      }
    })();
    syncing.set(id, promise);
    return promise;
  };
  const loadOlder = async (id) => {
    const version = versions.get(id);
    const before = Math.min(
      ...(state.messages[id] || [])
        .filter((m) => m.sequence)
        .map((m) => m.sequence),
    );
    if (!Number.isFinite(before)) return;
    try {
      const result = await api.getMessages(id, { before, limit: 30 });
      if (!valid(id, version)) return;
      update({
        messages: {
          ...state.messages,
          [id]: mergeMessages(state.messages[id] || [], result.items),
        },
        hasOlder: { ...state.hasOlder, [id]: result.hasMore },
        errors: { ...state.errors, [id]: "" },
      });
    } catch (error) {
      if (valid(id, version)) handleError(id, error);
    }
  };
  const send = async (
    id,
    text,
    clientMessageId = crypto.randomUUID(),
    options = {},
  ) => {
    if (!active || state.revoked[id]) return;
    if (!versions.has(id)) versions.set(id, 0);
    const version = versions.get(id);
    const optimistic = {
      id: clientMessageId,
      conversationId: id,
      sender: { id: user._id || user.id, username: user.username },
      clientMessageId,
      text,
      type: options.images?.length ? "image" : "text",
      images: (options.images || []).map((image) => ({
        id: image.id,
        previewUrl: image.previewUrl,
        originalName: image.file.name,
      })),
      replyTo: options.replyTo || null,
      retryOptions: options,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    update({
      messages: {
        ...state.messages,
        [id]: mergeMessages(state.messages[id] || [], [optimistic]),
      },
    });
    try {
      const message = await api.sendMessage(id, {
        text,
        clientMessageId,
        ...(options.replyTo ? { replyToMessageId: options.replyTo.id } : {}),
        ...(options.images?.length
          ? { files: options.images.map((image) => image.file) }
          : {}),
      });
      if (!valid(id, version)) return;
      update({
        messages: {
          ...state.messages,
          [id]: mergeMessages(state.messages[id] || [], [message]),
        },
        errors: { ...state.errors, [id]: "" },
      });
      releaseImages(id, options.images || []);
      void refreshList();
    } catch (error) {
      if (!valid(id, version)) return;
      const saved = (state.messages[id] || []).some(
        (message) =>
          message.sequence &&
          message.clientMessageId === clientMessageId &&
          message.sender.id === (user._id || user.id),
      );
      if (saved) {
        releaseImages(id, options.images || []);
        return;
      }
      update({
        messages: {
          ...state.messages,
          [id]: mergeMessages(state.messages[id] || [], [
            { ...optimistic, status: "failed" },
          ]),
        },
      });
      handleError(id, error);
      if (error?.response?.status === 409) void syncConversation(id);
    }
  };
  const markRead = async (id, sequence) => {
    if (
      !sequence ||
      sequence <= (state.conversations[id]?.lastReadSequence || 0) ||
      reading.has(id) ||
      state.revoked[id]
    )
      return;
    reading.set(id, true);
    const version = versions.get(id);
    try {
      const result = await api.markRead(id, sequence);
      if (!valid(id, version)) return;
      if (state.conversations[id])
        saveConversation({
          ...state.conversations[id],
          lastReadSequence: Math.max(
            state.conversations[id].lastReadSequence,
            result.lastReadSequence,
          ),
        });
      void refreshList();
    } catch (error) {
      if (valid(id, version)) handleError(id, error);
    } finally {
      reading.delete(id);
    }
  };
  const open = async (method, targetId) => {
    const conversation = await api[method](targetId);
    if (!active) return null;
    update({ revoked: { ...state.revoked, [conversation.id]: false } });
    saveConversation(conversation);
    void refreshList();
    return conversation;
  };
  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => state,
    destroy: () => {
      active = false;
      listeners.clear();
      releaseAllImages();
    },
    retainSession: () => {
      const version = ++sessionVersion;

      return () => {
        // StrictMode sets up the next session before this microtask runs.
        queueMicrotask(() => {
          if (version === sessionVersion) {
            active = false;
            listeners.clear();
            releaseAllImages();
          }
        });
      };
    },
    refreshList,
    syncConversation,
    loadOlder,
    send,
    submitMessage: (id, text) => {
      const options = {
        images: state.imageDrafts[id] || [],
        replyTo: state.replyTargets[id] || null,
      };
      update({
        drafts: { ...state.drafts, [id]: "" },
        imageDrafts: { ...state.imageDrafts, [id]: [] },
        replyTargets: { ...state.replyTargets, [id]: null },
      });
      return send(id, text, crypto.randomUUID(), options);
    },
    addDraftImages: (id, files) => {
      if ((state.imageDrafts[id]?.length || 0) + files.length > 4) return;
      if (!localImageUrls.has(id)) localImageUrls.set(id, new Set());
      const images = files.map((file) => {
        const previewUrl = URL.createObjectURL(file);
        localImageUrls.get(id).add(previewUrl);
        return { id: crypto.randomUUID(), file, previewUrl };
      });
      update({
        imageDrafts: {
          ...state.imageDrafts,
          [id]: [...(state.imageDrafts[id] || []), ...images],
        },
      });
    },
    removeDraftImage: (id, imageId) => {
      const images = state.imageDrafts[id] || [];
      releaseImages(
        id,
        images.filter((image) => image.id === imageId),
      );
      update({
        imageDrafts: {
          ...state.imageDrafts,
          [id]: images.filter((image) => image.id !== imageId),
        },
      });
    },
    setReplyTarget: (id, message) =>
      update({
        replyTargets: {
          ...state.replyTargets,
          [id]: message
            ? {
                id: message.id,
                sequence: message.sequence,
                text: message.text,
                sender: message.sender,
                type: message.type,
              }
            : null,
        },
      }),
    markRead,
    removeConversation,
    setConnected: (connected) => update({ connected }),
    setDraft: (id, text) => update({ drafts: { ...state.drafts, [id]: text } }),
    openDirect: (id) => open("openDirect", id),
    openTask: (id) => open("openTask", id),
    registerPanel: (id) => {
      update({
        mainPanels: {
          ...state.mainPanels,
          [id]: (state.mainPanels[id] || 0) + 1,
        },
      });
      return () =>
        update({
          mainPanels: {
            ...state.mainPanels,
            [id]: Math.max(0, (state.mainPanels[id] || 0) - 1),
          },
        });
    },
    openWindow: (id) => {
      if (state.mainPanels[id]) {
        document.getElementById(`chat-composer-${id}`)?.focus();
        return;
      }
      const max = window.innerWidth >= 1400 ? 2 : 1;
      update({
        windows: [
          ...state.windows.filter((w) => w.id !== id),
          { id, minimized: false },
        ].slice(-max),
      });
    },
    closeWindow: (id) =>
      update({ windows: state.windows.filter((w) => w.id !== id) }),
    toggleWindow: (id) =>
      update({
        windows: state.windows.map((w) =>
          w.id === id ? { ...w, minimized: !w.minimized } : w,
        ),
      }),
    resync: () => {
      void refreshList();
      Object.keys(state.loaded).forEach((id) => void syncConversation(id));
    },
    handleEvent: ({ conversationId }) => {
      void refreshList();
      if (syncing.has(conversationId)) {
        syncAgain.add(conversationId);
      } else if (state.loaded[conversationId]) {
        void syncConversation(conversationId);
      }
    },
  };
}
