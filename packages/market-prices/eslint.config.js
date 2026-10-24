import { defineConfig } from "eslint/config";

import { base } from "@aoc/eslint-config/base";
import { test } from "@aoc/eslint-config/test";

export default defineConfig(base, test);
