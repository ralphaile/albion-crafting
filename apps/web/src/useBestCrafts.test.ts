import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type {
  ItemPrices,
  MarketData,
  PricesOptions,
  PricesResult,
} from "@aoc/market-prices";

import { NO_FILTERS } from "./filters.constants";
import type { Filters } from "./filters.types";
import type { ManualPrice } from "./manual-prices.types";
import { DEFAULT_ROUTE } from "./route.constants";
import type { Route } from "./route.types";
import { DEFAULT_SETTINGS } from "./settings.constants";
import { useBestCrafts } from "./useBestCrafts";
import { fakeMarketData } from "../test/fake-market-data";

const route: Route = {
  place: DEFAULT_ROUTE.place,
  buyMarketId: "Martlock",
  sellMarketId: "Caerleon",
};

const NO_MANUAL_PRICES: readonly ManualPrice[] = [];

const swords = { ...NO_FILTERS, categories: ["sword"] };

function priced(itemId: string, marketId: string, value: number): ItemPrices {
  const price = { status: "fresh", value, observedAt: 0, ageMinutes: 30 };
  return {
    itemId,
    marketId,
    quality: 1,
    sellMin: price,
    buyMax: price,
  } as ItemPrices;
}

function pricesAt(marketIds: readonly string[], fetchedAt: number) {
  return {
    prices:
      marketIds[0] === "Martlock"
        ? [
            priced("T4_METALBAR", "Martlock", 100),
            priced("T4_LEATHER", "Martlock", 50),
          ]
        : [priced("T4_MAIN_SWORD", "Caerleon", 5000)],
    fetchedAt,
  };
}

// Each call stays open until `finish`, and hands its options to the test.
function heldPrices() {
  const calls: { options: PricesOptions; finish: () => void }[] = [];
  const getPrices = vi.fn<MarketData["getPrices"]>(
    (_itemIds, marketIds, _qualities, options = {}) =>
      new Promise<PricesResult>((resolve) => {
        calls.push({
          options,
          finish: () => {
            resolve({ ...pricesAt(marketIds, 2000), failures: [] });
          },
        });
        options.onPartial?.(() => pricesAt(marketIds, 1000));
      }),
  );
  return { calls, getPrices };
}

function renderBestCrafts(
  getPrices: MarketData["getPrices"],
  getHistory?: MarketData["getHistory"],
) {
  const marketData = fakeMarketData({
    getPrices,
    ...(getHistory && { getHistory }),
  });
  return renderHook(() =>
    useBestCrafts(
      marketData,
      route,
      DEFAULT_SETTINGS,
      swords,
      NO_MANUAL_PRICES,
    ),
  );
}

