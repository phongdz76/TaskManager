import { describe, it, expect } from "vitest";
import { validateEmail } from "@frontend/utils/helper.js";

describe("validateEmail", () => {
  it("should return true for valid email", () => {
    expect(validateEmail("test@example.com")).toBe(true);
    expect(validateEmail("user.name@domain.co")).toBe(true);
    expect(validateEmail("user+tag@gmail.com")).toBe(true);
  });

  it("should return false for invalid email", () => {
    expect(validateEmail("invalid")).toBe(false);
    expect(validateEmail("@domain.com")).toBe(false);
    expect(validateEmail("user@")).toBe(false);
    expect(validateEmail("user @domain.com")).toBe(false);
  });

  it("should return false for empty string", () => {
    expect(validateEmail("")).toBe(false);
  });
});
