import { startTransition, useEffect, useMemo, useRef, useState } from "react";

import { type CraftingPlace, pricesNeeded, type PricesNeeded } from "@aoc/core";
import { recipes, refiningRecipes } from "@aoc/crafting-data";
import type {
  AodpEvent,
  BatchFailure,
  HistorySummary,
  ItemPrices,
  MarketData,
  PartialHistory,
  PartialPrices,
  Region,
} from "@aoc/market-prices";

import { evaluateCrafts, withDailyVolumes } from "./best-crafts.helpers";
import type { Craft, CraftHistory, CraftPrices } from "./best-crafts.types";
import { NO_FILTERS } from "./filters.constants";
import { craftFilter, recipeFilter } from "./filters.helpers";
import type { Filters } from "./filters.types";
import { withManualPrices } from "./manual-prices.helpers";
import type { ManualPrice } from "./manual-prices.types";
import {
  byMaterialMarket,
  materialMarketId,
  sameBuyMarkets,
} from "./material-markets.helpers";
import { NO_PINS } from "./material-pins.constants";
import type { MaterialPins } from "./material-pins.types";
import { missingPrices } from "./missing-prices.helpers";
import type { MissingPrice } from "./missing-prices.types";
import { withOutliers } from "./outliers.helpers";
import { QUALITY } from "./prices.constants";
import { NO_RECIPE_CHOICES } from "./recipe-choices.constants";
import type { RecipeChoices } from "./recipe-choices.types";
import { settingsForRoute } from "./route.helpers";
import type { MarketChoice, Route } from "./route.types";
import type { CraftingSettings } from "./settings.types";
import { NO_SPECIALIZATIONS } from "./specializations.constants";
import { fceFor } from "./specializations.helpers";
import type { SpecializationProfile } from "./specializations.types";
import { useMinute } from "./useMinute";

// How far a fetch has got, in batches, and until when it waits for the rate
// limit, if it does.
interface FetchProgress {
  done: number;
  total: number;
  waitingUntil: number | undefined;
}

// `refresh` fetches every price again. `retry` fetches only what has no recent
// price, such as the batches that failed.
interface PriceActions {
  progress: FetchProgress | undefined;
  refresh: () => void;
  retry: () => void;
  cancel: () => void;
}

// `allCrafts` keeps the crafts the price filters hide. `fetchedAt` is when the
// oldest price was fetched, and `batches` how many the last fetch asked for.
export type BestCraftsResult = PriceActions &
  (
    | { status: "loading" }
    | {
        status: "error";
        error: Error;
        crafts: Craft[];
        allCrafts: Craft[];
        missingPrices: MissingPrice[];
      }
    | {
        status: "ready";
        crafts: Craft[];
        allCrafts: Craft[];
        missingPrices: MissingPrice[];
        failures: BatchFailure[];
        batches: number;
        fetchedAt: number | undefined;
        updating: boolean;
      }
  );

interface ReadyPrices {
  status: "ready";
  prices: CraftPrices;
  history: CraftHistory;
  failures: BatchFailure[];
  failed: Refetch;
  batches: number;
  fetchedAt: number | undefined;
}

type Fetched = { status: "error"; error: Error } | ReadyPrices;

// `done` is false while batches are still arriving.
interface Answer extends MarketChoice {
  sellMarketId: string;
  server: Region;
  staleAfterHours: number;
  attempt: number;
  products: ReadonlySet<string>;
  fetched: Fetched;
  done: boolean;
}

interface Progress extends FetchProgress {
  needed: PricesNeeded;
  attempt: number;
}

type Side = "materials" | "products" | "materialHistory" | "productHistory";

const SIDES: readonly Side[] = [
  "materials",
  "products",
  "materialHistory",
  "productHistory",
];

// The items to fetch again even when they're recent, kept apart for each
// request so a batch that failed in one doesn't refetch what came in another.
type Refetch = Record<Side, readonly string[]>;

