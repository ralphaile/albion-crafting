import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { update } from "./update.ts";

try {
  const { values } = parseArgs({
    options: { latest: { type: "boolean", default: false } },
  });
  await update({
    latest: values.latest,
    packageDir: fileURLToPath(new URL("..", import.meta.url)),
    log: (line) => {
      console.log(line);
    },
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
