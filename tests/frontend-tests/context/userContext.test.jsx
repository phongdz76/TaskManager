import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import UserProvider, { UserContext } from "@frontend/context/userContext.jsx";
import axiosInstance from "@frontend/utils/axiosInstance.js";

vi.mock("@frontend/utils/axiosInstance.js", () => ({
  default: {
    get: vi.fn(),
  },
}));

const TestConsumer = () => {
  const { user, loading, updateUser, clearUser } = React.useContext(UserContext);
  
  if (loading) return <div>Loading context...</div>;
  
  return (
    <div>
      <div data-testid="user-info">{user ? user.username : "No user"}</div>
      <button onClick={() => updateUser({ username: "updated-user" }, "new-token")}>
        Update User
      </button>
      <button onClick={() => clearUser()}>Clear User</button>
    </div>
  );
};

describe("UserContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("should initialize with null user when no token exists", async () => {
    render(
      <UserProvider>
        <TestConsumer />
      </UserProvider>
    );

    expect(screen.getByTestId("user-info").textContent).toBe("No user");
    expect(axiosInstance.get).not.toHaveBeenCalled();
  });

  it("should fetch profile when token exists in localStorage", async () => {
    localStorage.setItem("token", "dummy-token");
    axiosInstance.get.mockResolvedValueOnce({ data: { username: "fetched-user" } });

    render(
      <UserProvider>
        <TestConsumer />
      </UserProvider>
    );

    // Should show loading initially
    expect(screen.getByText("Loading context...")).toBeInTheDocument();

    // After fetch resolves
    const userInfo = await screen.findByTestId("user-info");
    expect(userInfo.textContent).toBe("fetched-user");
    expect(axiosInstance.get).toHaveBeenCalledTimes(1);
  });

  it("should clear user when fetching profile fails (invalid token)", async () => {
    localStorage.setItem("token", "invalid-token");
    axiosInstance.get.mockRejectedValueOnce(new Error("Unauthorized"));

    render(
      <UserProvider>
        <TestConsumer />
      </UserProvider>
    );

    const userInfo = await screen.findByTestId("user-info");
    expect(userInfo.textContent).toBe("No user");
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("should update user and save token to localStorage via updateUser", () => {
    render(
      <UserProvider>
        <TestConsumer />
      </UserProvider>
    );

    act(() => {
      screen.getByText("Update User").click();
    });

    expect(screen.getByTestId("user-info").textContent).toBe("updated-user");
    expect(localStorage.getItem("token")).toBe("new-token");
  });

  it("should clear user and token from localStorage via clearUser", () => {
    localStorage.setItem("token", "old-token");
    
    render(
      <UserProvider>
        <TestConsumer />
      </UserProvider>
    );

    act(() => {
      screen.getByText("Clear User").click();
    });

    expect(screen.getByTestId("user-info").textContent).toBe("No user");
    expect(localStorage.getItem("token")).toBeNull();
  });
});