interface FetchOptions {
  region: Region;
  staleAfterMinutes: number;
  force: boolean;
  refetch: Refetch;
  signal: AbortSignal;
  onEvent: (event: AodpEvent) => void;
}

const QUALITIES = [QUALITY];

const UPDATE_EVERY_MS = 1000;

const NO_PRICES: CraftPrices = { materials: [], products: [] };

const NO_ITEMS: readonly string[] = [];

const NO_SUMMARIES: readonly HistorySummary[] = [];

const NO_HISTORY: CraftHistory = {
  materials: NO_SUMMARIES,
  products: NO_SUMMARIES,
};

const NO_REFETCH: Refetch = {
  materials: NO_ITEMS,
  products: NO_ITEMS,
  materialHistory: NO_ITEMS,
  productHistory: NO_ITEMS,
};

function oldest(...times: (number | undefined)[]): number | undefined {
  const known = times.filter((time) => time !== undefined);
  return known.length === 0 ? undefined : Math.min(...known);
}

// The prices' `fetchedAt` leaves out the history, which is reused for longer.
function readyPrices(
  materials: PartialPrices,
  products: PartialPrices,
  history: CraftHistory,
  prices: CraftPrices = {
    materials: materials.prices,
    products: products.prices,
  },
): ReadyPrices {
  return {
    status: "ready",
    prices,
    history,
    failures: [],
    failed: NO_REFETCH,
    batches: 0,
    fetchedAt: oldest(materials.fetchedAt, products.fetchedAt),
  };
}

// Reads a side once, until newer rows arrive.
function readOnce<T>(read: () => T): () => T {
  let rows: T | undefined;
  return () => (rows ??= read());
}

// The answers so far of a side's requests, one for each market, as one.
// While no part changes, the same object comes back.
function joiner<Row>(): (
  parts: readonly { rows: Row[]; fetchedAt: number | undefined }[],
) => { rows: Row[]; fetchedAt: number | undefined } {
  let last:
    | {
        parts: Row[][];
        joined: { rows: Row[]; fetchedAt: number | undefined };
      }
    | undefined;
  return (parts) => {
    const [only] = parts;
    if (parts.length === 1 && only !== undefined) {
      return only;
    }
    if (
      last?.parts.length === parts.length &&
      parts.every(({ rows }, index) => last?.parts[index] === rows)
    ) {
      return last.joined;
    }
    const joined = {
      rows: parts.flatMap(({ rows }) => rows),
      fetchedAt: oldest(...parts.map(({ fetchedAt }) => fetchedAt)),
    };
    last = { parts: parts.map(({ rows }) => rows), joined };
    return joined;
  };
}

