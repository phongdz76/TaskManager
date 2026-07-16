import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "../../../test-utils.jsx";
import TeamMembersView from "@frontend/components/team/TeamMembersView.jsx";
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
vi.mock("@frontend/components/ReportDownloadButton.jsx", () => ({
  default: () => <button>Export Team Members</button>,
}));

const mockTeamMembers = [
  {
    _id: "user1",
    username: "john_doe",
    email: "john@test.com",
    role: "user",
    taskCount: 5,
    completionLevel: 80,
  },
  {
    _id: "user2",
    username: "jane_doe",
    email: "jane@test.com",
    role: "admin",
    taskCount: 2,
    completionLevel: 100,
  },
  {
    _id: "user3",
    username: "zero_tasks",
    email: "zero@test.com",
    role: "user",
    taskCount: 0,
    completionLevel: 0,
  },
];

describe("TeamMembersView Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render loading state initially", () => {
    axiosInstance.get.mockImplementation(() => new Promise(() => {}));
    render(<TeamMembersView activeMenu="Team Members" subtitle="Subtitle test" />);
    
    expect(screen.getByText(/loading team members/i)).toBeInTheDocument();
  });

  it("should fetch and render team members with taskCount > 0", async () => {
    axiosInstance.get.mockResolvedValueOnce({
      data: { teamMembers: mockTeamMembers },
    });

    render(<TeamMembersView activeMenu="Team Members" subtitle="Subtitle test" />);

    await waitFor(() => {
      // Should show john_doe and jane_doe
      expect(screen.getByText("john_doe")).toBeInTheDocument();
      expect(screen.getByText("jane_doe")).toBeInTheDocument();
    });

    // Should NOT show zero_tasks because taskCount is 0
    expect(screen.queryByText("zero_tasks")).not.toBeInTheDocument();

    // Check stats rendering
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument(); // john taskCount
  });

  it("should filter team members by search query", async () => {
    axiosInstance.get.mockResolvedValueOnce({
      data: { teamMembers: mockTeamMembers },
    });

    render(<TeamMembersView activeMenu="Team Members" subtitle="Subtitle test" />);

    await waitFor(() => {
      expect(screen.getByText("john_doe")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search team members/i);
    fireEvent.change(searchInput, { target: { value: "jane" } });

    expect(screen.queryByText("john_doe")).not.toBeInTheDocument();
    expect(screen.getByText("jane_doe")).toBeInTheDocument();
  });
});
