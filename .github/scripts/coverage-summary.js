import { readFileSync } from "node:fs";
import path from "node:path";

import config from "../../vitest.config.ts";

const metrics = ["lines", "branches", "functions", "statements"];
const summary = JSON.parse(
  readFileSync("coverage/coverage-summary.json", "utf8"),
);
const thresholds = Object.entries(config.test.coverage.thresholds);

const packages = new Map();
for (const [file, coverage] of Object.entries(summary)) {
  if (file === "total") {
    continue;
  }
  const name = path
    .relative(process.cwd(), file)
    .split(path.sep)
    .slice(0, 2)
    .join("/");
  const totals =
    packages.get(name) ??
    Object.fromEntries(
      metrics.map((metric) => [metric, { covered: 0, total: 0 }]),
    );
  for (const metric of metrics) {
    totals[metric].covered += coverage[metric].covered;
    totals[metric].total += coverage[metric].total;
  }
  packages.set(name, totals);
}

function cell({ covered, total }, minimum) {
  const value =
    total === 0 ? "–" : `${Math.floor((covered / total) * 1000) / 10}%`;
  return minimum === undefined ? value : `${value} (min ${minimum}%)`;
}

const rows = [...packages]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([name, totals]) => {
    const minimums =
      thresholds.find(([glob]) => glob.startsWith(`${name}/`))?.[1] ?? {};
    const cells = metrics.map((metric) =>
      cell(totals[metric], minimums[metric]),
    );
    return `| \`${name}\` | ${cells.join(" | ")} |`;
  });

console.log(
  [
    "## Coverage",
    "",
    "| Package | Lines | Branches | Functions | Statements |",
    "| ------- | ----- | -------- | --------- | ---------- |",
    ...rows,
    "",
    "– means there is nothing of that kind to cover yet.",
  ].join("\n"),
);
