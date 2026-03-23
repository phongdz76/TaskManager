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
    const code = error?.code;
    const hasAuthHeader = Boolean(error?.config?.headers?.Authorization);

    if (status === 401 && hasAuthHeader) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
      return Promise.reject(error);
    }

    if (status === 500) {
      console.error("Server error:", error);
      return Promise.reject({
        message: "Internal server error. Please try again later.",
        status,
      });
    }

    if (code === "ECONNABORTED") {
      return Promise.reject({
        message: "Request timeout. Please try again.",
      });
    }

    return Promise.reject({
      message:
        error?.response?.data?.message || error.message || "Request failed",
      status,
      data: error?.response?.data,
    });
  },
);

export default axiosInstance;
