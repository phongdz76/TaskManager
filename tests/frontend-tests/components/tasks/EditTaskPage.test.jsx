import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "../../../test-utils.jsx";
import EditTaskPage from "@frontend/components/tasks/EditTaskPage.jsx";
import axiosInstance from "@frontend/utils/axiosInstance.js";

// Mock dependencies
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

const mockUsers = [
  { _id: "user1", username: "Alice", email: "alice@test.com" },
  { _id: "user2", username: "Bob", email: "bob@test.com" },
];

const mockTaskData = {
  _id: "task1",
  title: "Existing Task",
  description: "Old description",
  priority: "High",
  status: "Pending",
  assignedTo: [{ _id: "user2" }], // Bob is assigned
  todoChecklist: [{ text: "Old step", completed: false }],
  attachments: [],
};

describe("EditTaskPage Component", () => {
  const mockUserContext = {
    user: { _id: "admin1", role: "admin" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch task data and populate form", async () => {
    axiosInstance.get.mockImplementation((url) => {
      if (url.includes("/assignable")) return Promise.resolve({ data: mockUsers });
      if (url.includes("/tasks/task1")) return Promise.resolve({ data: mockTaskData });
      return Promise.reject(new Error("Not found"));
    });

    render(<EditTaskPage />, { userState: mockUserContext });

    // Wait for fetching
    await waitFor(() => {
      expect(screen.getByText("Edit Task")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Existing Task")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Old description")).toBeInTheDocument();
      expect(screen.getByText("Old step")).toBeInTheDocument();
    });

    // Bob should be selected
    const assignedChips = screen.getAllByText("Bob");
    expect(assignedChips.length).toBeGreaterThan(0);
  });

  it("should submit updated task data", async () => {
    axiosInstance.get.mockImplementation((url) => {
      if (url.includes("/assignable")) return Promise.resolve({ data: mockUsers });
      if (url.includes("/tasks/task1")) return Promise.resolve({ data: mockTaskData });
      return Promise.reject(new Error("Not found"));
    });
    axiosInstance.put.mockResolvedValueOnce({ data: { message: "Updated" } });

    render(<EditTaskPage successMode="reset" />, { userState: mockUserContext });

    await waitFor(() => {
      expect(screen.getByDisplayValue("Existing Task")).toBeInTheDocument();
    });

    // Change title
    const titleInput = screen.getAllByRole("textbox").find(i => i.name === "title");
    fireEvent.change(titleInput, { target: { value: "Updated Task" } });

    // Change Status
    const statusSelect = screen.getByRole("combobox", { name: /status/i });
    if(statusSelect) {
        fireEvent.change(statusSelect, { target: { value: "In-Progress" } });
    }

    // Submit
    const form = document.querySelector("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(axiosInstance.put).toHaveBeenCalledWith(
        expect.stringContaining("/tasks/task1"),
        expect.objectContaining({
          title: "Updated Task",
          status: "In-Progress", // If your form supports status update
        })
      );
    });
  });
});
