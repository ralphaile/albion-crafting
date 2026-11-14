import { useEffect, useMemo, useState } from "react";

import { HIGHER_QUALITIES, type PlanResult, evaluatePlan } from "@aoc/core";
import type {
  HistorySummary,
  ItemPrices,
  MarketData,
} from "@aoc/market-prices";

import type { UsedItemPrices, UsedPrices } from "./best-crafts.types";
import { withManualPrices } from "./manual-prices.helpers";
import type { ManualPrice } from "./manual-prices.types";
import { materialMarketId } from "./material-markets.helpers";
import type { MaterialPins } from "./material-pins.types";
import { withOutliers } from "./outliers.helpers";
import { planLocations, planMarkets } from "./plan.helpers";
import type { CraftingPlan } from "./plan.types";
import { QUALITY } from "./prices.constants";
import type { CraftingSettings } from "./settings.types";
import { fceFor } from "./specializations.helpers";
import type { SpecializationProfile } from "./specializations.types";
import { useMinute } from "./useMinute";
import {
  NO_QUALITY_PRICES,
  type QualityPrices,
  byQuality,
} from "./useQualityPrices";

// `prices` has each location's prices, in the plan's order, with the typed
// ones chosen where they win. While `updating`, a price the plan has only just
// needed is missing until it arrives. `failed` keeps the last prices that
// arrived on screen after a later request failed.
export type PlanState =
  | { status: "loading" }
  | { status: "error"; error: Error }
  | {
      status: "ready";
      result: PlanResult;
      prices: UsedPrices[];
      updating: boolean;
      failed: boolean;
    };

// Each market's prices, their 7-day history to judge outliers by, and when
// quality-weighted, qualities 2 to 5 of what the plan sells there.
interface MarketAnswer {
  prices: readonly ItemPrices[];
  history: readonly HistorySummary[];
  qualities: QualityPrices;
}

type Fetched =
  | { status: "error"; error: Error }
  | {
      status: "ready";
      byMarket: ReadonlyMap<string, MarketAnswer>;
      failed: boolean;
    };

const NO_ANSWER: MarketAnswer = {
  prices: [],
  history: [],
  qualities: NO_QUALITY_PRICES,
};

function byItem(prices: readonly UsedItemPrices[]) {
  return new Map(prices.map((price) => [price.itemId, price]));
}

// Asks each market once for every item the plan needs there. Editing a
// quantity needs no new request.
function usePlanPrices(
  marketData: MarketData,
  plan: CraftingPlan,
  pins: MaterialPins,
  { server, staleAfterHours, journals, qualityWeighted }: CraftingSettings,
): { fetched: Fetched; current: boolean } | undefined {
  const neededKey = useMemo(
    () => JSON.stringify([...planMarkets(plan, pins, { journals })]),
    [plan, pins, journals],
  );
  const soldKey = useMemo(
    () =>
      JSON.stringify(
        qualityWeighted
          ? plan.locations.map(({ route, entries }) => [
              route.sellMarketId,
              entries.map(({ itemId }) => itemId),
            ])
          : [],
      ),
    [plan, qualityWeighted],
  );
  const [fetched, setFetched] = useState<{ key: string; fetched: Fetched }>();
  const key = `${server} ${String(staleAfterHours)} ${neededKey} ${soldKey}`;

  useEffect(() => {
    let active = true;
    const needed = JSON.parse(neededKey) as [string, string[]][];
    const sold = new Map<string, Set<string>>();
    for (const [marketId, itemIds] of JSON.parse(soldKey) as [
      string,
      string[],
    ][]) {
      sold.set(marketId, new Set([...(sold.get(marketId) ?? []), ...itemIds]));
    }
    Promise.all(
      needed.map(async ([marketId, itemIds]) => {
        const soldHere = [...(sold.get(marketId) ?? [])];
        // Without history, prices are only not judged as outliers, and without
        // the higher qualities, they take the Normal price.
        const [{ prices }, history, qualities] = await Promise.all([
          marketData.getPrices(itemIds, [marketId], [QUALITY], {
            region: server,
            staleAfterMinutes: staleAfterHours * 60,
          }),
          marketData
            .getHistory(itemIds, [marketId], [QUALITY], { region: server })
            .then(
              (result) => result.history,
              () => [],
            ),
          soldHere.length === 0
            ? NO_QUALITY_PRICES
            : marketData
                .getPrices(soldHere, [marketId], HIGHER_QUALITIES, {
                  region: server,
                  staleAfterMinutes: staleAfterHours * 60,
                })
                .then(
                  (result) => byQuality(result.prices),
                  () => NO_QUALITY_PRICES,
                ),
        ]);
        return [marketId, { prices, history, qualities }] as const;
      }),
    ).then(
      (entries) => {
        if (active) {
          setFetched({
            key,
            fetched: {
              status: "ready",
              byMarket: new Map(entries),
              failed: false,
            },
          });
        }
      },
      (error: unknown) => {
        if (active) {
          setFetched((last) => ({
            key,
            fetched:
              last?.fetched.status === "ready"
                ? { ...last.fetched, failed: true }
                : {
                    status: "error",
                    error:
                      error instanceof Error ? error : new Error(String(error)),
                  },
          }));
        }
      },
    );
    return () => {
      active = false;
    };
  }, [marketData, key, neededKey, soldKey, server, staleAfterHours]);

  // The last prices stay on screen while new ones come in.
  return fetched && { fetched: fetched.fetched, current: fetched.key === key };
}

