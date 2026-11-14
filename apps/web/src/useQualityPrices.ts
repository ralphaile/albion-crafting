import { useEffect, useMemo, useState } from "react";

import { HIGHER_QUALITIES, type OrderPrices } from "@aoc/core";
import type { MarketData, Region } from "@aoc/market-prices";

export type QualityPrices = ReadonlyMap<
  string,
  ReadonlyMap<number, OrderPrices>
>;

const NO_QUALITY_PRICES: QualityPrices = new Map();

// Qualities 2 to 5 of the items in the sell market, asked for only when
// `enabled`, so normal-quality ranking costs no extra requests. Until they
// come, or if they fail, there are none and each quality takes the normal
// price, marked estimated. A new `attempt` asks again, with `force` as
// Refresh prices does for the normal prices.
export function useQualityPrices(
  marketData: MarketData,
  itemIds: readonly string[],
  sellMarketId: string,
  {
    enabled,
    region,
    staleAfterHours,
    attempt,
    force,
  }: {
    enabled: boolean;
    region: Region;
    staleAfterHours: number;
    attempt: number;
    force: boolean;
  },
): QualityPrices {
  const key = useMemo(
    () =>
      enabled
        ? JSON.stringify([
            region,
            staleAfterHours,
            sellMarketId,
            attempt,
            itemIds,
          ])
        : undefined,
    [enabled, region, staleAfterHours, sellMarketId, attempt, itemIds],
  );
  const [fetched, setFetched] = useState<{
    key: string;
    prices: QualityPrices;
  }>();

  useEffect(() => {
    if (key === undefined || itemIds.length === 0) {
      return undefined;
    }
    let active = true;
    marketData
      .getPrices(itemIds, [sellMarketId], HIGHER_QUALITIES, {
        region,
        staleAfterMinutes: staleAfterHours * 60,
        force,
      })
      .then(
        ({ prices }) => {
          const byItem = new Map<string, Map<number, OrderPrices>>();
          for (const price of prices) {
            const qualities =
              byItem.get(price.itemId) ?? new Map<number, OrderPrices>();
            qualities.set(price.quality, price);
            byItem.set(price.itemId, qualities);
          }
          if (active) {
            setFetched({ key, prices: byItem });
          }
        },
        () => undefined,
      );
    return () => {
      active = false;
    };
    // The key stands for the item IDs, which come as a new array each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketData, key]);

  return fetched !== undefined && fetched.key === key
    ? fetched.prices
    : NO_QUALITY_PRICES;
}
