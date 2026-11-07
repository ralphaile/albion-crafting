import type { HistorySummary } from "@aoc/market-prices";

import type {
  CraftHistory,
  UsedItemPrices,
  UsedPrice,
  UsedPrices,
} from "./best-crafts.types";

export interface OutlierOptions {
  ratio: number;
  useAverage: boolean;
}

type Side = "materials" | "products";

// Only AODP's prices are judged: a price you typed is taken as meant. The
// average only replaces an outlier that flatters the craft, a product above
// it or a material below it. The other way, such as a low buy order on a slow
// item, the price is likely what you'd really get or pay.
function judged(
  price: UsedPrice,
  average: number,
  side: Side,
  { ratio, useAverage }: OutlierOptions,
): UsedPrice {
  if (price.status === "missing" || price.origin !== "api") {
    return price;
  }
  const above = price.value > average * ratio;
  const below = price.value < average / ratio;
  if (!above && !below) {
    return price;
  }
  const usingAverage = useAverage && (side === "products" ? above : below);
  return {
    ...price,
    value: usingAverage ? average : price.value,
    outlier: { seen: price.value, average, usingAverage },
  };
}

function judgedAt(
  rows: readonly UsedItemPrices[],
  history: readonly HistorySummary[],
  side: Side,
  options: OutlierOptions,
): UsedItemPrices[] {
  const averages = new Map(
    history.map(({ itemId, averagePrice }) => [itemId, averagePrice]),
  );
  return rows.map((row) => {
    const average = averages.get(row.itemId);
    return average === undefined
      ? row
      : {
          ...row,
          sellMin: judged(row.sellMin, average, side, options),
          buyMax: judged(row.buyMax, average, side, options),
        };
  });
}

// Flags each price more than `ratio` times above or below its 7-day average,
// and uses the average instead when asked. Items without sales in those days
// have no average, so their prices aren't judged.
export function withOutliers(
  prices: UsedPrices,
  history: CraftHistory,
  options: OutlierOptions,
): UsedPrices {
  return {
    materials: judgedAt(
      prices.materials,
      history.materials,
      "materials",
      options,
    ),
    products: judgedAt(prices.products, history.products, "products", options),
  };
}
