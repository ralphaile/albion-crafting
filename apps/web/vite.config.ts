import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

function githubPagesFallback(): Plugin {
  return {
    name: "github-pages-fallback",
    apply: "build",
    enforce: "post",
    generateBundle(_options, bundle) {
      const index = bundle["index.html"];
      if (index?.type !== "asset") {
        return this.error("index.html is missing from the build");
      }
      this.emitFile({
        type: "asset",
        fileName: "404.html",
        source: index.source,
      });
    },
  };
}

export default defineConfig({
  base: "/albion-crafting/",
  plugins: [react(), githubPagesFallback()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["test/setup.ts"],
  },
});
