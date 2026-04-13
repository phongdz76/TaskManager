import React, { useContext, useState } from "react";
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

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

export default function SignUp() {
  const { updateUser } = useContext(UserContext);
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});

  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.trim().length < 2) {
      newErrors.username = "Username must be at least 2 characters";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (!PASSWORD_REGEX.test(formData.password)) {
      newErrors.password =
        "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
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
      const response = await axiosInstance.post(API_PATHS.AUTH.REGISTER, {
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });

      const userData = {
        _id: response.data._id,
        name: response.data.name,
        email: response.data.email,
        role: response.data.role,
        profileImageUrl: response.data.profileImageUrl,
      };

      // Keep auth state in sync so PrivateRoute allows dashboard immediately.
      updateUser(userData, response.data.token);

      toast.success("Account created successfully!");

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

  const handleGoogleSignUp = () => {
    // Redirect to backend Google OAuth endpoint
    window.location.href = buildApiUrl(API_PATHS.AUTH.GOOGLE_LOGIN);
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-md lg:max-w-2xl xl:max-w-3xl mx-auto">
        {isRedirecting ? (
          <LoadingRedirect
            message="Account Created Successfully!"
            role={userRole}
          />
        ) : (
          <div className="flex flex-col gap-6">
            <Heading title="Create Account" subtitle="Sign up to get started" />

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                id="username"
                label="Username"
                type="text"
                disabled={isLoading}
                placeholder="user123"
                required
                value={formData.username}
                onChange={handleChange}
                error={errors.username}
              />

              <Input
                id="email"
                label="Email"
                type="email"
                disabled={isLoading}
                placeholder="user@gmail.com"
                required
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
              />

              <Input
                id="password"
                label="Password"
                type="password"
                disabled={isLoading}
                required
                placeholder="Min 8 characters with one uppercase letter, one lowercase letter, one special character and one number"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                helperText={PASSWORD_HELPER_TEXT}
                showHelperOnFocus
              />

              <Input
                id="confirmPassword"
                label="Confirm Password"
                type="password"
                disabled={isLoading}
                required
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                error={errors.confirmPassword}
              />

              <Button
                label={isLoading ? "Creating account..." : "Sign Up"}
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
                onClick={handleGoogleSignUp}
                outline
                icon={AiOutlineGoogle}
                disabled={isLoading}
              />
            </form>

            <p className="text-center text-sm text-gray-600">
              Already have an account?
              <Link
                to="/login"
                className="text-blue-500 hover:underline ml-2 font-medium"
              >
                Login
              </Link>
            </p>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
