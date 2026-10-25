import vitest from "@vitest/eslint-plugin";
import { defineConfig } from "eslint/config";

export const test = defineConfig(
  {
    files: ["**/*.test.{ts,tsx}"],
    extends: [vitest.configs.recommended],
  },
  {
    files: ["**/*.test.{ts,tsx}", "**/e2e/**"],
    rules: {
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/unbound-method": "off",
    },
  },
  {
    files: ["**/e2e/**"],
    rules: {
      "no-empty-pattern": ["error", { allowObjectPatternsAsParameters: true }],
    },
  },
);
