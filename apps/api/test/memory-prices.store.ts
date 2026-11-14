import type { AodpPrice } from "@aoc/market-prices";

import type { PriceStore } from "../src/price-store.types.js";

// The Postgres store's behavior, in memory, for tests that don't need a
// database.
export function memoryPriceStore(): PriceStore & { reachable: boolean } {
  const rows = new Map<string, { row: AodpPrice; fetchedAt: number }>();
  const keyOf = (region: string, row: AodpPrice) =>
    JSON.stringify([region, row.item_id, row.city, row.quality]);
  return {
    reachable: true,
    save(region, saved, fetchedAt) {
      for (const row of saved) {
        rows.set(keyOf(region, row), { row, fetchedAt });
      }
      return Promise.resolve();
    },
    read(region, itemIds, marketIds, qualities) {
      const markets = new Set(marketIds.map((id) => id.toLowerCase()));
      const found = [...rows]
        .filter(
          ([key, { row }]) =>
            key.startsWith(`["${region}",`) &&
            itemIds.includes(row.item_id) &&
            qualities.includes(row.quality) &&
            markets.has(row.city.toLowerCase()),
        )
        .map(([, value]) => value);
      return Promise.resolve({
        rows: found.map(({ row }) => row),
        fetchedAt:
          found.length === 0
            ? undefined
            : Math.min(...found.map(({ fetchedAt }) => fetchedAt)),
      });
    },
    ping() {
      return this.reachable
        ? Promise.resolve()
        : Promise.reject(new Error("Unreachable"));
    },
    close: () => Promise.resolve(),
  };
}

export function aodpPrice(
  itemId: string,
  city: string,
  sellPriceMin: number,
  { quality = 1, date = "2026-11-14T10:00:00" } = {},
): AodpPrice {
  const none = "0001-01-01T00:00:00";
  return {
    item_id: itemId,
    city,
    quality,
    sell_price_min: sellPriceMin,
    sell_price_min_date: sellPriceMin === 0 ? none : date,
    sell_price_max: 0,
    sell_price_max_date: none,
    buy_price_min: 0,
    buy_price_min_date: none,
    buy_price_max: 0,
    buy_price_max_date: none,
  };
}
