import { defineConfig } from "eslint/config";

import { pure } from "@aoc/eslint-config/pure";
import { test } from "@aoc/eslint-config/test";

export default defineConfig(pure, test);
