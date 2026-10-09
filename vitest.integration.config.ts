import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { playwright } from "vite-plus/test/browser-playwright";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: [
      "@faker-js/faker",
      "jsonexport/dist",
      "lodash",
      "papaparse",
      "@base-ui/react > use-sync-external-store/shim",
      "@base-ui/react > use-sync-external-store/shim/with-selector",
      "@tanstack/react-query > @tanstack/query-core",
      "@tanstack/react-router",
      "@tanstack/router-core",
      "@tanstack/history",
      "@tanstack/react-store",
      "seroval",
      "seroval-plugins",
    ],
    exclude: ["@base-ui/react"],
  },
  test: {
    globals: true,
    include: ["src/**/*.integration.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "doc/**"],
    setupFiles: ["./src/test/setup.integration.ts"],
    browser: {
      provider: playwright(),
      enabled: true,
      headless: true,
      instances: [{ browser: "chromium" }],
    },
  },
  resolve: {
    preserveSymlinks: false,
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
