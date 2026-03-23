import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import AuthLayout from "../../components/layouts/AuthLayout";

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    const name = searchParams.get("name");
    const role = searchParams.get("role");
    const email = searchParams.get("email");
    const _id = searchParams.get("_id");
    const profileImageUrl = searchParams.get("profileImageUrl");
    const error = searchParams.get("error");

    if (error) {
      toast.error("Google login failed. Please try again.");
      navigate("/login");
      return;
    }

    if (token && name && role) {
      // Save token to localStorage
      localStorage.setItem("token", token);

      // Save user data
      localStorage.setItem(
        "user",
        JSON.stringify({
          _id: _id || "",
          name: decodeURIComponent(name),
          email: email ? decodeURIComponent(email) : "",
          role: role,
          profileImageUrl: profileImageUrl ? decodeURIComponent(profileImageUrl) : null,
        }),
      );

      toast.success("Logged in successfully with Google!");

      // Redirect based on role
      setTimeout(() => {
        if (role === "admin") {
          navigate("/admin/dashboard");
        } else {
          navigate("/user/dashboard");
        }
      }, 1000);
    } else {
      toast.error("Invalid authentication response");
      navigate("/login");
    }
  }, [searchParams, navigate]);

  return (
    <AuthLayout>
      <div className="w-full max-w-md mx-auto flex flex-col justify-center h-full">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Authenticating...
            </h2>
            <p className="text-gray-600">
              Please wait while we log you in with Google
            </p>
          </div>

          <div className="flex gap-2 mt-4">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
