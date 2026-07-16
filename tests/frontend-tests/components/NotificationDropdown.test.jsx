import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "../test-utils.jsx";
import NotificationDropdown from "@frontend/components/layouts/NotificationDropdown.jsx";
import axiosInstance from "@frontend/utils/axiosInstance.js";

// Mock axios instance
vi.mock("@frontend/utils/axiosInstance.js", () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockNotifications = [
  { _id: "1", message: "Task assigned to you", isRead: false, createdAt: new Date().toISOString() },
  { _id: "2", message: "Task completed", isRead: true, createdAt: new Date().toISOString() },
];

describe("NotificationDropdown Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axiosInstance.get.mockResolvedValue({ data: mockNotifications });
  });

  it("should fetch and display unread count badge", async () => {
    const { container } = render(<NotificationDropdown />);
    
    // Wait for the GET request to resolve
    await waitFor(() => {
      expect(axiosInstance.get).toHaveBeenCalledTimes(1);
    });

    // 1 unread notification in mock data
    const badge = screen.getByText("1");
    expect(badge).toBeInTheDocument();
  });

  it("should open dropdown when bell icon is clicked", async () => {
    render(<NotificationDropdown />);
    
    await waitFor(() => {
      expect(axiosInstance.get).toHaveBeenCalledTimes(1);
    });

    // Dropdown is initially closed
    expect(screen.queryByText("Notifications")).not.toBeInTheDocument();

    // Click the bell icon button (it has aria-label="Notifications")
    const button = screen.getByLabelText("Notifications");
    fireEvent.click(button);

    // Dropdown should be open
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("Task assigned to you")).toBeInTheDocument();
    expect(screen.getByText("Task completed")).toBeInTheDocument();
  });

  it("should call mark as read API when clicking an unread notification", async () => {
    axiosInstance.put.mockResolvedValue({});
    render(<NotificationDropdown />);
    
    await waitFor(() => {
      expect(axiosInstance.get).toHaveBeenCalledTimes(1);
    });

    // Open dropdown
    fireEvent.click(screen.getByLabelText("Notifications"));

    // Click the unread notification
    const unreadNotif = screen.getByText("Task assigned to you");
    fireEvent.click(unreadNotif);

    expect(axiosInstance.put).toHaveBeenCalledWith(expect.stringContaining("/api/notifications/1/read"));
  });

  it("should call mark all as read API when clicking 'Mark all as read'", async () => {
    axiosInstance.put.mockResolvedValue({});
    render(<NotificationDropdown />);
    
    await waitFor(() => {
      expect(axiosInstance.get).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByLabelText("Notifications"));

    const markAllBtn = screen.getByText("Mark all as read");
    fireEvent.click(markAllBtn);

    expect(axiosInstance.put).toHaveBeenCalledWith(expect.stringContaining("/api/notifications/read-all"));
  });

  it("should show empty state when there are no notifications", async () => {
    axiosInstance.get.mockResolvedValue({ data: [] });
    render(<NotificationDropdown />);
    
    await waitFor(() => {
      expect(axiosInstance.get).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByLabelText("Notifications"));
    
    expect(screen.getByText("You have no notifications.")).toBeInTheDocument();
    expect(screen.queryByText("Mark all as read")).not.toBeInTheDocument();
  });
});
