import { defineConfig } from "eslint/config";
import globals from "globals";

import { base } from "./base.js";

export const node = defineConfig(base, {
  languageOptions: { globals: globals.node },
  rules: {
    "import-x/no-nodejs-modules": "off",
    "no-restricted-globals": "off",
  },
});
