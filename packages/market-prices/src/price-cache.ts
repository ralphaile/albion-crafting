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
  StoredPrice,
} from "./price-store.js";

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
}

function cachedRows<T extends { item_id: string }>({
  region,
  rows: store,
  ttlMinutes,
  fetch,
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
    const fetched = rows.map((row): T & Stamp => ({
      ...row,
      region,
      fetchedAt: now,
    }));
    await store.put(fetched);

    // Older rows of an item that failed to fetch beat no rows at all.
    const failed = new Set(failures.flatMap((failure) => failure.itemIds));
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
