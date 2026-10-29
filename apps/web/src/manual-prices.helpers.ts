import { choosePrice } from "@aoc/core";
import type { ItemPrices, ObservedPrice, Region } from "@aoc/market-prices";

import type {
  CraftPrices,
  SeenPrice,
  UsedItemPrices,
  UsedPrice,
  UsedPrices,
} from "./best-crafts.types";
import type { ManualPrice, ManualPriceKey } from "./manual-prices.types";

const MINUTE_MS = 60_000;

const MISSING: ObservedPrice = { status: "missing" };

interface PricesAt {
  region: Region;
  marketId: string;
  quality: number;
}

interface ChoiceOptions {
  manualStaleAfterMinutes: number;
  preferManual: boolean;
  now: number;
}

export function sameManualPrice(a: ManualPriceKey, b: ManualPriceKey) {
  return (
    a.region === b.region &&
    a.itemId === b.itemId &&
    a.marketId === b.marketId &&
    a.quality === b.quality &&
    a.source === b.source
  );
}

function observed(
  { value, enteredAt }: ManualPrice,
  { now, manualStaleAfterMinutes }: ChoiceOptions,
): SeenPrice {
  const ageMs = Math.max(0, now - enteredAt);
  return {
    status: ageMs > manualStaleAfterMinutes * MINUTE_MS ? "stale" : "fresh",
    value,
    observedAt: enteredAt,
    ageMinutes: Math.floor(ageMs / MINUTE_MS),
  };
}

function usedPrice(
  api: ObservedPrice,
  manual: SeenPrice | undefined,
  preferManual: boolean,
): UsedPrice {
  if (manual === undefined) {
    return { ...api, origin: "api" };
  }
  if (choosePrice(api, manual, { preferManual }) === "api") {
    return { ...api, origin: "api", passedOver: manual };
  }
  return api.status === "missing"
    ? { ...manual, origin: "manual" }
    : { ...manual, origin: "manual", passedOver: api };
}

function chooseAt(
  rows: readonly ItemPrices[],
  manualPrices: readonly ManualPrice[],
  { region, marketId, quality }: PricesAt,
  options: ChoiceOptions,
): UsedItemPrices[] {
  const typed = new Map<string, ManualPrice[]>();
  for (const price of manualPrices) {
    if (
      price.region === region &&
      price.marketId === marketId &&
      price.quality === quality
    ) {
      typed.set(price.itemId, [...(typed.get(price.itemId) ?? []), price]);
    }
  }
  const fetched = new Set(rows.map(({ itemId }) => itemId));
  const typedOnly = [...typed.keys()]
    .filter((itemId) => !fetched.has(itemId))
    .map((itemId): ItemPrices => ({
      itemId,
      marketId,
      quality,
      sellMin: MISSING,
      buyMax: MISSING,
    }));

  return [...rows, ...typedOnly].map((row) => {
    const manual = (source: ManualPrice["source"]) => {
      const price = typed
        .get(row.itemId)
        ?.find((candidate) => candidate.source === source);
      return price === undefined ? undefined : observed(price, options);
    };
    return {
      ...row,
      sellMin: usedPrice(row.sellMin, manual("sellMin"), options.preferManual),
      buyMax: usedPrice(row.buyMax, manual("buyMax"), options.preferManual),
    };
  });
}

// Picks the price each craft uses: the API's or the one typed for the same
// server, market, quality and order.
export function withManualPrices(
  prices: CraftPrices,
  manualPrices: readonly ManualPrice[],
  {
    region,
    buyMarketId,
    sellMarketId,
    quality,
    manualStaleAfterMinutes,
    preferManual,
  }: {
    region: Region;
    buyMarketId: string;
    sellMarketId: string;
    quality: number;
    manualStaleAfterMinutes: number;
    preferManual: boolean;
  },
  now = Date.now(),
): UsedPrices {
  const options = { manualStaleAfterMinutes, preferManual, now };
  return {
    materials: chooseAt(
      prices.materials,
      manualPrices,
      { region, marketId: buyMarketId, quality },
      options,
    ),
    products: chooseAt(
      prices.products,
      manualPrices,
      { region, marketId: sellMarketId, quality },
      options,
    ),
  };
}
