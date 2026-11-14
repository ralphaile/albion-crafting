import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/prices.table.ts",
  out: "./drizzle",
});
