import type { OrderPrices } from "@aoc/core";

import { type AodpPrice, NO_DATA_DATE, parseAodpDate } from "./aodp.js";

export type ObservedPrice =
  | { status: "missing" }
  | {
      status: "fresh" | "stale";
      value: number;
      observedAt: number;
      ageMinutes: number;
    };

export interface ItemPrices extends OrderPrices {
  itemId: string;
  marketId: string;
  quality: number;
  sellMin: ObservedPrice;
  buyMax: ObservedPrice;
}

export interface NormalizeOptions {
  now?: number;
  staleAfterMinutes?: number;
}

const MINUTE_MS = 60_000;

export function normalizePrices(
  rows: readonly AodpPrice[],
  { now = Date.now(), staleAfterMinutes = 12 * 60 }: NormalizeOptions = {},
): ItemPrices[] {
  function price(value: number, date: string): ObservedPrice {
    if (value === 0 || date === NO_DATA_DATE) {
      return { status: "missing" };
    }
    const observedAt = parseAodpDate(date);
    const ageMs = Math.max(0, now - observedAt);
    return {
      status: ageMs > staleAfterMinutes * MINUTE_MS ? "stale" : "fresh",
      value,
      observedAt,
      ageMinutes: Math.floor(ageMs / MINUTE_MS),
    };
  }

  return rows.map((row) => ({
    itemId: row.item_id,
    marketId: row.city,
    quality: row.quality,
    sellMin: price(row.sell_price_min, row.sell_price_min_date),
    buyMax: price(row.buy_price_max, row.buy_price_max_date),
  }));
}
