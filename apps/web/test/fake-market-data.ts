import { vi } from "vitest";

import type { MarketData, PricesResult } from "@aoc/market-prices";

export const noPrices: PricesResult = {
  prices: [],
  failures: [],
  fetchedAt: undefined,
};

export function fakeMarketData(overrides: Partial<MarketData> = {}) {
  return {
    persistent: true,
    getPrices: vi.fn<MarketData["getPrices"]>(() => Promise.resolve(noPrices)),
    getHistory: vi.fn<MarketData["getHistory"]>(() =>
      Promise.resolve({ history: [], failures: [], fetchedAt: undefined }),
    ),
    clear: vi.fn<MarketData["clear"]>(() => Promise.resolve()),
    ...overrides,
  };
}
