import {
  type AodpClient,
  type BatchFailure,
  type FetchOptions,
  NO_DATA_DATE,
  type Region,
} from "./aodp.js";
import type {
  CacheStore,
  RowKey,
  RowStore,
  StoredHistory,
  StoredPrice,
} from "./cache-store.js";

export interface CacheOptions {
  client: AodpClient;
  store: CacheStore;
  ttlMinutes?: number;
}

export interface CachedFetchOptions extends FetchOptions {
  force?: boolean;
}

export interface CachedPrices {
  prices: StoredPrice[];
  failures: BatchFailure[];
  fetchedAt: number | undefined;
}

export interface PriceCache {
  getPrices(
    itemIds: readonly string[],
    marketIds: readonly string[],
    qualities: readonly number[],
    options?: CachedFetchOptions,
  ): Promise<CachedPrices>;
}

export interface CachedHistory {
  history: StoredHistory[];
  failures: BatchFailure[];
  fetchedAt: number | undefined;
}

export interface HistoryCache {
  getHistory(
    itemIds: readonly string[],
    marketIds: readonly string[],
    qualities: readonly number[],
    options?: CachedFetchOptions,
  ): Promise<CachedHistory>;
}

const MINUTE_MS = 60_000;

export function createPriceCache({
  client,
  store,
  ttlMinutes = 15,
}: CacheOptions): PriceCache {
  const getRows = cachedRows({
    region: client.region,
    rows: store.prices,
    ttlMinutes,
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

  return {
    async getPrices(itemIds, marketIds, qualities, options) {
      const { rows, failures, fetchedAt } = await getRows(
        itemIds,
        marketIds,
        qualities,
        options,
      );
      return { prices: rows, failures, fetchedAt };
    },
  };
}

export function createHistoryCache({
  client,
  store,
  ttlMinutes = 6 * 60,
}: CacheOptions): HistoryCache {
  const getRows = cachedRows({
    region: client.region,
    rows: store.history,
    ttlMinutes,
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
    async getHistory(itemIds, marketIds, qualities, options) {
      const { rows, failures, fetchedAt } = await getRows(
        itemIds,
        marketIds,
        qualities,
        options,
      );
      return { history: rows, failures, fetchedAt };
    },
  };
}

interface Stamp {
  region: Region;
  fetchedAt: number;
}

interface CachedRowsOptions<T> {
  region: Region;
  rows: RowStore<T & Stamp>;
  ttlMinutes: number;
  fetch: (
    itemIds: readonly string[],
    marketIds: readonly string[],
    qualities: readonly number[],
    options: FetchOptions,
  ) => Promise<{ rows: T[]; failures: BatchFailure[] }>;
  marketIdOf: (row: T) => string;
  empty: (itemId: string, marketId: string, quality: number) => T;
}

// AODP matches market names in any case, so the cache does too.
function comboId(itemId: string, marketId: string, quality: number): string {
  return JSON.stringify([itemId, marketId.toLowerCase(), quality]);
}

function cachedRows<T extends { item_id: string; quality: number }>({
  region,
  rows: store,
  ttlMinutes,
  fetch,
  marketIdOf,
  empty,
}: CachedRowsOptions<T>) {
  return async (
    itemIds: readonly string[],
    marketIds: readonly string[],
    qualities: readonly number[],
    { force = false, ...options }: CachedFetchOptions = {},
  ) => {
    const now = Date.now();
    const items = [...new Set(itemIds)];
    const markets = [...new Set(marketIds)];
    const levels = [...new Set(qualities)];
    const cached = await store.get(
      items.flatMap((itemId) =>
        markets.flatMap((marketId) =>
          levels.map((quality): RowKey => [region, itemId, marketId, quality]),
        ),
      ),
    );

    const recentRows = new Map<string, number>();
    for (const row of cached) {
      if (now - row.fetchedAt < ttlMinutes * MINUTE_MS) {
        recentRows.set(row.item_id, (recentRows.get(row.item_id) ?? 0) + 1);
      }
    }
    // An item is reused only if every market and quality asked for is recent.
    const reusable = (itemId: string) =>
      !force && recentRows.get(itemId) === markets.length * levels.length;

    const toFetch = items.filter((itemId) => !reusable(itemId));
    const { rows, failures } =
      toFetch.length === 0
        ? { rows: [], failures: [] }
        : await fetch(toFetch, markets, levels, options);
    const failed = new Set(failures.flatMap((failure) => failure.itemIds));

    // AODP sends nothing for some of what it's asked, such as the history of an
    // item nobody bought. An empty row says so, until it's as old as any other.
    const answered = new Set(
      rows.map((row) => comboId(row.item_id, marketIdOf(row), row.quality)),
    );
    const empties = toFetch
      .filter((itemId) => !failed.has(itemId))
      .flatMap((itemId) =>
        markets.flatMap((marketId) =>
          levels
            .filter(
              (quality) => !answered.has(comboId(itemId, marketId, quality)),
            )
            .map((quality) => empty(itemId, marketId, quality)),
        ),
      );
    const fetched = [...rows, ...empties].map((row): T & Stamp => ({
      ...row,
      region,
      fetchedAt: now,
    }));
    await store.put(fetched);

    // Older rows of an item that failed to fetch beat no rows at all.
    const used = [
      ...cached.filter(
        (row) => reusable(row.item_id) || failed.has(row.item_id),
      ),
      ...fetched,
    ];
    return {
      rows: used,
      failures,
      fetchedAt: used.reduce<number | undefined>(
        (oldest, { fetchedAt }) =>
          oldest === undefined ? fetchedAt : Math.min(oldest, fetchedAt),
        undefined,
      ),
    };
  };
}
