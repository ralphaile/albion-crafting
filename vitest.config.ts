import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["apps/*", "packages/*", "!packages/config-*"],
    coverage: {
      include: [
        "apps/*/src/**",
        "packages/*/src/**",
        "packages/crafting-data/scripts/**",
      ],
      reporter: ["text", "html", "json-summary"],
      exclude: [
        "apps/web/src/main.tsx",
        "packages/crafting-data/scripts/data-diff.ts",
        "packages/crafting-data/scripts/data-update.ts",
      ],
      thresholds: {
        "packages/core/src/**": { lines: 90, branches: 90 },
        "packages/core/src/evaluate.ts": { lines: 100, branches: 100 },
        "packages/market-prices/src/**": { lines: 80, branches: 80 },
        "packages/crafting-data/{src,scripts}/**": { lines: 80, branches: 80 },
        "apps/web/src/**": { lines: 60, branches: 60 },
      },
    },
  },
});
