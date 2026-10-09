import path from "node:path";
import { defineConfig } from "vite-plus";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import createHtmlPlugin from "vite-plugin-simple-html";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    visualizer({
      open: process.env.NODE_ENV !== "CI",
      filename: "./dist/stats.html",
    }),
    createHtmlPlugin({
      minify: true,
      inject: {
        data: {
          mainScript: `demo/main.tsx`,
        },
      },
    }),
  ],
  define: {
    "import.meta.env.VITE_IS_DEMO": JSON.stringify("true"),
  },
  base: "./",
  build: {
    sourcemap: true,
  },
  server: {
    port: Number(process.env.VITE_DEV_PORT ?? 5173),
    strictPort: true,
    proxy: {
      // Forward ALL /api/* paths to the Cloudflare Worker (or Node rollback).
      // Override with COPILOTKIT_PROXY_TARGET when the Worker is not on 8787.
      "/api": {
        target: process.env.COPILOTKIT_PROXY_TARGET || "http://localhost:8787",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  resolve: {
    preserveSymlinks: false,
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@segment/analytics-node": path.resolve(
        __dirname,
        "./src/lib/segment-analytics-node-browser.ts",
      ),
    },
  },
});
