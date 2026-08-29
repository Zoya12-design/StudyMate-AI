import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],

  test: {
    environment: "jsdom",
    globals: true,

    setupFiles: [path.resolve(__dirname, "vitest.setup.ts")],

    css: false,

    include: ["tests/**/*.test.{ts,tsx}"],

    exclude: [
      "node_modules/**",
      ".claude/**",
      ".next/**",
      "tests/e2e/**",
      "playwright.config.ts",
    ],

    clearMocks: true,
    restoreMocks: true,
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});