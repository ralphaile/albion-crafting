import { useEffect, useState } from "react";

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
export function useSellMarketPrices(
  marketData: MarketData,
  itemId: string,
  marketIds: readonly string[],
  { server, staleAfterHours }: { server: Region; staleAfterHours: number },
): SellMarketPrices {
  const key = JSON.stringify([itemId, marketIds, server, staleAfterHours]);
  const [answer, setAnswer] = useState<{
    key: string;
    prices: SellMarketPrices;
  }>();

  useEffect(() => {
    let active = true;
    Promise.all([
      marketData.getPrices([itemId], marketIds, [QUALITY], {
        region: server,
        staleAfterMinutes: staleAfterHours * 60,
      }),
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
  }, [marketData, key, itemId, marketIds, server, staleAfterHours]);

  return answer?.key === key ? answer.prices : { status: "loading" };
}
