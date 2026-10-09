import path from "node:path";
import { defineConfig } from "vite-plus";
import { playwright } from "vite-plus/test/browser-playwright";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    clearMocks: true,
    globals: true,
    globalSetup: ["./test/globalSetup.ts"],
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
      instances: [{ browser: "chromium" }],
      commands: {
        // Uses Chrome DevTools Protocol to override the timezone at runtime,
        // since process.env.TZ has no effect in a real browser environment.
        async setTimezone({ context, page }, timezoneId: string) {
          const session = await context.newCDPSession(page);
          await session.send("Emulation.setTimezoneOverride", { timezoneId });
          await session.detach();
        },
      },
    },
    exclude: [
      "**/node_modules/**",
      "doc/**",
      "src/**/*.integration.test.{ts,tsx}",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
