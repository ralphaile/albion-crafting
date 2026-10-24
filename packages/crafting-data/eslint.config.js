import { defineConfig } from "eslint/config";

import { node } from "@aoc/eslint-config/node";
import { test } from "@aoc/eslint-config/test";

export default defineConfig(node, test);