export function usePlan(
  marketData: MarketData,
  plan: CraftingPlan,
  settings: CraftingSettings,
  manualPrices: readonly ManualPrice[],
  specializations: SpecializationProfile,
  pins: MaterialPins,
): PlanState {
  const answer = usePlanPrices(marketData, plan, pins, settings);
  const now = useMinute();
  return useMemo((): PlanState => {
    if (answer === undefined) {
      return { status: "loading" };
    }
    const { fetched, current } = answer;
    if (fetched.status === "error") {
      return fetched;
    }
    const prices = plan.locations.map(({ route }) => {
      // Each market's answer has every item the plan buys there, so only the
      // ones this location buys there are kept.
      const bought = <Row extends { itemId: string }>(
        rows: (answer: MarketAnswer) => readonly Row[],
      ) =>
        [...fetched.byMarket].flatMap(([marketId, answer]) =>
          rows(answer).filter(
            ({ itemId }) =>
              materialMarketId({ ...route, pins }, itemId) === marketId,
          ),
        );
      const sell = fetched.byMarket.get(route.sellMarketId) ?? NO_ANSWER;
      const chosen = withManualPrices(
        { materials: bought(({ prices }) => prices), products: sell.prices },
        manualPrices,
        {
          region: settings.server,
          buyMarketId: route.buyMarketId,
          materialMarkets: route.materialMarkets,
          pins,
          sellMarketId: route.sellMarketId,
          quality: QUALITY,
          staleAfterMinutes: settings.staleAfterHours * 60,
          manualStaleAfterMinutes: settings.manualStaleAfterDays * 24 * 60,
          preferManual: settings.preferManualPrices,
        },
        now,
      );
      return withOutliers(
        chosen,
        { materials: bought(({ history }) => history), products: sell.history },
        {
          ratio: settings.outlierRatio,
          useAverage: settings.useAverageForOutliers,
        },
      );
    });
    const result = evaluatePlan(
      planLocations(plan, (route, index) => ({
        materials: byItem(prices[index]?.materials ?? []),
        products: byItem(prices[index]?.products ?? []),
        productQualities: (
          fetched.byMarket.get(route.sellMarketId) ?? NO_ANSWER
        ).qualities,
      })),
      { ...settings, fce: fceFor(specializations) },
    );
    return {
      status: "ready",
      result,
      prices,
      updating: !current,
      failed: fetched.failed,
    };
  }, [answer, plan, settings, manualPrices, specializations, pins, now]);
}
