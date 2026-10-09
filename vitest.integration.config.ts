import path from "node:path";
import { playwright } from "vite-plus/test/browser-playwright";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      "@faker-js/faker",
      "jsonexport/dist",
      "lodash",
      "papaparse",
      "ra-supabase-language-english",
    ],
  },
  test: {
    // Vitest v4 compatibility: preserve mock call history.
    // Remove after tests no longer rely on calls from setup or earlier tests.
    // https://viteplus.dev/guide/vitest-v5#remove-unneeded-compatibility-settings
    // https://vitest.dev/guide/migration/#clearmocks-is-enabled-by-default
    clearMocks: false,
    globals: true,
    include: ["src/**/*.integration.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "doc/**"],
    setupFiles: ["./src/test/setup.integration.ts"],
    browser: {
      locators: {
        // Vitest v4 compatibility: keep partial, case-insensitive locator matching.
        // Remove after updating locators for full, case-sensitive matches.
        // https://viteplus.dev/guide/vitest-v5#remove-unneeded-compatibility-settings
        // https://vitest.dev/guide/migration/#locators-are-strict-by-default
        exact: false,
      },
      provider: playwright(),
      enabled: true,
      headless: true,
      instances: [{ browser: "chromium" }],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
