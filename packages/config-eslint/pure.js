import { defineConfig } from "eslint/config";
import globals from "globals";

import { base, nodeOnlyGlobals } from "./base.js";

const browserOnlyGlobals = Object.keys(globals.browser)
  .filter((name) => !Object.hasOwn(globals.node, name))
  .map((name) => ({ name, message: "It only exists in browsers." }));

const ioGlobals = [
  "BroadcastChannel",
  "fetch",
  "localStorage",
  "navigator",
  "sessionStorage",
  "WebSocket",
].map((name) => ({ name, message: "Pure code does no I/O." }));

export const pure = defineConfig(base, {
  ignores: ["**/*.config.{js,ts}"],
  rules: {
    "no-restricted-globals": [
      "error",
      ...nodeOnlyGlobals,
      ...browserOnlyGlobals,
      ...ioGlobals,
    ],
  },
});
