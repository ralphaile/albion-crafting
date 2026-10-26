import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    setupFiles: ["test/setup.ts"],
    // Not UTC, so that reading AODP's UTC dates as local time fails a test, even on CI
    env: { TZ: "Asia/Tokyo" },
  },
});
