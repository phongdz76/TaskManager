import axios from "axios";
import { BASE_URL } from "./apiPaths";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

const shouldForceLogout = (error) => {
  const message = (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    ""
  )
    .toString()
    .toLowerCase();

  if (!message) {
    return false;
  }

  return (
    message.includes("not authorized, token failed") ||
    message.includes("not authorized, no token") ||
    message.includes("not authorized, user not found") ||
    message.includes("jwt expired") ||
    message.includes("invalid token") ||
    message.includes("token expired")
  );
};

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const hasAuthHeader = Boolean(error?.config?.headers?.Authorization);

    if (status === 401 && hasAuthHeader && shouldForceLogout(error)) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
