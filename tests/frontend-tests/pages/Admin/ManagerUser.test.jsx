import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "../../../test-utils.jsx";
import ManagerUser from "@frontend/pages/Admin/ManagerUser.jsx";
import axiosInstance from "@frontend/utils/axiosInstance.js";

// Mock dependencies
vi.mock("@frontend/hooks/useUserAuth.jsx", () => ({
  default: () => ({ user: { _id: "admin1", role: "admin" } }),
}));
vi.mock("@frontend/components/layouts/DashboardLayout.jsx", () => ({
  default: ({ children }) => <div data-testid="dashboard-layout">{children}</div>,
}));
vi.mock("@frontend/utils/axiosInstance.js", () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock("@frontend/components/ReportDownloadButton.jsx", () => ({
  default: () => <button>Export Users</button>,
}));

const mockAdmins = [
  {
    _id: "admin1",
    username: "superadmin",
    email: "admin@test.com",
    role: "admin",
    pendingTasks: 0,
    inProgressTasks: 0,
    completedTasks: 0,
  },
];

const mockUsers = [
  {
    _id: "user1",
    username: "john_doe",
    email: "john@test.com",
    role: "user",
    pendingTasks: 1,
    inProgressTasks: 2,
    completedTasks: 3,
  },
  {
    _id: "user2",
    username: "jane_doe",
    email: "jane@test.com",
    role: "user",
    pendingTasks: 0,
    inProgressTasks: 0,
    completedTasks: 0,
  },
];

describe("ManagerUser Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render loading state initially", () => {
    axiosInstance.get.mockImplementation(() => new Promise(() => {}));
    render(<ManagerUser />);
    expect(screen.getByText(/loading users/i)).toBeInTheDocument();
  });

  it("should fetch and render user list", async () => {
    axiosInstance.get.mockImplementation((url) => {
      if (url.includes("/admin")) return Promise.resolve({ data: mockAdmins });
      return Promise.resolve({ data: mockUsers });
    });

    render(<ManagerUser />);

    await waitFor(() => {
      expect(screen.getByText("superadmin")).toBeInTheDocument();
      expect(screen.getByText("john_doe")).toBeInTheDocument();
      expect(screen.getByText("jane_doe")).toBeInTheDocument();
    });

    // Check roles and task counts
    expect(screen.getAllByText("Admin").length).toBeGreaterThan(0);
    expect(screen.getAllByText("User").length).toBeGreaterThan(0);
  });

  it("should filter users by search query", async () => {
    axiosInstance.get.mockImplementation((url) => {
      if (url.includes("/admin")) return Promise.resolve({ data: mockAdmins });
      return Promise.resolve({ data: mockUsers });
    });

    render(<ManagerUser />);

    await waitFor(() => {
      expect(screen.getByText("john_doe")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search users by name or email/i);
    fireEvent.change(searchInput, { target: { value: "jane" } });

    expect(screen.queryByText("john_doe")).not.toBeInTheDocument();
    expect(screen.getByText("jane_doe")).toBeInTheDocument();
  });

  it("should filter users by role", async () => {
    axiosInstance.get.mockImplementation((url) => {
      if (url.includes("/admin")) return Promise.resolve({ data: mockAdmins });
      return Promise.resolve({ data: mockUsers });
    });

    render(<ManagerUser />);

    await waitFor(() => {
      expect(screen.getByText("john_doe")).toBeInTheDocument();
    });

    const roleSelect = screen.getByRole("combobox");
    fireEvent.change(roleSelect, { target: { value: "admin" } });

    expect(screen.queryByText("john_doe")).not.toBeInTheDocument();
    expect(screen.getByText("superadmin")).toBeInTheDocument();
  });

  it("should show promote confirm modal and promote user", async () => {
    axiosInstance.get.mockImplementation((url) => {
      if (url.includes("/admin")) return Promise.resolve({ data: mockAdmins });
      return Promise.resolve({ data: mockUsers });
    });
    axiosInstance.patch.mockResolvedValueOnce({ data: { message: "Promoted" } });

    render(<ManagerUser />);

    await waitFor(() => {
      expect(screen.getByText("john_doe")).toBeInTheDocument();
    });

    const promoteButtons = screen.getAllByTitle("Make Admin");
    fireEvent.click(promoteButtons[0]);

    // Modal appears
    expect(screen.getByText(/promote to admin/i)).toBeInTheDocument();
    
    // Confirm promote
    const confirmButton = screen.getByRole("button", { name: "Confirm" });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(axiosInstance.patch).toHaveBeenCalledWith(expect.stringContaining("/user1/role"), { role: "admin" });
    });
  });

  it("should show delete confirm modal and delete user", async () => {
    axiosInstance.get.mockImplementation((url) => {
      if (url.includes("/admin")) return Promise.resolve({ data: mockAdmins });
      return Promise.resolve({ data: mockUsers });
    });
    axiosInstance.delete.mockResolvedValueOnce({ data: { message: "Deleted" } });

    render(<ManagerUser />);

    await waitFor(() => {
      expect(screen.getByText("john_doe")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle("Delete User");
    fireEvent.click(deleteButtons[0]);

    // Modal appears
    expect(screen.getByText(/delete user/i)).toBeInTheDocument();
    
    // Confirm delete
    const confirmButton = screen.getByRole("button", { name: "Confirm" });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(axiosInstance.delete).toHaveBeenCalledWith(expect.stringContaining("/user1"));
    });
  });
});
