import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/tests/setup.js"],
    include: ["src/tests/**/*.test.{js,jsx}"],
    testTimeout: 15000,
  },
  resolve: {
    alias: {
      "@frontend": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
