import type { PlanResult } from "@aoc/core";
import type { Region } from "@aoc/market-prices";

import type { Craft } from "./best-crafts.types";
import type { ManualPriceKey } from "./manual-prices.types";
import { materialMarketId } from "./material-markets.helpers";
import type { MaterialPins } from "./material-pins.types";
import type { MissingPrice } from "./missing-prices.types";
import type { CraftingPlan } from "./plan.types";
import type { MarketChoice } from "./route.types";

interface PricesAt extends MarketChoice {
  region: Region;
  sellMarketId: string;
  quality: number;
}

type Priced = Pick<Craft, "itemId" | "materialCost" | "revenue">;

function missingKeys(craft: Priced, at: PricesAt): ManualPriceKey[] {
  const key = (
    itemId: string,
    marketId: string,
    source: ManualPriceKey["source"],
  ): ManualPriceKey => ({
    region: at.region,
    itemId,
    marketId,
    quality: at.quality,
    source,
  });
  return [
    ...craft.materialCost.lines
      .filter(({ status }) => status === "missing")
      .map(({ itemId, source }) =>
        key(itemId, materialMarketId(at, itemId), source),
      ),
    ...(craft.revenue.status === "missing"
      ? [key(craft.itemId, at.sellMarketId, craft.revenue.source)]
      : []),
  ];
}

// Each price that keeps a craft incomplete, the one the most crafts need
// first. Ties keep the order of the crafts.
export function missingPrices(
  crafts: readonly Craft[],
  at: PricesAt,
): MissingPrice[] {
  return counted(crafts.map((craft) => missingKeys(craft, at)));
}

// The same for the plan, each entry in its own location's markets.
export function planMissingPrices(
  plan: CraftingPlan,
  result: PlanResult,
  at: Pick<PricesAt, "region" | "quality"> & { pins: MaterialPins },
): MissingPrice[] {
  return counted(
    plan.locations.flatMap(({ route, entries }, index) =>
      entries.flatMap((entry, entryIndex) => {
        const planned = result.locations[index]?.entries[entryIndex];
        return planned === undefined
          ? []
          : [
              missingKeys(
                { ...planned.evaluation, itemId: entry.itemId },
                { ...at, ...route },
              ),
            ];
      }),
    ),
  );
}

function counted(keyLists: readonly ManualPriceKey[][]): MissingPrice[] {
  const found = new Map<string, MissingPrice>();
  for (const keyList of keyLists) {
    const keys = new Map(
      keyList.map((key) => [
        `${key.itemId} ${key.marketId} ${key.source}`,
        key,
      ]),
    );
    for (const [id, key] of keys) {
      found.set(id, { key, craftCount: (found.get(id)?.craftCount ?? 0) + 1 });
    }
  }
  return [...found.values()].sort((a, b) => b.craftCount - a.craftCount);
}
