import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "../../../test-utils.jsx";
import ManagerTask from "@frontend/pages/Admin/ManagerTask.jsx";
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
    delete: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
  },
}));
vi.mock("@frontend/components/ReportDownloadButton.jsx", () => ({
  default: () => <button>Export My Tasks</button>,
}));

// Mock TaskListTable to isolate its complexity
vi.mock("@frontend/components/tasks/TaskListTable.jsx", () => ({
  default: ({ tasks, onDeleteTask }) => (
    <div data-testid="task-list-table">
      {tasks.map(t => (
        <div key={t._id}>
          {t.title}
          <button onClick={() => onDeleteTask(t)}>Delete {t._id}</button>
        </div>
      ))}
    </div>
  ),
}));

const mockTaskData = {
  statistics: {
    totalTasks: 2,
    pendingTasks: 1,
    inProgressTasks: 1,
    completedTasks: 0,
    overdueTasks: 0,
  },
  charts: {
    taskPriorityLevels: { Low: 0, Medium: 2, High: 0 },
  },
  recentTasks: [
    { _id: "task1", title: "Task one", status: "Pending", priority: "Medium", createdBy: { username: "admin" } },
    { _id: "task2", title: "Task two", status: "In-Progress", priority: "Medium", createdBy: { username: "admin" } },
  ],
  pagination: { totalTasks: 2, totalPages: 1 },
};

describe("ManagerTask Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render loading state initially", () => {
    axiosInstance.get.mockImplementation(() => new Promise(() => {}));
    render(<ManagerTask />);
    expect(screen.getByText(/loading your tasks/i)).toBeInTheDocument();
  });

  it("should fetch and render tasks and statistics", async () => {
    axiosInstance.get.mockResolvedValueOnce({ data: mockTaskData });
    render(<ManagerTask />);

    await waitFor(() => {
      expect(screen.getByText("My Tasks Overview")).toBeInTheDocument();
      expect(screen.getByText("Total Personal Tasks")).toBeInTheDocument();
    });

    // Stats
    expect(screen.getByText("2")).toBeInTheDocument(); // total tasks
    
    // Check mocked table content
    expect(screen.getByText("Task one")).toBeInTheDocument();
    expect(screen.getByText("Task two")).toBeInTheDocument();
  });

  it("should filter tasks by search query", async () => {
    axiosInstance.get.mockResolvedValueOnce({ data: mockTaskData });
    render(<ManagerTask />);

    await waitFor(() => {
      expect(screen.getByText("Task one")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search by title or creator/i);
    fireEvent.change(searchInput, { target: { value: "two" } });

    expect(screen.queryByText("Task one")).not.toBeInTheDocument();
    expect(screen.getByText("Task two")).toBeInTheDocument();
  });

  it("should filter tasks by status", async () => {
    axiosInstance.get.mockResolvedValueOnce({ data: mockTaskData });
    render(<ManagerTask />);

    await waitFor(() => {
      expect(screen.getByText("Task one")).toBeInTheDocument();
    });

    const statusSelect = screen.getAllByRole("combobox")[0]; // the filter dropdown
    fireEvent.change(statusSelect, { target: { value: "Pending" } });

    expect(screen.getByText("Task one")).toBeInTheDocument(); // Pending
    expect(screen.queryByText("Task two")).not.toBeInTheDocument(); // In-Progress
  });

  it("should handle task deletion", async () => {
    axiosInstance.get.mockResolvedValue({ data: mockTaskData });
    axiosInstance.delete.mockResolvedValueOnce({ data: { message: "Deleted" } });
    
    render(<ManagerTask />);

    await waitFor(() => {
      expect(screen.getByText("Task one")).toBeInTheDocument();
    });

    // Click delete from mocked table
    const deleteBtn = screen.getByText("Delete task1");
    fireEvent.click(deleteBtn);

    // Modal opens
    expect(screen.getByText(/are you sure you want to delete the task/i)).toBeInTheDocument();
    
    const confirmBtn = screen.getByRole("button", { name: "Confirm Delete" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(axiosInstance.delete).toHaveBeenCalledWith(expect.stringContaining("/task1"));
    });
  });
});
