import { defineConfig } from "eslint/config";

import { react } from "@aoc/eslint-config/react";
import { test } from "@aoc/eslint-config/test";

export default defineConfig(react, test);