// Fetches each material's prices and history in the market it's bought in,
// and the products' in the sell market. `onPartial` is called as they arrive,
// once every request for prices has some, and `read` gets what's known so far.
async function fetchPrices(
  marketData: MarketData,
  needed: PricesNeeded,
  buyMarkets: MarketChoice,
  sellMarketId: string,
  { region, staleAfterMinutes, force, refetch, signal, onEvent }: FetchOptions,
  onPartial: (read: () => ReadyPrices) => void,
  onProgress: (done: number, total: number) => void,
): Promise<Fetched> {
  const materialGroups = [...byMaterialMarket(buyMarkets, needed.materials)];
  const productGroups = [[sellMarketId, needed.products] as const];
  const groups: Record<
    Side,
    readonly (readonly [string, readonly string[]])[]
  > = {
    materials: materialGroups,
    products: productGroups,
    materialHistory: materialGroups,
    productHistory: productGroups,
  };
  const known = Object.fromEntries(
    SIDES.map((side) => [side, groups[side].map(() => undefined)]),
  ) as {
    materials: ((() => PartialPrices) | undefined)[];
    products: ((() => PartialPrices) | undefined)[];
    materialHistory: ((() => PartialHistory) | undefined)[];
    productHistory: ((() => PartialHistory) | undefined)[];
  };
  const counts = Object.fromEntries(
    SIDES.map((side) => [
      side,
      groups[side].map(() => ({ done: 0, total: 0 })),
    ]),
  ) as Record<Side, { done: number; total: number }[]>;
  const sum = (count: "done" | "total") =>
    SIDES.flatMap((side) => counts[side]).reduce(
      (total, counted) => total + counted[count],
      0,
    );
  const report = (side: Side, index: number) => (event: AodpEvent) => {
    onEvent(event);
    if (event.type === "progress") {
      counts[side][index] = { done: event.done, total: event.total };
      onProgress(sum("done"), sum("total"));
    }
  };
  const joinPrices = {
    materials: joiner<ItemPrices>(),
    products: joiner<ItemPrices>(),
  };
  const joinHistory = {
    materialHistory: joiner<HistorySummary>(),
    productHistory: joiner<HistorySummary>(),
  };
  const pricesSoFar = (
    side: "materials" | "products",
  ): PartialPrices | undefined => {
    const parts = known[side].map((read) => read?.());
    if (!parts.every((part) => part !== undefined)) {
      return undefined;
    }
    const { rows, fetchedAt } = joinPrices[side](
      parts.map(({ prices, fetchedAt: at }) => ({
        rows: prices,
        fetchedAt: at,
      })),
    );
    return { prices: rows, fetchedAt };
  };
  const historySoFar = (side: "materialHistory" | "productHistory") =>
    joinHistory[side](
      known[side].flatMap((read) => {
        const part = read?.();
        return part === undefined
          ? []
          : [{ rows: part.history, fetchedAt: part.fetchedAt }];
      }),
    ).rows;
  // While only the history changes, the prices stay the same object, so the
  // crafts aren't worked out again.
  let shownPrices: CraftPrices | undefined;
  const pricesOf = (materials: PartialPrices, products: PartialPrices) =>
    shownPrices?.materials === materials.prices &&
    shownPrices.products === products.prices
      ? shownPrices
      : (shownPrices = {
          materials: materials.prices,
          products: products.prices,
        });
  const showKnown = () => {
    if (
      known.materials.every((read) => read !== undefined) &&
      known.products.every((read) => read !== undefined)
    ) {
      onPartial(() => {
        const materials = pricesSoFar("materials");
        const products = pricesSoFar("products");
        if (materials === undefined || products === undefined) {
          throw new Error("A side's prices went missing");
        }
        return readyPrices(
          materials,
          products,
          {
            materials: historySoFar("materialHistory"),
            products: historySoFar("productHistory"),
          },
          pricesOf(materials, products),
        );
      });
    }
  };
  const ask = (side: "materials" | "products") =>
    Promise.all(
      groups[side].map(async ([marketId, itemIds], index) => {
        const result = await marketData.getPrices(
          itemIds,
          [marketId],
          QUALITIES,
          {
            region,
            staleAfterMinutes,
            force,
            refetch: refetch[side],
            signal,
            onEvent: report(side, index),
            onPartial: (read) => {
              known[side][index] = readOnce(read);
              showKnown();
            },
          },
        );
        known[side][index] = () => result;
        return result;
      }),
    );
  // History is reused for hours, so Refresh prices doesn't force it.
  const askHistory = (side: "materialHistory" | "productHistory") =>
    Promise.all(
      groups[side].map(async ([marketId, itemIds], index) => {
        const result = await marketData.getHistory(
          itemIds,
          [marketId],
          QUALITIES,
          {
            region,
            refetch: refetch[side],
            signal,
            onEvent: report(side, index),
            onPartial: (read) => {
              known[side][index] = readOnce(read);
              showKnown();
            },
          },
        );
        known[side][index] = () => result;
        return result;
      }),
    );
  try {
    const [materials, products, materialHistory, productHistory] =
      await Promise.all([
        ask("materials"),
        ask("products"),
        askHistory("materialHistory"),
        askHistory("productHistory"),
      ]);
    const failuresOf = (results: readonly { failures: BatchFailure[] }[]) =>
      results.flatMap(({ failures }) => failures);
    const failures = [
      ...failuresOf(materials),
      ...failuresOf(products),
      ...failuresOf(materialHistory),
      ...failuresOf(productHistory),
    ];
    const materialPrices = pricesSoFar("materials");
    const productPrices = pricesSoFar("products");
    if (materialPrices === undefined || productPrices === undefined) {
      throw new Error("A side's prices went missing");
    }
    const [firstFailure] = failures;
    if (
      firstFailure !== undefined &&
      materialPrices.prices.length + productPrices.prices.length === 0
    ) {
      return { status: "error", error: firstFailure.error };
    }
    const itemsOf = (results: readonly { failures: BatchFailure[] }[]) =>
      failuresOf(results).flatMap(({ itemIds }) => itemIds);
    return {
      ...readyPrices(materialPrices, productPrices, {
        materials: historySoFar("materialHistory"),
        products: historySoFar("productHistory"),
      }),
      failures,
      failed: {
        materials: itemsOf(materials),
        products: itemsOf(products),
        materialHistory: itemsOf(materialHistory),
        productHistory: itemsOf(productHistory),
      },
      batches: sum("total"),
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
  const { mode, tiers, enchants, categories, artifacts, specialtyOnly } =
    filters;
  const search = filters.search.trim();
  return useMemo(
    () =>
      (mode === "refining" ? refiningRecipes : recipes).filter(
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
    [
      mode,
      tiers,
      enchants,
      categories,
      artifacts,
      specialtyOnly,
      search,
      place,
    ],
  );
}

export function useBestCrafts(
  marketData: MarketData,
  route: Route,
  settings: CraftingSettings,
  filters: Filters,
  manualPrices: readonly ManualPrice[],
  specializations: SpecializationProfile = NO_SPECIALIZATIONS,
  recipeChoices: RecipeChoices = NO_RECIPE_CHOICES,
  pins: MaterialPins = NO_PINS,
): BestCraftsResult {
  const { place, buyMarketId, materialMarkets, sellMarketId } = route;
  const {
    server,
    staleAfterHours,
    manualStaleAfterDays,
    preferManualPrices,
    outlierRatio,
    useAverageForOutliers,
  } = settings;
  const [{ attempt, force, refetch }, setRequest] = useState<{
    attempt: number;
    force: boolean;
    refetch: Refetch;
  }>({ attempt: 0, force: false, refetch: NO_REFETCH });
  const [answer, setAnswer] = useState<Answer>();
  const [progress, setProgress] = useState<Progress>();
  const cancelRef = useRef<() => void>(undefined);
  const selected = useSelectedRecipes(filters, place);
  const needed = useMemo(() => pricesNeeded(selected), [selected]);

  // An earlier attempt's answer stays on screen while the next one comes in.
  // So does the last answer before a new pin, while its market is asked.
  const current =
    answer !== undefined &&
    sameBuyMarkets(answer, route) &&
    answer.sellMarketId === sellMarketId &&
    answer.server === server &&
    answer.staleAfterHours === staleAfterHours
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
  const covered =
    current?.pins === pins &&
    current.attempt === attempt &&
    current.done &&
    priced.length === selected.length;
  const needsFetch = selected.length > 0 && !covered;

  useEffect(() => {
    if (!needsFetch) {
      return;
    }
    let active = true;
    let cancelled = false;
    const controller = new AbortController();
    cancelRef.current = () => {
      cancelled = true;
      controller.abort();
    };
    // Until it's done, a craft shows only once its own price has arrived.
    const answerWith = (fetched: Fetched, done: boolean) => {
      setAnswer({
        buyMarketId,
        materialMarkets,
        pins,
        sellMarketId,
        server,
        staleAfterHours,
        attempt,
        products: new Set(
          done || fetched.status === "error"
            ? needed.products
            : fetched.prices.products.map(({ itemId }) => itemId),
        ),
        fetched,
        done,
      });
    };
    // Re-ranking every craft after each batch is slow on a slow device, so the
    // batches that arrive close together show together, after any input.
    let prices: (() => ReadyPrices) | undefined;
    let counts: FetchProgress = {
      done: 0,
      total: 0,
      waitingUntil: undefined,
    };
    let shownAt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const show = () => {
      clearTimeout(timer);
      timer = undefined;
      if (!active) {
        return;
      }
      shownAt = Date.now();
      const shown = { prices: prices?.(), counts };
      prices = undefined;
      startTransition(() => {
        if (shown.prices !== undefined) {
          answerWith(shown.prices, false);
        }
        setProgress({ ...shown.counts, needed, attempt });
      });
    };
    const showSoon = () => {
      timer ??= setTimeout(
        show,
        Math.max(0, shownAt + UPDATE_EVERY_MS - Date.now()),
      );
    };
    void fetchPrices(
      marketData,
      needed,
      { buyMarketId, materialMarkets, pins },
      sellMarketId,
      {
        region: server,
        staleAfterMinutes: staleAfterHours * 60,
        force,
        refetch,
        signal: controller.signal,
        onEvent: (event) => {
          // A wait shows at once, so its countdown starts on time.
          if (event.type === "waiting") {
            counts = {
              ...counts,
              waitingUntil: Date.now() + event.seconds * 1000,
            };
            show();
          }
        },
      },
      (partial) => {
        prices = partial;
        showSoon();
      },
      (done, total) => {
        counts = { ...counts, done, total };
        showSoon();
      },
    ).then((fetched) => {
      clearTimeout(timer);
      if (active) {
        // Stopping a fetch on purpose isn't a failure, even before any price came.
        answerWith(
          !cancelled
            ? fetched
            : fetched.status === "ready"
              ? { ...fetched, failures: [], failed: NO_REFETCH }
              : {
                  status: "ready",
                  prices: NO_PRICES,
                  history: NO_HISTORY,
                  failures: [],
                  failed: NO_REFETCH,
                  batches: 0,
                  fetchedAt: undefined,
                },
          true,
        );
        // A refresh or retry forces only its own fetch, not the next filter
        // or route's.
        if (force || refetch !== NO_REFETCH) {
          setRequest((last) =>
            last.attempt === attempt
              ? { attempt, force: false, refetch: NO_REFETCH }
              : last,
          );
        }
      }
    });
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    needsFetch,
    marketData,
    needed,
    buyMarketId,
    materialMarkets,
    pins,
    sellMarketId,
    server,
    staleAfterHours,
    attempt,
    force,
    refetch,
  ]);

  // When AODP gives nothing at all, the manual prices still price what they
  // can, and every other price is missing.
  const answered =
    current?.fetched.status === "ready"
      ? current.fetched.prices
      : current?.fetched.status === "error"
        ? NO_PRICES
        : undefined;
  const answeredHistory =
    current?.fetched.status === "ready" ? current.fetched.history : NO_HISTORY;
  // Each material only by its price in its own market, so one just pinned
  // elsewhere is missing until that market answers.
  const marketChoice = useMemo(
    () => ({ buyMarketId, materialMarkets, pins }),
    [buyMarketId, materialMarkets, pins],
  );
  const { fetchedPrices, history } = useMemo(() => {
    const ownMarket = ({
      itemId,
      marketId,
    }: {
      itemId: string;
      marketId: string;
    }) => marketId === materialMarketId(marketChoice, itemId);
    return {
      fetchedPrices: answered && {
        ...answered,
        materials: answered.materials.filter(ownMarket),
      },
      history: {
        ...answeredHistory,
        materials: answeredHistory.materials.filter(ownMarket),
      },
    };
  }, [answered, answeredHistory, marketChoice]);
  const now = useMinute();
  const chosenPrices = useMemo(
    () =>
      fetchedPrices &&
      withManualPrices(
        fetchedPrices,
        manualPrices,
        {
          region: server,
          buyMarketId,
          materialMarkets,
          pins,
          sellMarketId,
          quality: QUALITY,
          staleAfterMinutes: staleAfterHours * 60,
          manualStaleAfterMinutes: manualStaleAfterDays * 24 * 60,
          preferManual: preferManualPrices,
        },
        now,
      ),
    [
      fetchedPrices,
      manualPrices,
      server,
      buyMarketId,
      materialMarkets,
      pins,
      sellMarketId,
      staleAfterHours,
      manualStaleAfterDays,
      preferManualPrices,
      now,
    ],
  );
  const prices = useMemo(
    () =>
      chosenPrices &&
      withOutliers(chosenPrices, history, {
        ratio: outlierRatio,
        useAverage: useAverageForOutliers,
      }),
    [chosenPrices, history, outlierRatio, useAverageForOutliers],
  );
  const routeSettings = useMemo(
    () => ({
      ...settingsForRoute(settings, route),
      fce: fceFor(specializations),
    }),
    [settings, route, specializations],
  );
  const evaluated = useMemo(
    () =>
      prices === undefined
        ? []
        : evaluateCrafts(priced, place, routeSettings, prices, recipeChoices),
    [priced, place, routeSettings, prices, recipeChoices],
  );
  const withVolumes = useMemo(
    () => withDailyVolumes(evaluated, history.products),
    [evaluated, history],
  );
  const crafts = useMemo(
    () => withVolumes.filter(craftFilter(filters)),
    [withVolumes, filters],
  );
  const missing = useMemo(
    () =>
      missingPrices(evaluated, {
        region: server,
        buyMarketId,
        materialMarkets,
        pins,
        sellMarketId,
        quality: QUALITY,
      }),
    [evaluated, server, buyMarketId, materialMarkets, pins, sellMarketId],
  );

  const failed =
    current?.fetched.status === "ready" ? current.fetched.failed : NO_REFETCH;
  const actions: PriceActions = {
    progress: !needsFetch
      ? undefined
      : progress?.needed === needed && progress.attempt === attempt
        ? {
            done: progress.done,
            total: progress.total,
            waitingUntil: progress.waitingUntil,
          }
        : { done: 0, total: 0, waitingUntil: undefined },
    refresh: () => {
      setRequest(({ attempt: last }) => ({
        attempt: last + 1,
        force: true,
        refetch: NO_REFETCH,
      }));
    },
    // The failed items may still have recent prices from before a refresh, so
    // they're named to be fetched again.
    retry: () => {
      setRequest(({ attempt: last }) => ({
        attempt: last + 1,
        force: false,
        refetch: failed,
      }));
    },
    cancel: () => {
      cancelRef.current?.();
    },
  };

  if (selected.length === 0) {
    return {
      ...actions,
      status: "ready",
      crafts: [],
      allCrafts: [],
      missingPrices: [],
      failures: [],
      batches: 0,
      fetchedAt: undefined,
      updating: false,
    };
  }
  if (current?.fetched.status === "error" && covered) {
    return {
      ...actions,
      status: "error",
      error: current.fetched.error,
      crafts,
      allCrafts: withVolumes,
      missingPrices: missing,
    };
  }
  if (current?.fetched.status === "ready" && priced.length > 0) {
    return {
      ...actions,
      status: "ready",
      crafts,
      allCrafts: withVolumes,
      missingPrices: missing,
      failures: current.fetched.failures,
      batches: current.fetched.batches,
      fetchedAt: current.fetched.fetchedAt,
      updating: !covered,
    };
  }
  return { ...actions, status: "loading" };
}
