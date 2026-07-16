import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "../../../test-utils.jsx";
import NavBar from "@frontend/components/layouts/NavBar.jsx";

// Mock dependencies
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});
vi.mock("@frontend/components/layouts/NotificationDropdown.jsx", () => ({
  default: () => <div data-testid="notification-dropdown">Notifications</div>,
}));
vi.mock("@frontend/components/layouts/SideMenu.jsx", () => ({
  default: () => <div data-testid="side-menu">SideMenu Mock</div>,
}));

describe("NavBar Component", () => {
  const mockAdminContext = {
    user: { role: "admin", name: "Admin Test", email: "admin@test.com" },
  };
  const mockUserContext = {
    user: { role: "user", name: "User Test", email: "user@test.com" },
  };
  const mockGuestContext = {
    user: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("should render correctly", () => {
    render(<NavBar activeMenu="Dashboard" />, { userState: mockAdminContext });
    
    expect(screen.getByText("Task Manager")).toBeInTheDocument();
    expect(screen.getByTestId("notification-dropdown")).toBeInTheDocument();
    expect(screen.getByLabelText(/toggle language/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/toggle dark mode/i)).toBeInTheDocument();
  });

  it("should navigate to admin dashboard when logo is clicked by admin", () => {
    render(<NavBar activeMenu="Dashboard" />, { userState: mockAdminContext });
    const logoButton = screen.getByRole("button", { name: /go to dashboard/i });
    fireEvent.click(logoButton);
    expect(mockNavigate).toHaveBeenCalledWith("/admin/dashboard");
  });

  it("should navigate to user dashboard when logo is clicked by user", () => {
    render(<NavBar activeMenu="Dashboard" />, { userState: mockUserContext });
    const logoButton = screen.getByRole("button", { name: /go to dashboard/i });
    fireEvent.click(logoButton);
    expect(mockNavigate).toHaveBeenCalledWith("/user/dashboard");
  });

  it("should navigate to login when logo is clicked by guest", () => {
    render(<NavBar activeMenu="Dashboard" />, { userState: mockGuestContext });
    const logoButton = screen.getByRole("button", { name: /go to dashboard/i });
    fireEvent.click(logoButton);
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("should toggle dark mode on button click", () => {
    render(<NavBar activeMenu="Dashboard" />, { userState: mockUserContext });
    const darkModeButton = screen.getByLabelText(/toggle dark mode/i);
    
    // Initial state is light
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    
    // Click toggle to dark
    fireEvent.click(darkModeButton);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("theme")).toBe("dark");

    // Click toggle to light
    fireEvent.click(darkModeButton);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("theme")).toBe("light");
  });
});
