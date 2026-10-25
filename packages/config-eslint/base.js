import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import prettier from "eslint-config-prettier/flat";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import { importX } from "eslint-plugin-import-x";
import globals from "globals";
import { configs as typescriptConfigs } from "typescript-eslint";

export const nodeOnlyGlobals = Object.keys(globals.node)
  .filter((name) => !Object.hasOwn(globals.browser, name))
  .map((name) => ({ name, message: "It only exists in Node." }));

export const base = defineConfig(
  globalIgnores(["**/dist/", "**/coverage/"]),
  js.configs.recommended,
  typescriptConfigs.strictTypeChecked,
  typescriptConfigs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true },
    },
  },
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  {
    settings: {
      "import-x/internal-regex": "^@aoc/",
      "import-x/resolver-next": [createTypeScriptImportResolver()],
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      eqeqeq: "error",
      "import-x/no-cycle": "error",
      "import-x/no-default-export": "error",
      "import-x/no-duplicates": "error",
      "import-x/no-extraneous-dependencies": "error",
      "import-x/no-nodejs-modules": "error",
      "import-x/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            ["parent", "sibling", "index"],
          ],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "no-console": "error",
      "no-restricted-globals": ["error", ...nodeOnlyGlobals],
    },
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    extends: [typescriptConfigs.disableTypeChecked],
  },
  {
    files: ["**/*.config.{js,ts}"],
    rules: {
      "import-x/no-default-export": "off",
      "import-x/no-nodejs-modules": "off",
      "no-restricted-globals": "off",
    },
  },
  {
    files: ["**/scripts/**"],
    rules: { "no-console": "off" },
  },
  prettier,
);
