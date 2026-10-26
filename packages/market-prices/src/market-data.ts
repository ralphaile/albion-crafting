import { type BatchFailure, createAodpClient, type Region } from "./aodp.js";
import { openCacheStore } from "./cache-store.js";
import {
  type HistorySummary,
  summarizeHistory,
  type SummarizeOptions,
} from "./history.js";
import {
  type CachedFetchOptions,
  createHistoryCache,
  createPriceCache,
} from "./price-cache.js";
import { type ItemPrices, normalizePrices } from "./prices.js";

export interface MarketDataOptions {
  region?: Region;
}

export type HistoryOptions = CachedFetchOptions & SummarizeOptions;

export interface PricesResult {
  prices: ItemPrices[];
  failures: BatchFailure[];
  fetchedAt: number | undefined;
}

export interface HistoryResult {
  history: HistorySummary[];
  failures: BatchFailure[];
  fetchedAt: number | undefined;
}

export interface MarketData {
  readonly persistent: boolean;
  getPrices(
    itemIds: readonly string[],
    marketIds: readonly string[],
    qualities: readonly number[],
    options?: CachedFetchOptions,
  ): Promise<PricesResult>;
  getHistory(
    itemIds: readonly string[],
    marketIds: readonly string[],
    qualities: readonly number[],
    options?: HistoryOptions,
  ): Promise<HistoryResult>;
  clear(): Promise<void>;
}

export async function openMarketData({
  region = "west",
}: MarketDataOptions = {}): Promise<MarketData> {
  const store = await openCacheStore();
  // One client, so that prices and history share its rate limiter.
  const client = createAodpClient({ region });
  const prices = createPriceCache({ client, store });
  const history = createHistoryCache({ client, store });

  return {
    persistent: store.persistent,
    async getPrices(itemIds, marketIds, qualities, options) {
      const result = await prices.getPrices(
        itemIds,
        marketIds,
        qualities,
        options,
      );
      return { ...result, prices: normalizePrices(result.prices) };
    },
    async getHistory(itemIds, marketIds, qualities, options) {
      const result = await history.getHistory(
        itemIds,
        marketIds,
        qualities,
        options,
      );
      return { ...result, history: summarizeHistory(result.history, options) };
    },
    clear: () => store.clear(),
  };
}
