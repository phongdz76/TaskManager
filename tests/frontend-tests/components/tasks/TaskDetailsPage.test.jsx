import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "../../../test-utils.jsx";
import TaskDetailsPage from "@frontend/components/tasks/TaskDetailsPage.jsx";
import axiosInstance from "@frontend/utils/axiosInstance.js";

const mockParams = { id: "task1" };
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useParams: () => mockParams,
    useNavigate: () => vi.fn(),
  };
});
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

const mockTask = {
  _id: "task1",
  title: "Test Task Detail",
  description: "Test description",
  status: "Pending",
  priority: "High",
  progress: 0,
  todoChecklist: [
    { text: "Item 1", completed: false },
    { text: "Item 2", completed: true }
  ],
  attachments: ["https://example.com/image.png"],
  createdAt: "2023-01-01T00:00:00.000Z",
  dueDate: "2023-01-05T00:00:00.000Z",
  assignedTo: [{ _id: "user1", username: "Alice" }],
  createdBy: { username: "Admin" },
};

describe("TaskDetailsPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch and render task details", async () => {
    axiosInstance.get.mockResolvedValueOnce({ data: mockTask });

    render(<TaskDetailsPage />);

    expect(screen.getByText(/loading task details/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Test Task Detail")).toBeInTheDocument();
      expect(screen.getByText("Test description")).toBeInTheDocument();
      expect(screen.getByText("Item 1")).toBeInTheDocument();
      expect(screen.getByText("Item 2")).toBeInTheDocument();
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });

    // Check progress text
    expect(screen.getByText("1/2 completed")).toBeInTheDocument();
  });

  it("should toggle checklist item and save", async () => {
    axiosInstance.get.mockResolvedValueOnce({ data: mockTask });
    // After put, returns updated task
    const updatedTask = {
      ...mockTask,
      todoChecklist: [
        { text: "Item 1", completed: true },
        { text: "Item 2", completed: true }
      ]
    };
    axiosInstance.put.mockResolvedValueOnce({ data: { task: updatedTask } });

    render(<TaskDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText("Test Task Detail")).toBeInTheDocument();
    });

    // Toggle Item 1 (which was false)
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]); // Check Item 1

    // Save Checklist button should be enabled
    const saveBtn = screen.getByRole("button", { name: /save checklist/i });
    expect(saveBtn).not.toBeDisabled();

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(axiosInstance.put).toHaveBeenCalledWith(
        expect.stringContaining("/checklist"),
        expect.objectContaining({
          todoChecklist: [
            { text: "Item 1", completed: true },
            { text: "Item 2", completed: true }
          ]
        })
      );
    });

    // Progress updates to 2/2
    await waitFor(() => {
      expect(screen.getByText("2/2 completed")).toBeInTheDocument();
    });
  });

  it("should update task status", async () => {
    axiosInstance.get.mockResolvedValueOnce({ data: mockTask });
    const updatedTask = { ...mockTask, status: "In-Progress" };
    axiosInstance.put.mockResolvedValueOnce({ data: { task: updatedTask } });

    render(<TaskDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText("Test Task Detail")).toBeInTheDocument();
    });

    const statusSelect = screen.getByRole("combobox");
    fireEvent.change(statusSelect, { target: { value: "In-Progress" } });

    await waitFor(() => {
      expect(axiosInstance.put).toHaveBeenCalledWith(
        expect.stringContaining("/status"),
        expect.objectContaining({ status: "In-Progress" })
      );
    });
  });

  it("should handle task not found", async () => {
    axiosInstance.get.mockRejectedValueOnce(new Error("Not found"));
    render(<TaskDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText(/task not found or you do not have access/i)).toBeInTheDocument();
    });
  });
});
