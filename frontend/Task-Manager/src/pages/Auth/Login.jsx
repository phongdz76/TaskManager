import React, { useState, useEffect, useContext } from "react";
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
import { UserContext } from "../../context/userContext";

const PASSWORD_HELPER_TEXT =
  "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.";

export default function Login() {
  const { user, loading, updateUser } = useContext(UserContext);
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [rememberMe, setRememberMe] = useState(() =>
    Boolean(localStorage.getItem("rememberedEmail")),
  );
  const [formData, setFormData] = useState(() => ({
    email: localStorage.getItem("rememberedEmail") || "",
    password: "",
  }));
  const [errors, setErrors] = useState({});

  const navigate = useNavigate();

  useEffect(() => {
    if (loading || isLoading || isRedirecting || !user) {
      return;
    }

    if (user.role === "admin") {
      navigate("/admin/dashboard", { replace: true });
      return;
    }

    navigate("/user/dashboard", { replace: true });
  }, [user, loading, isLoading, isRedirecting, navigate]);

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
        localStorage.setItem("rememberedEmail", formData.email.trim());
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      // Remove legacy plain-text password cache if present.
      localStorage.removeItem("rememberedPassword");

      // Save token and user info
      const userData = {
        _id: response.data._id,
        name: response.data.name,
        email: response.data.email,
        role: response.data.role,
        profileImageUrl: response.data.profileImageUrl,
      };

      // Update UserContext
      updateUser(userData, response.data.token);

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
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong";
      toast.error(message);
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
                helperText={PASSWORD_HELPER_TEXT}
                showHelperOnFocus
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isLoading}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer accent-blue-600"
                  />
                  <label
                    htmlFor="rememberMe"
                    className="text-sm text-gray-600 dark:text-gray-400 select-none cursor-pointer"
                  >
                    Remember me
                  </label>
                </div>

                <Link
                  to="/forgot-password"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:underline transition"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                label={isLoading ? "Loading..." : "Login"}
                type="submit"
                disabled={isLoading}
              />

              <div className="flex items-center gap-4 my-2">
                <div className="flex-1 h-px bg-gray-300 dark:bg-slate-700"></div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  OR
                </span>
                <div className="flex-1 h-px bg-gray-300 dark:bg-slate-700"></div>
              </div>

              <Button
                label="Continue with Google"
                type="button"
                onClick={handleGoogleLogin}
                outline
                icon={AiOutlineGoogle}
                disabled={isLoading}
              />
            </form>

            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?
              <Link
                to="/register"
                className="text-blue-500 dark:text-blue-400 hover:underline ml-2 font-medium"
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
