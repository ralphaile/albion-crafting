import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    // Not UTC, so that reading AODP's UTC dates as local time fails a test.
    env: { TZ: "Asia/Tokyo" },
    // Starting a Postgres container takes a while.
    hookTimeout: 120_000,
  },
});