describe("useBestCrafts", () => {
  it("ranks the prices known so far while the rest arrive", async () => {
    const { calls, getPrices } = heldPrices();
    const { result } = renderBestCrafts(getPrices);

    await waitFor(() => {
      expect(result.current).toMatchObject({
        status: "ready",
        updating: true,
        fetchedAt: 1000,
      });
    });

    act(() => {
      for (const { finish } of calls) {
        finish();
      }
    });

    await waitFor(() => {
      expect(result.current).toMatchObject({
        status: "ready",
        updating: false,
        fetchedAt: 2000,
        progress: undefined,
      });
    });
  });

  it("gives each craft how many sell a day in the sell market, and doesn't force history on a refresh", async () => {
    const getPrices = vi.fn<MarketData["getPrices"]>((_itemIds, marketIds) =>
      Promise.resolve({ ...pricesAt(marketIds, 0), failures: [] }),
    );
    const getHistory = vi.fn<MarketData["getHistory"]>(() =>
      Promise.resolve({
        history: [
          {
            itemId: "T4_MAIN_SWORD",
            marketId: "Caerleon",
            quality: 1,
            averagePrice: 5000,
            averageDailyVolume: 12,
            newestDay: 0,
          },
        ],
        failures: [],
        fetchedAt: 0,
      }),
    );
    const { result } = renderBestCrafts(getPrices, getHistory);

    await waitFor(() => {
      expect(result.current).toMatchObject({ updating: false });
    });
    act(() => {
      result.current.refresh();
    });
    await waitFor(() => {
      expect(getHistory).toHaveBeenCalledTimes(2);
    });

    const crafts =
      result.current.status === "ready" ? result.current.allCrafts : [];
    expect(
      crafts.find(({ itemId }) => itemId === "T4_MAIN_SWORD")?.dailyVolume,
    ).toBe(12);
    expect(
      crafts.find(({ itemId }) => itemId === "T5_MAIN_SWORD")?.dailyVolume,
    ).toBe("unknown");
    const [itemIds, marketIds] = getHistory.mock.calls[0] ?? [];
    expect(itemIds).toContain("T4_MAIN_SWORD");
    expect(itemIds).not.toContain("T4_METALBAR");
    expect(marketIds).toEqual(["Caerleon"]);
    expect(getHistory.mock.calls.map(([, , , options]) => options)).toEqual([
      expect.not.objectContaining({ force: true }),
      expect.not.objectContaining({ force: true }),
    ]);
  });

  it("adds up the batches of prices and history, and says until when it waits for the rate limit", async () => {
    vi.spyOn(Date, "now").mockReturnValue(10_000);
    const { calls, getPrices } = heldPrices();
    const getHistory = vi.fn<MarketData["getHistory"]>(
      () => new Promise(() => undefined),
    );
    const { result } = renderBestCrafts(getPrices, getHistory);
    await waitFor(() => {
      expect(calls).toHaveLength(2);
    });

    const historyOptions = getHistory.mock.calls[0]?.[3];

    act(() => {
      calls[0]?.options.onEvent?.({ type: "progress", done: 1, total: 3 });
      calls[1]?.options.onEvent?.({ type: "progress", done: 2, total: 4 });
      historyOptions?.onEvent?.({ type: "progress", done: 1, total: 2 });
      calls[1]?.options.onEvent?.({ type: "waiting", seconds: 18 });
    });

    await waitFor(() => {
      expect(result.current.progress).toEqual({
        done: 4,
        total: 9,
        waitingUntil: 28_000,
      });
    });
    vi.restoreAllMocks();
  });

  it("fetches every price again when refreshed, and only what's missing when retried", async () => {
    const getPrices = vi.fn<MarketData["getPrices"]>((_itemIds, marketIds) =>
      Promise.resolve({ ...pricesAt(marketIds, 0), failures: [] }),
    );
    const { result } = renderBestCrafts(getPrices);
    await waitFor(() => {
      expect(result.current).toMatchObject({ updating: false });
    });

    act(() => {
      result.current.refresh();
    });
    await waitFor(() => {
      expect(getPrices).toHaveBeenCalledTimes(4);
    });
    act(() => {
      result.current.retry();
    });
    await waitFor(() => {
      expect(getPrices).toHaveBeenCalledTimes(6);
    });

    expect(
      getPrices.mock.calls.map(([, , , options]) => options?.force),
    ).toEqual([false, false, true, true, false, false]);
  });

  it("retries a failed history batch for its history only, not its prices", async () => {
    const getPrices = vi.fn<MarketData["getPrices"]>((_itemIds, marketIds) =>
      Promise.resolve({ ...pricesAt(marketIds, 0), failures: [] }),
    );
    const getHistory = vi
      .fn<MarketData["getHistory"]>(() =>
        Promise.resolve({ history: [], failures: [], fetchedAt: 0 }),
      )
      .mockImplementationOnce((itemIds) =>
        Promise.resolve({
          history: [],
          failures: [{ itemIds: [...itemIds], error: new Error("AODP: 503") }],
          fetchedAt: undefined,
        }),
      );
    const { result } = renderBestCrafts(getPrices, getHistory);
    await waitFor(() => {
      expect(result.current).toMatchObject({ updating: false });
    });

    act(() => {
      result.current.retry();
    });
    await waitFor(() => {
      expect(getHistory).toHaveBeenCalledTimes(2);
    });

    expect(getHistory.mock.calls[1]?.[3]?.refetch).toEqual(
      getHistory.mock.calls[0]?.[0],
    );
    expect(
      getPrices.mock.calls.slice(2).map(([, , , options]) => options?.refetch),
    ).toEqual([[], []]);
  });

  it("forces only the refresh's own fetch, not the next one for wider filters", async () => {
    const getPrices = vi.fn<MarketData["getPrices"]>((_itemIds, marketIds) =>
      Promise.resolve({ ...pricesAt(marketIds, 0), failures: [] }),
    );
    const marketData = fakeMarketData({ getPrices });
    const { result, rerender } = renderHook(
      (filters: Filters) =>
        useBestCrafts(
          marketData,
          route,
          DEFAULT_SETTINGS,
          filters,
          NO_MANUAL_PRICES,
        ),
      { initialProps: swords },
    );
    await waitFor(() => {
      expect(result.current).toMatchObject({ updating: false });
    });
    act(() => {
      result.current.refresh();
    });
    await waitFor(() => {
      expect(result.current).toMatchObject({ updating: false });
    });
    expect(getPrices).toHaveBeenCalledTimes(4);

    rerender({ ...NO_FILTERS, categories: ["sword", "axe"] });
    await waitFor(() => {
      expect(getPrices).toHaveBeenCalledTimes(6);
    });

    expect(
      getPrices.mock.calls.map(([, , , options]) => options?.force),
    ).toEqual([false, false, true, true, false, false]);
  });

  it("stops quietly when cancelled before any price came", async () => {
    const getPrices = vi.fn<MarketData["getPrices"]>(
      (itemIds, _marketIds, _qualities, options = {}) =>
        new Promise((resolve) => {
          options.signal?.addEventListener("abort", () => {
            resolve({
              prices: [],
              fetchedAt: undefined,
              failures: [
                { itemIds: [...itemIds], error: new Error("Aborted") },
              ],
            });
          });
        }),
    );
    const { result } = renderBestCrafts(getPrices);
    await waitFor(() => {
      expect(getPrices).toHaveBeenCalledTimes(2);
    });

    act(() => {
      result.current.cancel();
    });

    await waitFor(() => {
      expect(result.current).toMatchObject({
        status: "ready",
        failures: [],
        progress: undefined,
      });
    });
  });

  it("stops when cancelled, and keeps the prices it has without calling it a failure", async () => {
    const getPrices = vi.fn<MarketData["getPrices"]>(
      (itemIds, marketIds, _qualities, options = {}) =>
        new Promise((resolve) => {
          options.onPartial?.(() => pricesAt(marketIds, 1000));
          options.signal?.addEventListener("abort", () => {
            resolve({
              ...pricesAt(marketIds, 1000),
              failures: [
                { itemIds: [...itemIds], error: new Error("Aborted") },
              ],
            });
          });
        }),
    );
    const { result } = renderBestCrafts(getPrices);
    await waitFor(() => {
      expect(result.current).toMatchObject({ updating: true });
    });

    act(() => {
      result.current.cancel();
    });

    await waitFor(() => {
      expect(result.current).toMatchObject({
        status: "ready",
        updating: false,
        failures: [],
        progress: undefined,
      });
    });
    expect(getPrices.mock.calls[0]?.[3]?.signal?.aborted).toBe(true);
  });
});
