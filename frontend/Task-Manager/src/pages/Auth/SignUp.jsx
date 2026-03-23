import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { AiOutlineGoogle } from "react-icons/ai";
import AuthLayout from "../../components/layouts/AuthLayout";
import Heading from "../../components/Heading";
import Input from "../../components/Input";
import Button from "../../components/Button";
import LoadingRedirect from "../../components/LoadingRedirect";

export default function SignUp() {
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
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password =
        "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character ";
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
      const response = await fetch("http://localhost:8000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      // Save token and user info
      localStorage.setItem("token", data.token);
      localStorage.setItem(
        "user",
        JSON.stringify({
          _id: data._id,
          name: data.name,
          email: data.email,
          role: data.role,
          profileImageUrl: data.profileImageUrl,
        }),
      );

      toast.success("Account created successfully!");

      // Set redirecting state
      setIsLoading(false);
      setIsRedirecting(true);
      setUserRole(data.role);

      // Redirect based on user role
      setTimeout(() => {
        if (data.role === "admin") {
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

  const handleGoogleSignUp = () => {
    // Redirect to backend Google OAuth endpoint
    window.location.href = "http://localhost:8000/api/auth/google";
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-md mx-auto flex flex-col justify-center h-full">
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
