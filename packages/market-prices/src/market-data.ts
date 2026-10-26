import {
  type BatchFailure,
  createAodpClient,
  NO_DATA_DATE,
  type Region,
} from "./aodp.js";
import { openCacheStore } from "./cache-store.js";
import { type CachedFetchOptions, cachedRows } from "./cached-rows.js";
import {
  type HistorySummary,
  summarizeHistory,
  type SummarizeOptions,
} from "./history.js";
import { type ItemPrices, normalizePrices } from "./prices.js";

export interface MarketDataOptions {
  region?: Region;
}

export type PricesOptions = CachedFetchOptions;

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
    options?: PricesOptions,
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

  const cachedPrices = cachedRows({
    region,
    rows: store.prices,
    ttlMinutes: 15,
    fetch: async (itemIds, marketIds, qualities, options) => {
      const { prices, failures } = await client.getPrices(
        itemIds,
        marketIds,
        qualities,
        options,
      );
      return { rows: prices, failures };
    },
    marketIdOf: (row) => row.city,
    empty: (itemId, marketId, quality) => ({
      item_id: itemId,
      city: marketId,
      quality,
      sell_price_min: 0,
      sell_price_min_date: NO_DATA_DATE,
      sell_price_max: 0,
      sell_price_max_date: NO_DATA_DATE,
      buy_price_min: 0,
      buy_price_min_date: NO_DATA_DATE,
      buy_price_max: 0,
      buy_price_max_date: NO_DATA_DATE,
    }),
  });

  const cachedHistory = cachedRows({
    region,
    rows: store.history,
    ttlMinutes: 6 * 60,
    fetch: async (itemIds, marketIds, qualities, options) => {
      const { history, failures } = await client.getHistory(
        itemIds,
        marketIds,
        qualities,
        options,
      );
      return { rows: history, failures };
    },
    marketIdOf: (row) => row.location,
    empty: (itemId, marketId, quality) => ({
      location: marketId,
      item_id: itemId,
      quality,
      data: [],
    }),
  });

  return {
    persistent: store.persistent,
    async getPrices(itemIds, marketIds, qualities, options) {
      const { rows, failures, fetchedAt } = await cachedPrices(
        itemIds,
        marketIds,
        qualities,
        options,
      );
      return { prices: normalizePrices(rows), failures, fetchedAt };
    },
    async getHistory(itemIds, marketIds, qualities, options) {
      const { rows, failures, fetchedAt } = await cachedHistory(
        itemIds,
        marketIds,
        qualities,
        options,
      );
      return { history: summarizeHistory(rows, options), failures, fetchedAt };
    },
    clear: () => store.clear(),
  };
}
