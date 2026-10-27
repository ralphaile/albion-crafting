import { useEffect, useMemo, useState } from "react";

import {
  type CraftingPlace,
  type EvaluateSettings,
  pricesNeeded,
  type PricesNeeded,
} from "@aoc/core";
import { recipes } from "@aoc/crafting-data";
import type { BatchFailure, MarketData } from "@aoc/market-prices";

import { type Craft, type CraftPrices, evaluateCrafts } from "./best-crafts";
import { craftFilter, type Filters, NO_FILTERS, recipeFilter } from "./filters";
import type { Route } from "./route";

export type BestCrafts =
  | { status: "loading" }
  | { status: "error"; error: Error; retry: () => void }
  | {
      status: "ready";
      crafts: Craft[];
      failures: BatchFailure[];
      updating: boolean;
    };

type Fetched =
  | { status: "error"; error: Error }
  | { status: "ready"; prices: CraftPrices; failures: BatchFailure[] };

interface Answer {
  buyMarketId: string;
  sellMarketId: string;
  attempt: number;
  products: ReadonlySet<string>;
  fetched: Fetched;
}

const QUALITIES = [1];

async function fetchPrices(
  marketData: MarketData,
  needed: PricesNeeded,
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

// Only the filters that need no prices, so a new minimum doesn't refetch.
function useSelectedRecipes(filters: Filters, place: CraftingPlace) {
  const { tiers, enchants, categories, artifacts, specialtyOnly } = filters;
  const search = filters.search.trim();
  return useMemo(
    () =>
      recipes.filter(
        recipeFilter(
          {
            ...NO_FILTERS,
            tiers,
            enchants,
            categories,
            artifacts,
            specialtyOnly,
            search,
          },
          place,
        ),
      ),
    [tiers, enchants, categories, artifacts, specialtyOnly, search, place],
  );
}

export function useBestCrafts(
  marketData: MarketData,
  { place, buyMarketId, sellMarketId }: Route,
  settings: EvaluateSettings,
  filters: Filters,
): BestCrafts {
  const [attempt, setAttempt] = useState(0);
  const [answer, setAnswer] = useState<Answer>();
  const selected = useSelectedRecipes(filters, place);
  const needed = useMemo(() => pricesNeeded(selected), [selected]);

  const current =
    answer?.buyMarketId === buyMarketId &&
    answer.sellMarketId === sellMarketId &&
    answer.attempt === attempt
      ? answer
      : undefined;
  // The selected recipes the last answer has prices for. When that's all of
  // them, narrowing the filters needs no new request.
  const priced = useMemo(
    () =>
      current === undefined
        ? []
        : selected.filter(({ itemId }) => current.products.has(itemId)),
    [current, selected],
  );
  const covered = current !== undefined && priced.length === selected.length;
  const needsFetch = selected.length > 0 && !covered;

  useEffect(() => {
    if (!needsFetch) {
      return;
    }
    let active = true;
    void fetchPrices(marketData, needed, buyMarketId, sellMarketId).then(
      (fetched) => {
        if (active) {
          setAnswer({
            buyMarketId,
            sellMarketId,
            attempt,
            products: new Set(needed.products),
            fetched,
          });
        }
      },
    );
    return () => {
      active = false;
    };
  }, [needsFetch, marketData, needed, buyMarketId, sellMarketId, attempt]);

  const prices =
    current?.fetched.status === "ready" ? current.fetched.prices : undefined;
  const evaluated = useMemo(
    () =>
      prices === undefined
        ? []
        : evaluateCrafts(priced, place, settings, prices),
    [priced, place, settings, prices],
  );
  const crafts = useMemo(
    () => evaluated.filter(craftFilter(filters)),
    [evaluated, filters],
  );

  if (selected.length === 0) {
    return { status: "ready", crafts: [], failures: [], updating: false };
  }
  if (current?.fetched.status === "error" && covered) {
    return {
      status: "error",
      error: current.fetched.error,
      retry: () => {
        setAttempt((count) => count + 1);
      },
    };
  }
  if (current?.fetched.status === "ready" && priced.length > 0) {
    return {
      status: "ready",
      crafts,
      failures: current.fetched.failures,
      updating: !covered,
    };
  }
  return { status: "loading" };
}
