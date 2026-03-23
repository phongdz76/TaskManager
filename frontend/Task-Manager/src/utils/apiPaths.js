export const BASE_URL = "http://localhost:8000";

export const API_PATHS = {
  AUTH: {
    REGISTER: "/api/auth/register",
    LOGIN: "/api/auth/login",
    FORGOT_PASSWORD: "/api/auth/forgot-password",
    RESET_PASSWORD: "/api/auth/reset-password",
    PROFILE: "/api/auth/profile",
    GOOGLE_LOGIN: "/api/auth/google",
    GOOGLE_CALLBACK: "/api/auth/callback/google",
  },

  USERS: {
    GET_ALL_USERS: "/api/users",
    GET_ADMINS: "/api/users/admins",
    GET_USER_BY_ID: (userId) => `/api/users/${userId}`,
    UPDATE_ROLE: (userId) => `/api/users/${userId}/role`,
    DELETE_USER: (userId) => `/api/users/${userId}`,
  },

  TASKS: {
    GET_ALL_TASKS: "/api/tasks",
    GET_TASK_BY_ID: (taskId) => `/api/tasks/${taskId}`,
    CREATE: "/api/tasks",
    UPDATE: (taskId) => `/api/tasks/${taskId}`,
    DELETE: (taskId) => `/api/tasks/${taskId}`,
    UPDATE_STATUS: (taskId) => `/api/tasks/${taskId}/status`,
    UPDATE_CHECKLIST: (taskId) => `/api/tasks/${taskId}/todo`,
    DASHBOARD_DATA: "/api/tasks/dashboard-data",
    USER_DASHBOARD_DATA: "/api/tasks/user-dashboard-data",
  },

  REPORTS: {
    EXPORT_TASKS: "/api/reports/export/tasks",
    EXPORT_USERS: "/api/reports/export/users",
  },

  IMAGES: {
    UPLOAD_IMAGE: "/api/auth/upload-image",
  },
};

export const buildApiUrl = (path) => `${BASE_URL}${path}`;
