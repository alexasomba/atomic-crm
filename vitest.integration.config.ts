import path from "node:path";
import { playwright } from "vite-plus/test/browser-playwright";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      "faker/locale/en",
      "faker/locale/en_US",
      "jsonexport/dist",
      "lodash",
      "papaparse",
      "ra-supabase-language-english",
      "@tanstack/react-router",
      "@tanstack/router-core",
      "@tanstack/history",
      "@tanstack/react-store",
      "seroval",
      "seroval-plugins",
    ],
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
    preserveSymlinks: true,
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
