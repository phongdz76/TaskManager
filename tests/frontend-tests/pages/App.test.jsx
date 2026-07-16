import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "@frontend/App.jsx";
import { UserContext } from "@frontend/context/userContext.jsx";

// Mock page components to avoid complex rendering
vi.mock("@frontend/pages/Auth/Login.jsx", () => ({ default: () => { const React = require('react'); return React.createElement('div', { 'data-testid': 'login-page' }, 'Login Page'); } }));
vi.mock("@frontend/pages/Auth/SignUp.jsx", () => ({ default: () => { const React = require('react'); return React.createElement('div', { 'data-testid': 'signup-page' }, 'SignUp Page'); } }));
vi.mock("@frontend/pages/Admin/Dashboard.jsx", () => ({ default: () => { const React = require('react'); return React.createElement('div', { 'data-testid': 'admin-dashboard' }, 'Admin Dashboard'); } }));
vi.mock("@frontend/pages/User/UserDashboard.jsx", () => ({ default: () => { const React = require('react'); return React.createElement('div', { 'data-testid': 'user-dashboard' }, 'User Dashboard'); } }));
vi.mock("@frontend/components/layouts/AuthLayout.jsx", () => ({ default: ({ children }) => { const React = require('react'); return React.createElement('div', null, 'AuthLayout ', children); } }));
vi.mock("@frontend/components/layouts/DashboardLayout.jsx", () => ({ default: ({ children }) => { const React = require('react'); return React.createElement('div', null, 'DashboardLayout ', children); } }));

const renderApp = (initialRoute = "/", userState = { user: null, loading: false }) => {
  return render(
    <UserContext.Provider value={userState}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <App />
      </MemoryRouter>
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
