import { useEffect, useMemo, useState } from "react";

import { type CraftingPlace, pricesNeeded, type PricesNeeded } from "@aoc/core";
import { recipes } from "@aoc/crafting-data";
import type {
  BatchFailure,
  MarketData,
  PricesOptions,
  Region,
} from "@aoc/market-prices";

import { evaluateCrafts } from "./best-crafts.helpers";
import type { Craft, CraftPrices } from "./best-crafts.types";
import { NO_FILTERS } from "./filters.constants";
import { craftFilter, recipeFilter } from "./filters.helpers";
import type { Filters } from "./filters.types";
import { withManualPrices } from "./manual-prices.helpers";
import type { ManualPrice } from "./manual-prices.types";
import { QUALITY } from "./prices.constants";
import { settingsForRoute } from "./route.helpers";
import type { Route } from "./route.types";
import type { CraftingSettings } from "./settings.types";

export type BestCrafts =
  | { status: "loading" }
  | { status: "error"; error: Error; crafts: Craft[]; retry: () => void }
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
  server: Region;
  staleAfterHours: number;
  attempt: number;
  products: ReadonlySet<string>;
  fetched: Fetched;
}

const QUALITIES = [QUALITY];

const NO_PRICES: CraftPrices = { materials: [], products: [] };

async function fetchPrices(
  marketData: MarketData,
  needed: PricesNeeded,
  buyMarketId: string,
  sellMarketId: string,
  options: PricesOptions,
): Promise<Fetched> {
  try {
    const [materials, products] = await Promise.all([
      marketData.getPrices(needed.materials, [buyMarketId], QUALITIES, options),
      marketData.getPrices(needed.products, [sellMarketId], QUALITIES, options),
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
  route: Route,
  settings: CraftingSettings,
  filters: Filters,
  manualPrices: readonly ManualPrice[],
): BestCrafts {
  const { place, buyMarketId, sellMarketId } = route;
  const { server, staleAfterHours } = settings;
  const [attempt, setAttempt] = useState(0);
  const [answer, setAnswer] = useState<Answer>();
  const selected = useSelectedRecipes(filters, place);
  const needed = useMemo(() => pricesNeeded(selected), [selected]);

  const current =
    answer?.buyMarketId === buyMarketId &&
    answer.sellMarketId === sellMarketId &&
    answer.server === server &&
    answer.staleAfterHours === staleAfterHours &&
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
    void fetchPrices(marketData, needed, buyMarketId, sellMarketId, {
      region: server,
      staleAfterMinutes: staleAfterHours * 60,
    }).then((fetched) => {
      if (active) {
        setAnswer({
          buyMarketId,
          sellMarketId,
          server,
          staleAfterHours,
          attempt,
          products: new Set(needed.products),
          fetched,
        });
      }
    });
    return () => {
      active = false;
    };
  }, [
    needsFetch,
    marketData,
    needed,
    buyMarketId,
    sellMarketId,
    server,
    staleAfterHours,
    attempt,
  ]);

  // When AODP gives nothing at all, the manual prices still price what they
  // can, and every other price is missing.
  const fetchedPrices =
    current?.fetched.status === "ready"
      ? current.fetched.prices
      : current?.fetched.status === "error"
        ? NO_PRICES
        : undefined;
  const prices = useMemo(
    () =>
      fetchedPrices &&
      withManualPrices(fetchedPrices, manualPrices, {
        region: server,
        buyMarketId,
        sellMarketId,
        quality: QUALITY,
      }),
    [fetchedPrices, manualPrices, server, buyMarketId, sellMarketId],
  );
  const routeSettings = useMemo(
    () => settingsForRoute(settings, route),
    [settings, route],
  );
  const evaluated = useMemo(
    () =>
      prices === undefined
        ? []
        : evaluateCrafts(priced, place, routeSettings, prices),
    [priced, place, routeSettings, prices],
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
      crafts,
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
