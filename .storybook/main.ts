import type { StorybookConfig } from "@storybook/react-vite";
import path from "node:path";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: [],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  viteFinal: async (config) => {
    config.resolve ??= {};
    const existingAlias = (config.resolve.alias ?? {}) as Record<
      string,
      string
    >;
    config.resolve.alias = {
      ...existingAlias,
      "@": path.resolve(__dirname, "../src"),
    };
    return config;
  },
};

export default config;
