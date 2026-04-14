import React, { useContext, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import AuthLayout from "../../components/layouts/AuthLayout";
import { UserContext } from "../../context/userContext";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";

const LOGIN_REDIRECT_DELAY_MS = 2500;

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updateUser } = useContext(UserContext);

  useEffect(() => {
    let isDisposed = false;
    let redirectTimerId = null;

    const navigateByRole = (userRole) => {
      if (userRole === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate("/user/dashboard", { replace: true });
      }
    };

    const handleOAuthCallback = async () => {
      const hashString = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : "";
      const hashParams = new URLSearchParams(hashString);
      const getParam = (key) => hashParams.get(key) || searchParams.get(key);

      const token = getParam("token");
      const name = getParam("name");
      const role = getParam("role");
      const email = getParam("email");
      const _id = getParam("_id");
      const profileImageUrl = getParam("profileImageUrl");
      const error = getParam("error");

      if (error) {
        toast.error("Google login failed. Please try again.", {
          id: "google-login-error",
        });
        navigate("/login", { replace: true });
        return;
      }

      if (!token || !name || !role) {
        toast.error("Invalid authentication response", {
          id: "google-login-error",
        });
        navigate("/login", { replace: true });
        return;
      }

      if (isDisposed) {
        return;
      }

      // Remove sensitive callback params from URL as soon as possible.
      window.history.replaceState(null, "", window.location.pathname);

      updateUser(
        {
          _id: _id || "",
          name,
          email: email || "",
          role,
          profileImageUrl: profileImageUrl || "",
        },
        token,
      );

      toast.success("Logged in successfully with Google!", {
        id: "google-login-success",
      });

      redirectTimerId = setTimeout(() => {
        if (isDisposed) {
          return;
        }
        navigateByRole(role);
      }, LOGIN_REDIRECT_DELAY_MS);

      // Keep this sync non-blocking so login flow is never stuck on callback screen.
      axiosInstance
        .get(API_PATHS.AUTH.PROFILE)
        .then((response) => {
          if (isDisposed) {
            return;
          }

          const profile = response?.data || {};
          updateUser(
            {
              _id: profile._id || _id || "",
              name: profile.username || profile.name || name,
              username: profile.username || profile.name || name,
              email: profile.email || email || "",
              role: profile.role || role,
              profileImageUrl: profile.profileImageUrl || profileImageUrl || "",
              googleId: profile.googleId ?? null,
              hasPassword: profile.hasPassword,
            },
            token,
          );
        })
        .catch(() => {
          // Ignore profile sync failure here; initial login already succeeded.
        });
    };

    handleOAuthCallback();

    return () => {
      isDisposed = true;
      if (redirectTimerId) {
        clearTimeout(redirectTimerId);
      }
    };
  }, [searchParams, navigate, updateUser]);

  return (
    <AuthLayout>
      <div className="w-full max-w-md mx-auto flex flex-col justify-center h-full">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              Authenticating...
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please wait while we log you in with Google
            </p>
          </div>

          <div className="flex gap-2 mt-4">
            <div
              className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
              style={{ animationDelay: "0ms" }}
            ></div>
            <div
              className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
              style={{ animationDelay: "150ms" }}
            ></div>
            <div
              className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            ></div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
