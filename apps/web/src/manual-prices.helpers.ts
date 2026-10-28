import type { ItemPrices, ObservedPrice, Region } from "@aoc/market-prices";

import type { CraftPrices } from "./best-crafts.types";
import type { ManualPrice } from "./manual-prices.types";

const MINUTE_MS = 60_000;

const MISSING: ObservedPrice = { status: "missing" };

interface PricesAt {
  region: Region;
  marketId: string;
  quality: number;
}

function observed({ value, enteredAt }: ManualPrice, now: number) {
  return {
    status: "fresh",
    value,
    observedAt: enteredAt,
    ageMinutes: Math.floor(Math.max(0, now - enteredAt) / MINUTE_MS),
  } satisfies ObservedPrice;
}

function applyAt(
  rows: readonly ItemPrices[],
  manualPrices: readonly ManualPrice[],
  { region, marketId, quality }: PricesAt,
  now: number,
): readonly ItemPrices[] {
  const here = manualPrices.filter(
    (price) =>
      price.region === region &&
      price.marketId === marketId &&
      price.quality === quality,
  );
  if (here.length === 0) {
    return rows;
  }
  const byItem = new Map(rows.map((row) => [row.itemId, row]));
  for (const price of here) {
    const row = byItem.get(price.itemId) ?? {
      itemId: price.itemId,
      marketId,
      quality,
      sellMin: MISSING,
      buyMax: MISSING,
    };
    byItem.set(price.itemId, { ...row, [price.source]: observed(price, now) });
  }
  return [...byItem.values()];
}

// Until prices have a precedence rule, a manual price always replaces the API's.
export function withManualPrices(
  prices: CraftPrices,
  manualPrices: readonly ManualPrice[],
  {
    region,
    buyMarketId,
    sellMarketId,
    quality,
  }: {
    region: Region;
    buyMarketId: string;
    sellMarketId: string;
    quality: number;
  },
  now = Date.now(),
): CraftPrices {
  return {
    materials: applyAt(
      prices.materials,
      manualPrices,
      { region, marketId: buyMarketId, quality },
      now,
    ),
    products: applyAt(
      prices.products,
      manualPrices,
      { region, marketId: sellMarketId, quality },
      now,
    ),
  };
}
