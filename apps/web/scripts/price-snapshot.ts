import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";

import { recipes, refiningRecipes } from "@aoc/crafting-data";
import {
  type Region,
  fetchPriceSnapshots,
  snapshotPath,
  snapshotReader,
} from "@aoc/market-prices";

const REGIONS: readonly Region[] = ["west", "europe", "east"];
const PUBLISHED_URL = "https://ralphaile.github.io/albion-crafting/prices/";

// Every item a recipe makes or uses, alternatives included.
function pricedItemIds(): string[] {
  const itemIds = new Set<string>();
  for (const recipe of [...recipes, ...refiningRecipes]) {
    itemIds.add(recipe.itemId);
    for (const { materials } of [recipe, ...recipe.alternatives]) {
      for (const { id } of materials) {
        itemIds.add(id);
      }
    }
  }
  return [...itemIds].sort();
}

try {
  const { values } = parseArgs({
    options: { out: { type: "string", default: "dist/prices" } },
  });
  const itemIds = pricedItemIds();
  const lastSnapshot = snapshotReader(PUBLISHED_URL);
  console.log(`Fetching ${String(itemIds.length)} items in every market`);
  for (const region of REGIONS) {
    const { snapshots, failures } = await fetchPriceSnapshots(itemIds, region, {
      lastSnapshot,
    });
    for (const [marketId, snapshot] of snapshots) {
      const file = join(values.out, snapshotPath(region, marketId));
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, JSON.stringify(snapshot));
    }
    const prices = [...snapshots.values()].reduce(
      (sum, { rows }) => sum + rows.length,
      0,
    );
    console.log(
      `${region}: ${String(prices)} prices in ${String(snapshots.size)} markets`,
    );
    const failed = failures.reduce(
      (sum, { itemIds: batch }) => sum + batch.length,
      0,
    );
    if (failed > 0) {
      // GitHub Actions shows this line as a warning on the run.
      console.log(
        `::warning title=Price snapshot::AODP didn't answer for ${String(failed)} items on ${region}, so they keep their last published prices`,
      );
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
