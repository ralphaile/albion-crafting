import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ItemPrices, MarketData, PricesResult } from "@aoc/market-prices";

import { useQualityPrices } from "./useQualityPrices";
import { fakeMarketData } from "../test/fake-market-data";

const ITEMS = ["T4_MAIN_SWORD"];

function good(value: number): PricesResult {
  const price = { status: "fresh", value, observedAt: 0, ageMinutes: 30 };
  return {
    prices: [
      {
        itemId: "T4_MAIN_SWORD",
        marketId: "Caerleon",
        quality: 2,
        sellMin: price,
        buyMax: price,
      } as ItemPrices,
    ],
    failures: [],
    fetchedAt: 0,
  };
}

function render(marketData: ReturnType<typeof fakeMarketData>) {
  return renderHook(
    ({ attempt, sellMarketId }) =>
      useQualityPrices(marketData, ITEMS, sellMarketId, {
        enabled: true,
        region: "west",
        staleAfterHours: 12,
        attempt,
        force: attempt > 0,
      }),
    { initialProps: { attempt: 0, sellMarketId: "Caerleon" } },
  );
}

describe("useQualityPrices", () => {
  it("keeps the last answer while a refresh is on its way", async () => {
    let answer: (result: PricesResult) => void = () => undefined;
    const marketData = fakeMarketData({
      getPrices: vi
        .fn<MarketData["getPrices"]>()
        .mockResolvedValueOnce(good(5000))
        .mockReturnValueOnce(
          new Promise((resolve) => {
            answer = resolve;
          }),
        ),
    });
    const { result, rerender } = render(marketData);
    await waitFor(() => {
      expect(result.current.get("T4_MAIN_SWORD")?.get(2)).toBeDefined();
    });

    rerender({ attempt: 1, sellMarketId: "Caerleon" });

    expect(result.current.get("T4_MAIN_SWORD")?.get(2)).toMatchObject({
      sellMin: { value: 5000 },
    });
    answer(good(6000));
    await waitFor(() => {
      expect(result.current.get("T4_MAIN_SWORD")?.get(2)).toMatchObject({
        sellMin: { value: 6000 },
      });
    });
  });

  it("has none for another market until it answers", async () => {
    const marketData = fakeMarketData({
      getPrices: vi
        .fn<MarketData["getPrices"]>()
        .mockResolvedValueOnce(good(5000))
        .mockReturnValueOnce(new Promise(() => undefined)),
    });
    const { result, rerender } = render(marketData);
    await waitFor(() => {
      expect(result.current.size).toBe(1);
    });

    rerender({ attempt: 0, sellMarketId: "Lymhurst" });

    expect(result.current.size).toBe(0);
  });
});
