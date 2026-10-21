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
  sendMessage: async (id, body) =>
    (await axiosInstance.post(API_PATHS.CHAT.MESSAGES(id), body)).data,
  markRead: async (id, lastReadSequence) =>
    (await axiosInstance.put(API_PATHS.CHAT.READ(id), { lastReadSequence }))
      .data,
};
export default chatApi;
