import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import useUserAuth from "@frontend/hooks/useUserAuth.jsx";
import { UserContext } from "@frontend/context/userContext.jsx";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

const TestComponent = () => {
  const { user, loading } = useUserAuth();
  
  if (loading) return <div>Loading hook...</div>;
  return <div>{user ? `Welcome ${user.username}` : "Not logged in"}</div>;
};

const renderWithContext = (userState) => {
  return render(
    <UserContext.Provider value={userState}>
      <TestComponent />
    </UserContext.Provider>
  );
};

describe("useUserAuth Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return user object when logged in", () => {
    renderWithContext({ user: { username: "john" }, loading: false });
    
    expect(screen.getByText("Welcome john")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("should redirect to /login when user is not logged in and not loading", () => {
    renderWithContext({ user: null, loading: false });
    
    expect(screen.getByText("Not logged in")).toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("should not redirect while loading is true", () => {
    renderWithContext({ user: null, loading: true });
    
    expect(screen.getByText("Loading hook...")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
