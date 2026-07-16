import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import React from "react";

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

// Mock import.meta.env
globalThis.import = globalThis.import || {};
globalThis.import.meta = { env: {} };

// Mock ResizeObserver for Recharts (fallback if any other lib uses it)
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Global mock for Recharts to avoid React context errors in JSDOM
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }) => React.createElement("div", { "data-testid": "responsive-container" }, children),
  PieChart: ({ children }) => React.createElement("div", { "data-testid": "pie-chart" }, children),
  Pie: ({ children }) => React.createElement("div", { "data-testid": "pie" }, children),
  Cell: () => React.createElement("div", { "data-testid": "cell" }),
  Tooltip: () => React.createElement("div", { "data-testid": "tooltip" }),
  Legend: () => React.createElement("div", { "data-testid": "legend" }),
  BarChart: ({ children }) => React.createElement("div", { "data-testid": "bar-chart" }, children),
  Bar: ({ children }) => React.createElement("div", { "data-testid": "bar" }, children),
  XAxis: () => React.createElement("div", { "data-testid": "x-axis" }),
  YAxis: () => React.createElement("div", { "data-testid": "y-axis" }),
  CartesianGrid: () => React.createElement("div", { "data-testid": "cartesian-grid" }),
}));
