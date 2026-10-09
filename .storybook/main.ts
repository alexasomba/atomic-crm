import type { StorybookConfig } from "@storybook/react-vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const storybookDirectory = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: [],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  viteFinal: async (config) => {
    config.resolve ??= {};
    const currentAliases = config.resolve.alias;
    const aliases = Array.isArray(currentAliases)
      ? currentAliases
      : Object.entries(currentAliases ?? {}).map(([find, value]) =>
          typeof value === "string" ? { find, replacement: value } : value,
        );
    config.resolve.alias = [
      ...aliases,
      { find: "@", replacement: path.resolve(storybookDirectory, "../src") },
    ];
    return config;
  },
};

export default config;
