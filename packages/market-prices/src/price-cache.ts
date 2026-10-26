import type {
  AodpClient,
  BatchFailure,
  GetPricesOptions,
  Region,
} from "./aodp.js";
import type {
  PriceKey,
  PriceStore,
  RowStore,
  StoredHistory,
  StoredPrice,
} from "./price-store.js";
import { NO_DATA_DATE } from "./prices.js";

export interface PriceCacheOptions {
  client: AodpClient;
  store: PriceStore;
  ttlMinutes?: number;
}

export interface GetCachedPricesOptions extends GetPricesOptions {
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
    locations: readonly string[],
    qualities: readonly number[],
    options?: GetCachedPricesOptions,
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
    locations: readonly string[],
    qualities: readonly number[],
    options?: GetCachedPricesOptions,
  ): Promise<CachedHistory>;
}

const MINUTE_MS = 60_000;

export function createPriceCache({
  client,
  store,
  ttlMinutes = 15,
}: PriceCacheOptions): PriceCache {
  const getRows = cachedRows({
    region: client.region,
    rows: store.prices,
    ttlMinutes,
    fetch: async (itemIds, locations, qualities, options) => {
      const { prices, failures } = await client.getPrices(
        itemIds,
        locations,
        qualities,
        options,
      );
      return { rows: prices, failures };
    },
    locationOf: (row) => row.city,
    empty: (itemId, location, quality) => ({
      item_id: itemId,
      city: location,
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
    async getPrices(itemIds, locations, qualities, options) {
      const { rows, failures, fetchedAt } = await getRows(
        itemIds,
        locations,
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
}: PriceCacheOptions): HistoryCache {
  const getRows = cachedRows({
    region: client.region,
    rows: store.history,
    ttlMinutes,
    fetch: async (itemIds, locations, qualities, options) => {
      const { history, failures } = await client.getHistory(
        itemIds,
        locations,
        qualities,
        options,
      );
      return { rows: history, failures };
    },
    locationOf: (row) => row.location,
    empty: (itemId, location, quality) => ({
      location,
      item_id: itemId,
      quality,
      data: [],
    }),
  });

  return {
    async getHistory(itemIds, locations, qualities, options) {
      const { rows, failures, fetchedAt } = await getRows(
        itemIds,
        locations,
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
    locations: readonly string[],
    qualities: readonly number[],
    options: GetPricesOptions,
  ) => Promise<{ rows: T[]; failures: BatchFailure[] }>;
  locationOf: (row: T) => string;
  empty: (itemId: string, location: string, quality: number) => T;
}

// AODP matches market names in any case, so the cache does too.
function comboId(itemId: string, location: string, quality: number): string {
  return JSON.stringify([itemId, location.toLowerCase(), quality]);
}

function cachedRows<T extends { item_id: string; quality: number }>({
  region,
  rows: store,
  ttlMinutes,
  fetch,
  locationOf,
  empty,
}: CachedRowsOptions<T>) {
  return async (
    itemIds: readonly string[],
    locations: readonly string[],
    qualities: readonly number[],
    { force = false, ...options }: GetCachedPricesOptions = {},
  ) => {
    const now = Date.now();
    const items = [...new Set(itemIds)];
    const markets = [...new Set(locations)];
    const levels = [...new Set(qualities)];
    const cached = await store.get(
      items.flatMap((itemId) =>
        markets.flatMap((location) =>
          levels.map((quality): PriceKey => [
            region,
            itemId,
            location,
            quality,
          ]),
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
      rows.map((row) => comboId(row.item_id, locationOf(row), row.quality)),
    );
    const empties = toFetch
      .filter((itemId) => !failed.has(itemId))
      .flatMap((itemId) =>
        markets.flatMap((location) =>
          levels
            .filter(
              (quality) => !answered.has(comboId(itemId, location, quality)),
            )
            .map((quality) => empty(itemId, location, quality)),
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
