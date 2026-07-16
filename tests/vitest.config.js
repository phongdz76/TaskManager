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
          },
        },
      },
      // Frontend tests
      {
        test: {
          name: "frontend",
          environment: "jsdom",
          include: ["frontend-tests/**/*.test.{js,jsx}"],
          setupFiles: ["./frontend-tests/setup.js"],
          testTimeout: 15000,
        },
        resolve: {
          alias: {
            "@frontend": path.resolve(__dirname, "../frontend/Task-Manager/src"),
            "react": path.resolve(__dirname, "./node_modules/react"),
            "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
            "react-router-dom": path.resolve(__dirname, "./node_modules/react-router-dom")
          },
          dedupe: ["react", "react-dom"]
        },
      },
    ]
  }
});
