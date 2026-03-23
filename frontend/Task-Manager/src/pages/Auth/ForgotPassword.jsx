import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { AiOutlineArrowLeft } from "react-icons/ai";
import AuthLayout from "../../components/layouts/AuthLayout";
import Heading from "../../components/Heading";
import Input from "../../components/Input";
import Button from "../../components/Button";

export default function ForgotPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const navigate = useNavigate();

  const validateEmail = () => {
    if (!email.trim()) {
      setError("Email is required");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Invalid email format");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateEmail()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        "http://localhost:8000/api/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send reset email");
      }

      toast.success("Password reset link sent to your email!");
      setIsSubmitted(true);
    } catch (error) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    setEmail(e.target.value);
    if (error) {
      setError("");
    }
  };

  if (isSubmitted) {
    return (
      <AuthLayout>
        <div className="w-full max-w-md mx-auto flex flex-col justify-center h-full text-center">
          {/* Animated Email Icon */}
          <div className="relative mb-6">
            <div className="w-24 h-24 mx-auto bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
              <svg
                className="w-12 h-12 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            {/* Success checkmark badge */}
            <div className="absolute -bottom-1 -right-1 left-1/2 transform translate-x-4 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-4 border-white shadow-md">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Check Your Email
          </h2>
          <p className="text-gray-500 mb-4">
            We've sent a password reset link to
          </p>

          {/* Email display */}
          <div className="bg-gray-50 rounded-lg py-3 px-4 mb-6 inline-block">
            <span className="text-blue-600 font-semibold">{email}</span>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 rounded-xl p-4 mb-6 text-left">
            <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              Next steps
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">1.</span>
                Open your email inbox
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">2.</span>
                Click the reset link in the email
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">3.</span>
                Create your new password
              </li>
            </ul>
          </div>

          {/* Back to login button */}
          <Link
            to="/login"
            className="w-full flex justify-end items-center gap-2 text-sm text-gray-600 hover:text-blue-500 transition mb-3"
          >
            <AiOutlineArrowLeft />
            Back to Login
          </Link>

          {/* Resend section */}
          <p className="text-sm text-gray-500 mt-2 mb-6">
            Didn't receive the email?{" "}
            <button
              onClick={() => setIsSubmitted(false)}
              className="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors"
            >
              Try again
            </button>{" "}
            or check your spam email folder
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-md mx-auto flex flex-col justify-center h-full">
        <div className="flex flex-col gap-6">
          <Heading
            title="Forgot Password?"
            subtitle="Enter your email to reset your password"
          />

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              id="email"
              label="Email"
              type="email"
              disabled={isLoading}
              required
              value={email}
              onChange={handleChange}
              error={error}
            />

            <Button
              label={isLoading ? "Sending..." : "Send Reset Link"}
              onClick={handleSubmit}
              disabled={isLoading}
            />
          </form>

          <Link
            to="/login"
            className="flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-blue-500 transition"
          >
            <AiOutlineArrowLeft />
            Back to Login
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
