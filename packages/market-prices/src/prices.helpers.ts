import { NO_DATA_DATE } from "./aodp.constants.js";
import { parseAodpDate } from "./aodp.helpers.js";
import type {
  ItemPrices,
  NormalizeOptions,
  ObservedPrice,
} from "./prices.types.js";
import type { MarkedPrice } from "./snapshot.types.js";

const MINUTE_MS = 60_000;

export function normalizePrices(
  rows: readonly MarkedPrice[],
  { now = Date.now(), staleAfterMinutes = 12 * 60 }: NormalizeOptions = {},
): ItemPrices[] {
  function price(
    value: number,
    date: string,
    fromSnapshot = false,
  ): ObservedPrice {
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
      ...(fromSnapshot && { fromSnapshot }),
    };
  }

  return rows.map((row) => ({
    itemId: row.item_id,
    marketId: row.city,
    quality: row.quality,
    sellMin: price(
      row.sell_price_min,
      row.sell_price_min_date,
      row.sellFromSnapshot,
    ),
    buyMax: price(
      row.buy_price_max,
      row.buy_price_max_date,
      row.buyFromSnapshot,
    ),
  }));
}
