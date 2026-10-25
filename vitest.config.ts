import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["apps/*", "packages/*", "!packages/config-*"],
    coverage: {
      include: ["apps/*/src/**", "packages/*/src/**"],
      reporter: ["text", "html", "json-summary"],
      exclude: ["apps/web/src/main.tsx"],
      thresholds: {
        "packages/core/src/**": { lines: 90, branches: 90 },
        "packages/market-prices/src/**": { lines: 80, branches: 80 },
        "packages/crafting-data/src/**": { lines: 80, branches: 80 },
        "apps/web/src/**": { lines: 60, branches: 60 },
      },
    },
  },
});
