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

// Only AODP's prices are judged: a price you typed is taken as meant.
function judged(
  price: UsedPrice,
  average: number,
  { ratio, useAverage }: OutlierOptions,
): UsedPrice {
  if (price.status === "missing" || price.origin !== "api") {
    return price;
  }
  if (price.value <= average * ratio && price.value >= average / ratio) {
    return price;
  }
  return {
    ...price,
    value: useAverage ? average : price.value,
    outlier: { seen: price.value, average, usingAverage: useAverage },
  };
}

function judgedAt(
  rows: readonly UsedItemPrices[],
  history: readonly HistorySummary[],
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
          sellMin: judged(row.sellMin, average, options),
          buyMax: judged(row.buyMax, average, options),
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
    materials: judgedAt(prices.materials, history.materials, options),
    products: judgedAt(prices.products, history.products, options),
  };
}
