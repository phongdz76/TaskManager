import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "../../test-utils.jsx";
import Dashboard from "@frontend/pages/Admin/Dashboard.jsx";
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
  },
}));


const mockDashboardData = {
  statistics: {
    totalTasks: 10,
    pendingTasks: 3,
    inProgressTasks: 4,
    completedTasks: 2,
    overdueTasks: 1,
  },
  charts: {
    taskPriorityLevels: {
      Low: 2,
      Medium: 5,
      High: 3,
    },
  },
  recentTasks: [
    {
      _id: "task1",
      title: "Fix bug in auth",
      status: "In-Progress",
      priority: "High",
      createdAt: "2023-01-01T00:00:00.000Z",
      dueDate: "2023-01-10T00:00:00.000Z",
      createdBy: {
        username: "johndoe",
        email: "john@example.com",
        profileImageUrl: "",
      },
    },
    {
      _id: "task2",
      title: "Write documentation",
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

describe("Admin Dashboard Page", () => {
  const mockUserContext = {
    user: { role: "admin", name: "Admin Test", username: "admintest" },
    loading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render loading state initially", () => {
    axiosInstance.get.mockImplementation(() => new Promise(() => {})); // Never resolves
    render(<Dashboard />, { userState: mockUserContext });
    
    expect(screen.getByText(/loading your insights/i)).toBeInTheDocument();
  });

  it("should fetch and render dashboard data", async () => {
    axiosInstance.get.mockResolvedValueOnce({ data: mockDashboardData });
    
    render(<Dashboard />, { userState: mockUserContext });
    
    // Check Header
    expect(screen.getByText(/admin dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/welcome back,/i)).toBeInTheDocument();
    expect(screen.getByText(/admin test/i)).toBeInTheDocument();

    // Check Statistics
    await waitFor(() => {
      expect(screen.getByText("Total Tasks")).toBeInTheDocument();
      // The value 10 is rendered in an h3
      expect(screen.getByText("10")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument(); // pending
      expect(screen.getByText("4")).toBeInTheDocument(); // in-progress
      expect(screen.getByText("2")).toBeInTheDocument(); // completed
      expect(screen.getByText("1")).toBeInTheDocument(); // overdue
    });

    // Check Recent Tasks Table
    expect(screen.getByText("Fix bug in auth")).toBeInTheDocument();
    expect(screen.getByText("Write documentation")).toBeInTheDocument();
    expect(screen.getByText("johndoe")).toBeInTheDocument(); // Creator
    expect(screen.getByText("Unknown")).toBeInTheDocument(); // No creator for task2

    // Check Charts rendered (ResponsiveContainer replaces them in mock)
    const chartContainers = screen.getAllByTestId("responsive-container");
    expect(chartContainers.length).toBe(2); // Pie and Bar charts
  });

  it("should display 'No data available' if data is empty", async () => {
    axiosInstance.get.mockResolvedValueOnce({ data: { statistics: {}, charts: {}, recentTasks: [] } });
    
    render(<Dashboard />, { userState: mockUserContext });
    
    await waitFor(() => {
      expect(screen.getByText("No recent tasks found.")).toBeInTheDocument();
      const noDataTexts = screen.getAllByText("No data available");
      expect(noDataTexts.length).toBe(2); // Pie and Bar
    });
  });
});
