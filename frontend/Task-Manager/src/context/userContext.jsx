import React, {
  createContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";

export const UserContext = createContext(null);

export default function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearUser = useCallback(() => {
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }, []);

  const updateUser = useCallback((userData, token) => {
    setUser(userData);
    if (token) {
      localStorage.setItem("token", token);
    }
    localStorage.setItem("user", JSON.stringify(userData));
    setLoading(false);
  }, []);

  useEffect(() => {
    const accessToken = localStorage.getItem("token");
    if (!accessToken) {
      setLoading(false);
      return;
    }

    const fetchUser = async () => {
      try {
        const response = await axiosInstance.get(API_PATHS.AUTH.PROFILE);
        setUser(response.data);
      } catch (error) {
        console.error("User not authenticated", error);
        clearUser();
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [clearUser]);

  const value = useMemo(
    () => ({ user, setUser, loading, clearUser, updateUser }),
    [user, loading, clearUser, updateUser],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
