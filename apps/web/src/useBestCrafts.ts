import { startTransition, useEffect, useMemo, useRef, useState } from "react";

import { type CraftingPlace, pricesNeeded, type PricesNeeded } from "@aoc/core";
import { recipes } from "@aoc/crafting-data";
import type {
  BatchFailure,
  MarketData,
  PartialPrices,
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
import { missingPrices } from "./missing-prices.helpers";
import type { MissingPrice } from "./missing-prices.types";
import { QUALITY } from "./prices.constants";
import { settingsForRoute } from "./route.helpers";
import type { Route } from "./route.types";
import type { CraftingSettings } from "./settings.types";
import { NO_SPECIALIZATIONS } from "./specializations.constants";
import { fceFor } from "./specializations.helpers";
import type { SpecializationProfile } from "./specializations.types";

// How far a fetch has got, in batches, and until when it waits for the rate
// limit, if it does.
export interface FetchProgress {
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
  failures: BatchFailure[];
  batches: number;
  fetchedAt: number | undefined;
}

type Fetched = { status: "error"; error: Error } | ReadyPrices;

// `done` is false while batches are still arriving.
interface Answer {
  buyMarketId: string;
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

type Side = "materials" | "products";

const QUALITIES = [QUALITY];

const UPDATE_EVERY_MS = 1000;

const NO_PRICES: CraftPrices = { materials: [], products: [] };

function oldest(...times: (number | undefined)[]): number | undefined {
  const known = times.filter((time) => time !== undefined);
  return known.length === 0 ? undefined : Math.min(...known);
}

function readyPrices(
  materials: PartialPrices,
  products: PartialPrices,
): ReadyPrices {
  return {
    status: "ready",
    prices: { materials: materials.prices, products: products.prices },
    failures: [],
    batches: 0,
    fetchedAt: oldest(materials.fetchedAt, products.fetchedAt),
  };
}

// Reads a side's prices once, until newer ones arrive.
function readOnce(read: () => PartialPrices): () => PartialPrices {
  let prices: PartialPrices | undefined;
  return () => (prices ??= read());
}

// `onPartial` is called as prices arrive, once both sides have some, and
// `read` gets the prices known so far.
async function fetchPrices(
  marketData: MarketData,
  needed: PricesNeeded,
  buyMarketId: string,
  sellMarketId: string,
  options: PricesOptions,
  onPartial: (read: () => ReadyPrices) => void,
  onProgress: (done: number, total: number) => void,
): Promise<Fetched> {
  const known: Partial<Record<Side, () => PartialPrices>> = {};
  const counts: Record<Side, { done: number; total: number }> = {
    materials: { done: 0, total: 0 },
    products: { done: 0, total: 0 },
  };
  const ask = async (
    side: Side,
    itemIds: readonly string[],
    marketId: string,
  ) => {
    const result = await marketData.getPrices(itemIds, [marketId], QUALITIES, {
      ...options,
      onEvent: (event) => {
        options.onEvent?.(event);
        if (event.type === "progress") {
          counts[side] = { done: event.done, total: event.total };
          onProgress(
            counts.materials.done + counts.products.done,
            counts.materials.total + counts.products.total,
          );
        }
      },
      onPartial: (read) => {
        known[side] = readOnce(read);
        const { materials, products } = known;
        if (materials && products) {
          onPartial(() => readyPrices(materials(), products()));
        }
      },
    });
    known[side] = () => result;
    return result;
  };
  try {
    const [materials, products] = await Promise.all([
      ask("materials", needed.materials, buyMarketId),
      ask("products", needed.products, sellMarketId),
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
      ...readyPrices(materials, products),
      failures,
      batches: counts.materials.total + counts.products.total,
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
  specializations: SpecializationProfile = NO_SPECIALIZATIONS,
): BestCraftsResult {
  const { place, buyMarketId, sellMarketId } = route;
  const { server, staleAfterHours, manualStaleAfterDays, preferManualPrices } =
    settings;
  const [{ attempt, force }, setRequest] = useState({
    attempt: 0,
    force: false,
  });
  const [answer, setAnswer] = useState<Answer>();
  const [progress, setProgress] = useState<Progress>();
  const cancelRef = useRef<() => void>(undefined);
  const selected = useSelectedRecipes(filters, place);
  const needed = useMemo(() => pricesNeeded(selected), [selected]);

  // An earlier attempt's answer stays on screen while the next one comes in.
  const current =
    answer?.buyMarketId === buyMarketId &&
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
    current?.attempt === attempt &&
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
      buyMarketId,
      sellMarketId,
      {
        region: server,
        staleAfterMinutes: staleAfterHours * 60,
        force,
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
        // Stopping a fetch on purpose isn't a failure.
        answerWith(
          cancelled && fetched.status === "ready"
            ? { ...fetched, failures: [] }
            : fetched,
          true,
        );
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
    sellMarketId,
    server,
    staleAfterHours,
    attempt,
    force,
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
        manualStaleAfterMinutes: manualStaleAfterDays * 24 * 60,
        preferManual: preferManualPrices,
      }),
    [
      fetchedPrices,
      manualPrices,
      server,
      buyMarketId,
      sellMarketId,
      manualStaleAfterDays,
      preferManualPrices,
    ],
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
        : evaluateCrafts(priced, place, routeSettings, prices),
    [priced, place, routeSettings, prices],
  );
  const crafts = useMemo(
    () => evaluated.filter(craftFilter(filters)),
    [evaluated, filters],
  );
  const missing = useMemo(
    () =>
      missingPrices(evaluated, {
        region: server,
        buyMarketId,
        sellMarketId,
        quality: QUALITY,
      }),
    [evaluated, server, buyMarketId, sellMarketId],
  );

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
      setRequest(({ attempt: last }) => ({ attempt: last + 1, force: true }));
    },
    retry: () => {
      setRequest(({ attempt: last }) => ({ attempt: last + 1, force: false }));
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
      allCrafts: evaluated,
      missingPrices: missing,
    };
  }
  if (current?.fetched.status === "ready" && priced.length > 0) {
    return {
      ...actions,
      status: "ready",
      crafts,
      allCrafts: evaluated,
      missingPrices: missing,
      failures: current.fetched.failures,
      batches: current.fetched.batches,
      fetchedAt: current.fetched.fetchedAt,
      updating: !covered,
    };
  }
  return { ...actions, status: "loading" };
}
