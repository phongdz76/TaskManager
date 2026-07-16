import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "../test-utils.jsx";
import SignUp from "@frontend/pages/Auth/SignUp.jsx";
import axiosInstance from "@frontend/utils/axiosInstance.js";

vi.mock("@frontend/utils/axiosInstance.js", () => ({
  default: {
    post: vi.fn(),
  },
}));

const mockUpdateUser = vi.fn();
const mockUserContext = {
  user: null,
  updateUser: mockUpdateUser,
};

describe("SignUp Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render registration form completely", () => {
    render(<SignUp />, { userState: mockUserContext });
    
    expect(screen.getByRole("heading", { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign up/i })).toBeInTheDocument();
  });

  it("should call register API successfully", async () => {
    const mockData = { _id: "1", name: "John", email: "john@example.com", role: "user", token: "abc", profileImageUrl: "" };
    axiosInstance.post.mockResolvedValueOnce({ data: mockData });
    
    render(<SignUp />, { userState: mockUserContext });
    
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: "John Doe" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "john@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: "StrongPass1!" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "StrongPass1!" } });
    
    fireEvent.submit(screen.getByRole("button", { name: /sign up/i }).closest("form"));

    await waitFor(() => {
      expect(axiosInstance.post).toHaveBeenCalledWith(expect.stringContaining("/register"), {
        username: "John Doe",
        email: "john@example.com",
        password: "StrongPass1!",
      });
      const userData = { _id: "1", name: "John", email: "john@example.com", role: "user", profileImageUrl: "" };
      expect(mockUpdateUser).toHaveBeenCalledWith(userData, mockData.token);
    });
  });

  it("should show validation error for empty fields", async () => {
    render(<SignUp />, { userState: mockUserContext });
    
    fireEvent.submit(screen.getByRole("button", { name: /sign up/i }).closest("form"));

    expect(await screen.findByText(/username is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(axiosInstance.post).not.toHaveBeenCalled();
  });

  it("should redirect to login from 'Already have an account' link", () => {
    render(<SignUp />, { userState: mockUserContext });
    
    const link = screen.getByText(/login/i, { selector: 'a' });
    expect(link).toHaveAttribute("href", "/login");
  });
});
