import { NO_DATA_DATE } from "./aodp.constants.js";
import { parseAodpDate } from "./aodp.helpers.js";
import type {
  ItemPrices,
  NormalizeOptions,
  ObservedPrice,
} from "./prices.types.js";
import type { MarkedPrice } from "./snapshot.types.js";

const MINUTE_MS = 60_000;
const DEFAULT_STALE_AFTER_MINUTES = 12 * 60;

function aged(
  value: number,
  observedAt: number,
  fromSnapshot: boolean,
  {
    now = Date.now(),
    staleAfterMinutes = DEFAULT_STALE_AFTER_MINUTES,
  }: NormalizeOptions,
  atLeastMinutes = 0,
): ObservedPrice {
  const ageMs = Math.max(0, now - observedAt, atLeastMinutes * MINUTE_MS);
  return {
    status: ageMs > staleAfterMinutes * MINUTE_MS ? "stale" : "fresh",
    value,
    observedAt,
    ageMinutes: Math.floor(ageMs / MINUTE_MS),
    ...(fromSnapshot && { fromSnapshot }),
  };
}

export function normalizePrices(
  rows: readonly MarkedPrice[],
  options: NormalizeOptions = {},
): ItemPrices[] {
  function price(
    value: number,
    date: string,
    fromSnapshot = false,
  ): ObservedPrice {
    if (value === 0 || date === NO_DATA_DATE) {
      return { status: "missing" };
    }
    return aged(value, parseAodpDate(date), fromSnapshot, options);
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

// The same prices with their age and fresh or stale worked out again at `now`,
// from when AODP saw them. An age never goes down, so a `now` from before the
// prices were fetched keeps the age they came with.
export function agePrices(
  rows: readonly ItemPrices[],
  options: NormalizeOptions,
): ItemPrices[] {
  const again = (price: ObservedPrice): ObservedPrice =>
    price.status === "missing"
      ? price
      : aged(
          price.value,
          price.observedAt,
          price.fromSnapshot === true,
          options,
          price.ageMinutes,
        );
  return rows.map((row) => ({
    ...row,
    sellMin: again(row.sellMin),
    buyMax: again(row.buyMax),
  }));
}
