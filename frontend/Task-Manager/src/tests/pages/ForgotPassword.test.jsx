import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "../test-utils.jsx";
import ForgotPassword from "@frontend/pages/Auth/ForgotPassword.jsx";
import axiosInstance from "@frontend/utils/axiosInstance.js";

vi.mock("@frontend/utils/axiosInstance.js", () => ({
  default: {
    post: vi.fn(),
  },
}));

describe("ForgotPassword Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render forgot password form", () => {
    render(<ForgotPassword />);
    
    expect(screen.getByRole("heading", { name: /forgot password/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send reset link/i })).toBeInTheDocument();
  });

  it("should call API and show success UI", async () => {
    axiosInstance.post.mockResolvedValueOnce({ data: { message: "Success" } });
    
    render(<ForgotPassword />);
    
    fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: "user@example.com" } });
    fireEvent.submit(screen.getByRole("button", { name: /send reset link/i }).closest("form"));

    await waitFor(() => {
      expect(axiosInstance.post).toHaveBeenCalledWith(
        expect.stringContaining("/forgot-password"), 
        { email: "user@example.com" }
      );
    });

    // Check if UI changed to success state
    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to login/i })).toBeInTheDocument();
  });

  it("should show validation error when email is empty", async () => {
    render(<ForgotPassword />);
    
    fireEvent.submit(screen.getByRole("button", { name: /send reset link/i }).closest("form"));

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(axiosInstance.post).not.toHaveBeenCalled();
  });
});
