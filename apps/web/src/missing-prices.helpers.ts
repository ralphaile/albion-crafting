import type { Region } from "@aoc/market-prices";

import type { Craft } from "./best-crafts.types";
import type { ManualPriceKey } from "./manual-prices.types";
import type { MissingPrice } from "./missing-prices.types";

interface PricesAt {
  region: Region;
  buyMarketId: string;
  sellMarketId: string;
  quality: number;
}

function missingKeys(
  craft: Craft,
  { region, buyMarketId, sellMarketId, quality }: PricesAt,
): ManualPriceKey[] {
  const key = (
    itemId: string,
    marketId: string,
    source: ManualPriceKey["source"],
  ): ManualPriceKey => ({ region, itemId, marketId, quality, source });
  return [
    ...craft.materialCost.lines
      .filter(({ status }) => status === "missing")
      .map(({ itemId, source }) => key(itemId, buyMarketId, source)),
    ...(craft.revenue.status === "missing"
      ? [key(craft.itemId, sellMarketId, craft.revenue.source)]
      : []),
  ];
}

// Each price that keeps a craft incomplete, the one the most crafts need
// first. Ties keep the order of the crafts.
export function missingPrices(
  crafts: readonly Craft[],
  at: PricesAt,
): MissingPrice[] {
  const found = new Map<string, MissingPrice>();
  for (const craft of crafts) {
    const keys = new Map(
      missingKeys(craft, at).map((key) => [
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
