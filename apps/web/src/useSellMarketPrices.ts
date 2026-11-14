import { useEffect, useState } from "react";

import { HIGHER_QUALITIES } from "@aoc/core";
import type {
  HistorySummary,
  ItemPrices,
  MarketData,
  Region,
} from "@aoc/market-prices";

import { QUALITY } from "./prices.constants";

export type SellMarketPrices =
  | { status: "loading" }
  | { status: "error"; error: Error }
  | {
      status: "ready";
      prices: readonly ItemPrices[];
      history: readonly HistorySummary[];
    };

// One item's prices and history in every market given, in one request each.
// Quality-weighted, the prices have qualities 2 to 5 too.
export function useSellMarketPrices(
  marketData: MarketData,
  itemId: string,
  marketIds: readonly string[],
  {
    server,
    staleAfterHours,
    qualityWeighted,
  }: { server: Region; staleAfterHours: number; qualityWeighted: boolean },
): SellMarketPrices {
  const key = JSON.stringify([
    itemId,
    marketIds,
    server,
    staleAfterHours,
    qualityWeighted,
  ]);
  const [answer, setAnswer] = useState<{
    key: string;
    prices: SellMarketPrices;
  }>();

  useEffect(() => {
    let active = true;
    Promise.all([
      marketData.getPrices(
        [itemId],
        marketIds,
        qualityWeighted ? [QUALITY, ...HIGHER_QUALITIES] : [QUALITY],
        {
          region: server,
          staleAfterMinutes: staleAfterHours * 60,
        },
      ),
      // Without history, prices are only not judged as outliers.
      marketData
        .getHistory([itemId], marketIds, [QUALITY], { region: server })
        .then(
          (result) => result.history,
          () => [],
        ),
    ]).then(
      ([{ prices }, history]) => {
        if (active) {
          setAnswer({ key, prices: { status: "ready", prices, history } });
        }
      },
      (error: unknown) => {
        if (active) {
          setAnswer({
            key,
            prices: {
              status: "error",
              error: error instanceof Error ? error : new Error(String(error)),
            },
          });
        }
      },
    );
    return () => {
      active = false;
    };
  }, [
    marketData,
    key,
    itemId,
    marketIds,
    server,
    staleAfterHours,
    qualityWeighted,
  ]);

  return answer?.key === key ? answer.prices : { status: "loading" };
}
