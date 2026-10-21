import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "../../test-utils.jsx";
import CreateTaskPage from "@frontend/components/tasks/CreateTaskPage.jsx";
import axiosInstance from "@frontend/utils/axiosInstance.js";
import toast from "react-hot-toast";

// Mock dependencies
vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));
vi.mock("@frontend/hooks/useUserAuth.jsx", () => ({
  default: vi.fn(),
}));
vi.mock("@frontend/components/layouts/DashboardLayout.jsx", () => ({
  default: ({ children }) => <div data-testid="dashboard-layout">{children}</div>,
}));
vi.mock("@frontend/utils/axiosInstance.js", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockUsers = [
  { _id: "user1", username: "Alice", email: "alice@test.com" },
  { _id: "user2", username: "Bob", email: "bob@test.com" },
];

describe("CreateTaskPage Component", () => {
  const mockUserContext = {
    user: { _id: "admin1", role: "admin", name: "Admin Test", username: "admintest" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render and fetch assignable users", async () => {
    axiosInstance.get.mockResolvedValueOnce({ data: mockUsers });

    render(<CreateTaskPage />, { userState: mockUserContext });

    // Header
    expect(screen.getByText("Create New Task")).toBeInTheDocument();

    await waitFor(() => {
      // Check if assignable users are rendered
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
    });
  });

  it("should validate required fields on submit", async () => {
    axiosInstance.get.mockResolvedValueOnce({ data: mockUsers });
    render(<CreateTaskPage />, { userState: mockUserContext });

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    fireEvent.submit(screen.getByRole("button", { name: /create task/i }).closest("form"));

    expect(toast.error).toHaveBeenCalledWith("Title is required");
    expect(axiosInstance.post).not.toHaveBeenCalled();
  });

  it("should submit valid task data", async () => {
    axiosInstance.get.mockResolvedValueOnce({ data: mockUsers });
    axiosInstance.post.mockResolvedValueOnce({ data: { message: "Created" } });
    
    render(<CreateTaskPage successMode="reset" />, { userState: mockUserContext });

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    // Fill Title
    const titleInput = screen.getAllByRole("textbox").find(i => i.name === "title");
    fireEvent.change(titleInput, { target: { value: "New important task" } });

    // Fill Description
    const descInput = screen.getAllByRole("textbox").find(i => i.name === "description");
    fireEvent.change(descInput, { target: { value: "Task details here" } });

    // Add Checklist Item
    const todoInput = screen.getByPlaceholderText("Add a sub-task...");
    fireEvent.change(todoInput, { target: { value: "Step 1" } });
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));
    expect(screen.getByText("Step 1")).toBeInTheDocument();

    // Assign User
    const userAliceBtn = screen.getByText("Alice").closest("button");
    fireEvent.click(userAliceBtn);

    // Submit
    const form = document.querySelector("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(axiosInstance.post).toHaveBeenCalledWith(
        expect.stringContaining("/tasks"),
        expect.objectContaining({
          title: "New important task",
          description: "Task details here",
          priority: "Medium",
          todoChecklist: [{ text: "Step 1", completed: false }],
          assignedTo: ["user1"],
        })
      );
    });
  });
});
