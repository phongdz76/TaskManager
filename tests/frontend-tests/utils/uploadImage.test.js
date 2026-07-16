import { describe, it, expect } from "vitest";
import { validateImageFile } from "@frontend/utils/uploadImage.js";

describe("validateImageFile", () => {
  it("should not throw for a valid image file", () => {
    const validFile = new File(["dummy content"], "test.jpg", { type: "image/jpeg" });
    Object.defineProperty(validFile, "size", { value: 1024 * 1024 }); // 1MB
    
    expect(() => validateImageFile(validFile)).not.toThrow();
  });

  it("should throw when file is missing", () => {
    expect(() => validateImageFile(null)).toThrow(/select an image file/i);
    expect(() => validateImageFile(undefined)).toThrow(/select an image file/i);
  });

  it("should throw for invalid file types", () => {
    const invalidFile = new File(["dummy content"], "test.pdf", { type: "application/pdf" });
    expect(() => validateImageFile(invalidFile)).toThrow(/Only JPG and PNG/i);
    
    const gifFile = new File(["dummy content"], "test.gif", { type: "image/gif" });
    expect(() => validateImageFile(gifFile)).toThrow(/Only JPG and PNG/i);
  });

  it("should throw when file exceeds 5MB limit", () => {
    const largeFile = new File(["dummy content"], "large.jpg", { type: "image/jpeg" });
    Object.defineProperty(largeFile, "size", { value: 6 * 1024 * 1024 }); // 6MB
    
    expect(() => validateImageFile(largeFile)).toThrow(/5MB or smaller/i);
  });
});
