import path from "node:path";
import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    globals: true,
    include: ["test/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
