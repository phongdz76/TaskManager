import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "@frontend/App.jsx";
import { UserContext } from "@frontend/context/userContext.jsx";

// Mock page components to avoid complex rendering
vi.mock("@frontend/pages/Auth/Login.jsx", () => ({ default: () => <div data-testid="login-page">Login Page</div> }));
vi.mock("@frontend/pages/Auth/SignUp.jsx", () => ({ default: () => <div data-testid="signup-page">SignUp Page</div> }));
vi.mock("@frontend/pages/Admin/Dashboard.jsx", () => ({ default: () => <div data-testid="admin-dashboard">Admin Dashboard</div> }));
vi.mock("@frontend/pages/User/UserDashboard.jsx", () => ({ default: () => <div data-testid="user-dashboard">User Dashboard</div> }));
vi.mock("@frontend/components/layouts/AuthLayout.jsx", () => ({ default: ({ children }) => <div>AuthLayout {children}</div> }));
vi.mock("@frontend/components/layouts/DashboardLayout.jsx", () => ({ default: ({ children }) => <div>DashboardLayout {children}</div> }));

vi.mock("@frontend/context/userContext.jsx", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    default: ({ children }) => <>{children}</>,
  };
});

const renderApp = (initialRoute = "/", userState = { user: null, loading: false }) => {
  window.history.pushState({}, "Test page", initialRoute);
  return render(
    <UserContext.Provider value={userState}>
      <App />
    </UserContext.Provider>
  );
};

describe("App Router", () => {
  it("should redirect '/' to '/login' when not authenticated", async () => {
    renderApp("/", { user: null, loading: false });
    
    await waitFor(() => {
      expect(screen.getByTestId("login-page")).toBeInTheDocument();
    });
  });

  it("should redirect '/' to '/admin/dashboard' when admin is logged in", async () => {
    renderApp("/", { user: { role: "admin" }, loading: false });
    
    await waitFor(() => {
      expect(screen.getByTestId("admin-dashboard")).toBeInTheDocument();
    });
  });

  it("should redirect '/' to '/user/dashboard' when user is logged in", async () => {
    renderApp("/", { user: { role: "user" }, loading: false });
    
    await waitFor(() => {
      expect(screen.getByTestId("user-dashboard")).toBeInTheDocument();
    });
  });

  it("should block user from accessing admin routes", async () => {
    renderApp("/admin/dashboard", { user: { role: "user" }, loading: false });
    
    await waitFor(() => {
      expect(screen.getByTestId("login-page")).toBeInTheDocument();
    });
  });
});
