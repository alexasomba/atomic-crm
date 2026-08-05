import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: ["./server/db/schema.ts", "./server/db/auth-schema.ts"],
  out: "./drizzle",
  strict: true,
  verbose: true,
});
