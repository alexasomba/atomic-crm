import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite-plus";
import { playwright } from "vite-plus/test/browser-playwright";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: [
      "@testing-library/dom",
      "ansi-regex",
      "ansi-styles",
      "aria-query",
      "dom-accessibility-api",
      "pretty-format",
      "react-is",
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
    globalSetup: ["./test/globalSetup.ts"],
    browser: {
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
      "test/cloudflare-worker.test.ts",
      "src/**/*.integration.test.{ts,tsx}",
    ],
  },
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
