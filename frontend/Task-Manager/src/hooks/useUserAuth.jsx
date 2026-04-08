import { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/userContext";

export default function useUserAuth() {
  const { user, loading, clearUser } = useContext(UserContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      clearUser();
      navigate("/login");
    }
  }, [user, loading, clearUser, navigate]);

  return { user, loading };
}
