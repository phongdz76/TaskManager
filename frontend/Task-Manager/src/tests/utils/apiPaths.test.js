import { describe, it, expect } from "vitest";
import { API_PATHS, buildApiUrl, BASE_URL } from "@frontend/utils/apiPaths.js";

describe("API Paths Utility", () => {
  it("should return correct dynamic paths for tasks", () => {
    expect(API_PATHS.TASKS.GET_TASK_BY_ID("123")).toBe("/api/tasks/123");
    expect(API_PATHS.TASKS.UPDATE("456")).toBe("/api/tasks/456");
    expect(API_PATHS.TASKS.DELETE("789")).toBe("/api/tasks/789");
    expect(API_PATHS.TASKS.TOGGLE_PIN("abc")).toBe("/api/tasks/abc/pin");
  });

  it("should return correct dynamic paths for users", () => {
    expect(API_PATHS.USERS.GET_USER_BY_ID("u1")).toBe("/api/users/u1");
    expect(API_PATHS.USERS.UPDATE_ROLE("u2")).toBe("/api/users/u2/role");
    expect(API_PATHS.USERS.DELETE_USER("u3")).toBe("/api/users/u3");
  });

  it("should correctly build full API URLs", () => {
    const path = "/api/test/path";
    const expected = `${BASE_URL}${path}`;
    expect(buildApiUrl(path)).toBe(expected);
  });
});
