import "vite-plus/test";
import "vite-plus/dist/test/matchers";

declare module "vitest/internal/browser" {
  interface BrowserCommands {
    setTimezone(timezoneId: string): Promise<void>;
  }
}

declare module "vitest" {
  interface ProvidedContext {
    aimockUrl: string;
    aimockFixtures: Array<{
      match: Record<string, unknown>;
      response: Record<string, unknown>;
    }>;
  }
}
