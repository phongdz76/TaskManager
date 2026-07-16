import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "../test-utils.jsx";
import PrivateRoute from "@frontend/routes/PrivateRoute.jsx";
import { Route, Routes } from "react-router-dom";

const TestComponent = () => <div data-testid="protected-content">Protected Content</div>;
const LoginComponent = () => <div data-testid="login-page">Login Page</div>;

const renderPrivateRoute = (userState, allowedRoles) => {
  return render(
    <Routes>
      <Route path="/login" element={<LoginComponent />} />
      <Route element={<PrivateRoute allowedRoles={allowedRoles} />}>
        <Route path="/" element={<TestComponent />} />
      </Route>
    </Routes>,
    { userState }
  );
};

describe("PrivateRoute Component", () => {
  it("should render Outlet (children) when user is authenticated and has allowed role", () => {
    const userState = { user: { role: "admin" }, loading: false };
    renderPrivateRoute(userState, ["admin"]);
    
    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
  });

  it("should show Loading text when loading is true", () => {
    const userState = { user: null, loading: true };
    renderPrivateRoute(userState);
    
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("should redirect to /login when user is not authenticated", () => {
    const userState = { user: null, loading: false };
    renderPrivateRoute(userState);
    
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
  });

  it("should redirect to /login when user role is not in allowedRoles", () => {
    const userState = { user: { role: "user" }, loading: false };
    renderPrivateRoute(userState, ["admin"]); // Only admin allowed
    
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
  });

  it("should render Outlet when allowedRoles is not provided (any auth user allowed)", () => {
    const userState = { user: { role: "user" }, loading: false };
    renderPrivateRoute(userState); // No allowedRoles specified
    
    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
  });
});
