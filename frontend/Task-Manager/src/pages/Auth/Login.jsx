import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { AiOutlineGoogle } from "react-icons/ai";
import AuthLayout from "../../components/layouts/AuthLayout";
import Heading from "../../components/Heading";
import Input from "../../components/Inputs/Input";
import Button from "../../components/Button";
import LoadingRedirect from "../../components/LoadingRedirect";
import { validateEmail } from "../../utils/helper";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS, buildApiUrl } from "../../utils/apiPaths";

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});

  const navigate = useNavigate();

  // Load saved credentials if available
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    const savedPassword = localStorage.getItem("rememberedPassword");
    if (savedEmail) {
      setFormData((prev) => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
    if (savedPassword) {
      setFormData((prev) => ({ ...prev, password: savedPassword }));
    }
  }, []);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await axiosInstance.post(API_PATHS.AUTH.LOGIN, {
        email: formData.email,
        password: formData.password,
      });

      // Save credentials if Remember Me is checked
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", formData.email);
        localStorage.setItem("rememberedPassword", formData.password);
      } else {
        localStorage.removeItem("rememberedEmail");
        localStorage.removeItem("rememberedPassword");
      }

      // Save token and user info
      localStorage.setItem("token", response.data.token);
      localStorage.setItem(
        "user",
        JSON.stringify({
          _id: response.data._id,
          name: response.data.name,
          email: response.data.email,
          role: response.data.role,
          profileImageUrl: response.data.profileImageUrl,
        }),
      );

      toast.success("Logged in successfully!");

      // Set redirecting state
      setIsLoading(false);
      setIsRedirecting(true);
      setUserRole(response.data.role);

      // Redirect based on user role
      setTimeout(() => {
        if (response.data.role === "admin") {
          navigate("/admin/dashboard");
        } else {
          navigate("/user/dashboard");
        }
      }, 2500);
    } catch (error) {
      toast.error(error.message || "Something went wrong");
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    // Clear error when user starts typing
    if (errors[id]) {
      setErrors((prev) => ({ ...prev, [id]: "" }));
    }
  };

  const handleGoogleLogin = () => {
    // Redirect to backend Google OAuth endpoint
    window.location.href = buildApiUrl(API_PATHS.AUTH.GOOGLE_LOGIN);
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-md lg:max-w-2xl xl:max-w-3xl mx-auto">
        {isRedirecting ? (
          <LoadingRedirect message="Login Successful!" role={userRole} />
        ) : (
          <div className="flex flex-col gap-6">
            <Heading title="Welcome Back" subtitle="Login to your account" />

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                id="email"
                label="Email"
                type="email"
                disabled={isLoading}
                required
                placeholder="user@gmail.com"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
              />

              <Input
                id="password"
                label="Password"
                type="password"
                disabled={isLoading}
                placeholder="Min 8 characters"
                required
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isLoading}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <label
                    htmlFor="rememberMe"
                    className="text-sm text-gray-600 select-none cursor-pointer"
                  >
                    Remember me
                  </label>
                </div>

                <Link
                  to="/forgot-password"
                  className="text-sm text-gray-600 hover:text-blue-500 hover:underline transition"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                label={isLoading ? "Loading..." : "Login"}
                onClick={handleSubmit}
                disabled={isLoading}
              />

              <div className="flex items-center gap-4 my-2">
                <div className="flex-1 h-px bg-gray-300"></div>
                <span className="text-sm text-gray-500">OR</span>
                <div className="flex-1 h-px bg-gray-300"></div>
              </div>

              <Button
                label="Continue with Google"
                onClick={handleGoogleLogin}
                outline
                icon={AiOutlineGoogle}
                disabled={isLoading}
              />
            </form>

            <p className="text-center text-sm text-gray-600">
              Don't have an account?
              <Link
                to="/register"
                className="text-blue-500 hover:underline ml-2 font-medium"
              >
                Sign Up
              </Link>
            </p>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
