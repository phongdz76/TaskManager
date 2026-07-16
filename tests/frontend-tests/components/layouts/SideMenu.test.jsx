import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "../../../test-utils.jsx";
import SideMenu from "@frontend/components/layouts/SideMenu.jsx";
import { ADMIN_SIDE_MENU_DATA, USER_SIDE_MENU_DATA } from "@frontend/utils/data.js";

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("SideMenu Component", () => {
  const mockAdminContext = {
    user: { role: "admin", name: "Admin Test", email: "admin@test.com" },
    clearUser: vi.fn(),
  };

  const mockUserContext = {
    user: { role: "user", name: "User Test", email: "user@test.com" },
    clearUser: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render admin menu items and info correctly", () => {
    render(<SideMenu activeMenu="Dashboard" />, { userState: mockAdminContext });
    
    expect(screen.getByText("Admin Test")).toBeInTheDocument();
    expect(screen.getByText("admin@test.com")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument(); // Role badge

    // Check if all admin menu labels are rendered
    ADMIN_SIDE_MENU_DATA.forEach(item => {
      expect(screen.getByText(item.label)).toBeInTheDocument();
    });
  });

  it("should render user menu items correctly", () => {
    render(<SideMenu activeMenu="Dashboard" />, { userState: mockUserContext });
    
    expect(screen.getByText("User Test")).toBeInTheDocument();
    expect(screen.queryByText("Admin")).not.toBeInTheDocument(); // Role badge not shown for user

    // Check if all user menu labels are rendered
    USER_SIDE_MENU_DATA.forEach(item => {
      expect(screen.getByText(item.label)).toBeInTheDocument();
    });
  });

  it("should navigate to correct route on menu click", () => {
    render(<SideMenu activeMenu="Dashboard" />, { userState: mockAdminContext });
    
    const dashboardButton = screen.getByRole("button", { name: /dashboard/i });
    fireEvent.click(dashboardButton);
    expect(mockNavigate).toHaveBeenCalledWith(ADMIN_SIDE_MENU_DATA[0].path);
  });

  it("should logout when Logout is clicked", () => {
    render(<SideMenu activeMenu="Dashboard" />, { userState: mockAdminContext });
    
    const logoutButton = screen.getByRole("button", { name: /logout/i });
    fireEvent.click(logoutButton);
    
    expect(mockAdminContext.clearUser).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });
});
