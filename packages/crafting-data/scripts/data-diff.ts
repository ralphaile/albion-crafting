import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { type GeneratedData, diffData } from "./diff.ts";
import { formatReport } from "./report.ts";
import type { Source } from "./source.ts";

const packageDir = fileURLToPath(new URL("..", import.meta.url));
const reportPath = join(packageDir, "data-diff.md");

async function readCommitted(path: string): Promise<string> {
  const { stdout } = await promisify(execFile)(
    "git",
    ["show", `HEAD:./${path}`],
    { cwd: packageDir, maxBuffer: 256 * 1024 * 1024 },
  );
  return stdout;
}

async function readCurrent(path: string): Promise<string> {
  return readFile(join(packageDir, path), "utf8");
}

async function readData(
  read: (path: string) => Promise<string>,
): Promise<GeneratedData> {
  const json = async <T>(file: string) =>
    JSON.parse(await read(`src/generated/${file}`)) as T;
  return {
    recipes: await json("recipes.json"),
    items: await json("items.json"),
    locations: await json("locations.json"),
    hideouts: await json("hideouts.json"),
  };
}

async function readCommit(
  read: (path: string) => Promise<string>,
): Promise<Source> {
  return JSON.parse(await read("source.json")) as Source;
}

try {
  const [before, after, sourceBefore, sourceAfter] = await Promise.all([
    readData(readCommitted),
    readData(readCurrent),
    readCommit(readCommitted),
    readCommit(readCurrent),
  ]);
  const diff = diffData(before, after);
  await writeFile(
    reportPath,
    formatReport(diff, {
      repository: sourceAfter.repository,
      before: sourceBefore.commit.slice(0, 10),
      after: sourceAfter.commit.slice(0, 10),
    }),
  );
  const { items, recipes, bonuses } = diff.totals;
  console.log(
    [
      `Items: ${String(items.added)} added, ${String(items.removed)} removed`,
      `Recipes: ${String(recipes.added)} added, ${String(recipes.removed)} removed, ${String(recipes.changed)} changed`,
      `Crafting bonuses: ${String(bonuses.added)} added, ${String(bonuses.removed)} removed, ${String(bonuses.changed)} changed`,
      `Wrote the report to ${reportPath}`,
    ].join("\n"),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
