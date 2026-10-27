import { useEffect, useMemo, useState } from "react";

import { type EvaluateSettings, pricesNeeded } from "@aoc/core";
import { recipes } from "@aoc/crafting-data";
import type { BatchFailure, MarketData } from "@aoc/market-prices";

import { type Craft, type CraftPrices, evaluateCrafts } from "./best-crafts";
import type { Route } from "./route";

export type BestCrafts =
  | { status: "loading" }
  | { status: "error"; error: Error; retry: () => void }
  | { status: "ready"; crafts: Craft[]; failures: BatchFailure[] };

type Fetched =
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "ready"; prices: CraftPrices; failures: BatchFailure[] };

const LOADING: Fetched = { status: "loading" };
const QUALITIES = [1];
const needed = pricesNeeded(recipes);

async function fetchPrices(
  marketData: MarketData,
  buyMarketId: string,
  sellMarketId: string,
): Promise<Fetched> {
  try {
    const [materials, products] = await Promise.all([
      marketData.getPrices(needed.materials, [buyMarketId], QUALITIES),
      marketData.getPrices(needed.products, [sellMarketId], QUALITIES),
    ]);
    const failures = [...materials.failures, ...products.failures];
    const [firstFailure] = failures;
    if (
      firstFailure !== undefined &&
      materials.prices.length + products.prices.length === 0
    ) {
      return { status: "error", error: firstFailure.error };
    }
    return {
      status: "ready",
      prices: { materials: materials.prices, products: products.prices },
      failures,
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

export function useBestCrafts(
  marketData: MarketData,
  { place, buyMarketId, sellMarketId }: Route,
  settings: EvaluateSettings,
): BestCrafts {
  const [attempt, setAttempt] = useState(0);
  const request = JSON.stringify([buyMarketId, sellMarketId, attempt]);
  const [answer, setAnswer] = useState<{ request: string; fetched: Fetched }>();
  const fetched: Fetched =
    answer?.request === request ? answer.fetched : LOADING;

  useEffect(() => {
    let current = true;
    void fetchPrices(marketData, buyMarketId, sellMarketId).then((result) => {
      if (current) {
        setAnswer({ request, fetched: result });
      }
    });
    return () => {
      current = false;
    };
  }, [marketData, buyMarketId, sellMarketId, request]);

  const crafts = useMemo(
    () =>
      fetched.status === "ready"
        ? evaluateCrafts(recipes, place, settings, fetched.prices)
        : [],
    [fetched, place, settings],
  );

  switch (fetched.status) {
    case "loading":
      return fetched;
    case "error":
      return {
        status: "error",
        error: fetched.error,
        retry: () => {
          setAttempt((count) => count + 1);
        },
      };
    case "ready":
      return { status: "ready", crafts, failures: fetched.failures };
  }
}
