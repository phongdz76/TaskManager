import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "../../test-utils.jsx";
import UserDashboard from "@frontend/pages/User/UserDashboard.jsx";
import axiosInstance from "@frontend/utils/axiosInstance.js";

// Mock dependencies
vi.mock("@frontend/hooks/useUserAuth.jsx", () => ({
  default: vi.fn(),
}));
vi.mock("@frontend/components/layouts/DashboardLayout.jsx", () => ({
  default: ({ children }) => <div data-testid="dashboard-layout">{children}</div>,
}));
vi.mock("@frontend/utils/axiosInstance.js", () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => (
      <div data-testid="responsive-container" style={{ width: "100%", height: "300px" }}>
        {children}
      </div>
    ),
  };
});

const mockDashboardData = {
  statistics: {
    totalTasks: 5,
    pendingTasks: 1,
    inProgressTasks: 2,
    completedTasks: 1,
    overdueTasks: 1,
  },
  charts: {
    taskPriorityLevels: {
      Low: 1,
      Medium: 3,
      High: 1,
    },
  },
  recentTasks: [
    {
      _id: "task1",
      title: "My assigned task",
      status: "In-Progress",
      priority: "High",
      createdAt: "2023-01-01T00:00:00.000Z",
      dueDate: "2023-01-10T00:00:00.000Z",
    },
    {
      _id: "task2",
      title: "Another task",
      status: "Pending",
      priority: "Medium",
      createdAt: "2023-01-02T00:00:00.000Z",
      dueDate: "2023-01-05T00:00:00.000Z",
    },
  ],
  pagination: {
    totalTasks: 2,
    totalPages: 1,
  },
};

describe("User Dashboard Page", () => {
  const mockUserContext = {
    user: { role: "user", name: "User Test", username: "usertest" },
    loading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch and render dashboard data", async () => {
    axiosInstance.get.mockResolvedValueOnce({ data: mockDashboardData });
    
    render(<UserDashboard />, { userState: mockUserContext });
    
    // Check Header
    expect(screen.getByText(/user dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/welcome back,/i)).toBeInTheDocument();
    expect(screen.getByText(/user test/i)).toBeInTheDocument();

    // Check Statistics
    await waitFor(() => {
      expect(screen.getByText("Total Tasks")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("1")).toBeInTheDocument(); // pending/completed/overdue
      expect(screen.getByText("2")).toBeInTheDocument(); // in-progress
    });

    // Check Recent Tasks Table
    expect(screen.getByText("My assigned task")).toBeInTheDocument();
    expect(screen.getByText("Another task")).toBeInTheDocument();

    // Check Charts rendered
    const chartContainers = screen.getAllByTestId("responsive-container");
    expect(chartContainers.length).toBe(2);
  });

  it("should allow changing task status", async () => {
    axiosInstance.get.mockResolvedValue({ data: mockDashboardData });
    axiosInstance.put.mockResolvedValueOnce({ data: { message: "Status updated" } });
    
    render(<UserDashboard />, { userState: mockUserContext });
    
    await waitFor(() => {
      expect(screen.getByText("Another task")).toBeInTheDocument();
    });

    // Find the select dropdown for task2
    const statusSelects = screen.getAllByRole("combobox");
    // task1 is In-Progress, task2 is Pending
    expect(statusSelects[0].value).toBe("In-Progress");
    expect(statusSelects[1].value).toBe("Pending");

    // Change task2 status to Completed
    fireEvent.change(statusSelects[1], { target: { value: "Completed" } });

    await waitFor(() => {
      expect(axiosInstance.put).toHaveBeenCalledWith(expect.stringContaining("/task2/status"), {
        status: "Completed",
      });
      // The component should fetch data again after status update
      expect(axiosInstance.get).toHaveBeenCalledTimes(2);
    });
  });
});
