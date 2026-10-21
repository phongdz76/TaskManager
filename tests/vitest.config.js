import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    pool: "forks",
    fileParallelism: false,
    projects: [
      // Backend tests
      {
        test: {
          name: "backend",
          environment: "node",
          include: ["backend-tests/**/*.test.js"],
          setupFiles: ["./backend-tests/setup.js"],
          testTimeout: 30000,
          hookTimeout: 30000,
        },
        resolve: {
          alias: {
            "@backend": path.resolve(__dirname, "../backend"),
            "mongoose": path.resolve(__dirname, "../backend/node_modules/mongoose"),
          },
          dedupe: ["mongoose"]
        },
      },
    ]
  }
});
