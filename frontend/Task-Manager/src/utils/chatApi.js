import axiosInstance from "./axiosInstance";
import { API_PATHS } from "./apiPaths";

const chatApi = {
  getUsers: async (params) =>
    (await axiosInstance.get(API_PATHS.CHAT.USERS, { params })).data,
  getConversations: async (params) =>
    (await axiosInstance.get(API_PATHS.CHAT.CONVERSATIONS, { params })).data,
  getConversation: async (id) =>
    (await axiosInstance.get(API_PATHS.CHAT.CONVERSATION(id))).data,
  openDirect: async (userId) =>
    (await axiosInstance.post(API_PATHS.CHAT.DIRECT, { userId })).data,
  openTask: async (taskId) =>
    (await axiosInstance.post(API_PATHS.CHAT.TASK(taskId))).data,
  getMessages: async (id, params) =>
    (await axiosInstance.get(API_PATHS.CHAT.MESSAGES(id), { params })).data,
  sendMessage: async (id, body) => {
    if (!body.files?.length) {
      return (await axiosInstance.post(API_PATHS.CHAT.MESSAGES(id), body)).data;
    }

    const formData = new FormData();
    formData.append("text", body.text);
    formData.append("clientMessageId", body.clientMessageId);
    if (body.replyToMessageId)
      formData.append("replyToMessageId", body.replyToMessageId);
    body.files.forEach((file) => formData.append("images", file));

    return (
      await axiosInstance.post(API_PATHS.CHAT.MESSAGES(id), formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 150000,
      })
    ).data;
  },
  getImage: async (id, messageId, imageId, signal) =>
    (
      await axiosInstance.get(API_PATHS.CHAT.IMAGE(id, messageId, imageId), {
        responseType: "blob",
        signal,
        timeout: 20000,
      })
    ).data,
  markRead: async (id, lastReadSequence) =>
    (await axiosInstance.put(API_PATHS.CHAT.READ(id), { lastReadSequence }))
      .data,
};
export default chatApi;
