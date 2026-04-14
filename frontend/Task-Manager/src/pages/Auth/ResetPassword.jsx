import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { AiOutlineArrowLeft } from "react-icons/ai";
import AuthLayout from "../../components/layouts/AuthLayout";
import Heading from "../../components/Heading";
import Input from "../../components/Inputs/Input";
import Button from "../../components/Button";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";

const PASSWORD_HELPER_TEXT =
  "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.";

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

export default function ResetPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [token, setToken] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const resetToken = searchParams.get("token");
    if (!resetToken) {
      toast.error("Invalid or missing reset token");
      navigate("/login");
    } else {
      setToken(resetToken);
    }
  }, [searchParams, navigate]);

  const validateForm = () => {
    const newErrors = {};

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
      await axiosInstance.post(API_PATHS.AUTH.RESET_PASSWORD, {
        resetToken: token,
        newPassword: formData.password,
      });

      toast.success("Password reset successful! Redirecting to login...");

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error) {
      toast.error(error.message || "Something went wrong");
    } finally {
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

  return (
    <AuthLayout>
      <div className="w-full max-w-md lg:max-w-2xl xl:max-w-3xl mx-auto">
        <div className="flex flex-col gap-6">
          <Heading title="Reset Password" subtitle="Enter your new password" />

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              id="password"
              label="New Password"
              type="password"
              disabled={isLoading}
              required
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              helperText={PASSWORD_HELPER_TEXT}
              showHelperOnFocus
            />

            <Input
              id="confirmPassword"
              label="Confirm New Password"
              type="password"
              disabled={isLoading}
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
            />

            <Link
              to="/login"
              className="w-full flex justify-end items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition mb-3"
            >
              <AiOutlineArrowLeft />
              Back to Login
            </Link>

            <Button
              label={isLoading ? "Resetting..." : "Reset Password"}
              onClick={handleSubmit}
              disabled={isLoading}
            />
          </form>
        </div>
      </div>
    </AuthLayout>
  );
}
