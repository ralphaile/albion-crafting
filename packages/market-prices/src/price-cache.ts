import type { AodpClient, BatchFailure, GetPricesOptions } from "./aodp.js";
import type { PriceKey, PriceStore, StoredPrice } from "./price-store.js";

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
  return {
    async getPrices(
      itemIds,
      locations,
      qualities,
      { force = false, ...options } = {},
    ) {
      const now = Date.now();
      const items = [...new Set(itemIds)];
      const markets = [...new Set(locations)];
      const levels = [...new Set(qualities)];
      const cached = await store.get(
        items.flatMap((itemId) =>
          markets.flatMap((location) =>
            levels.map((quality): PriceKey => [
              client.region,
              itemId,
              location,
              quality,
            ]),
          ),
        ),
      );

      const recentRows = new Map<string, number>();
      for (const price of cached) {
        if (now - price.fetchedAt < ttlMinutes * MINUTE_MS) {
          recentRows.set(
            price.item_id,
            (recentRows.get(price.item_id) ?? 0) + 1,
          );
        }
      }
      // An item is reused only if every market and quality asked for is recent.
      const reusable = (itemId: string) =>
        !force && recentRows.get(itemId) === markets.length * levels.length;

      const toFetch = items.filter((itemId) => !reusable(itemId));
      const { prices, failures } =
        toFetch.length === 0
          ? { prices: [], failures: [] }
          : await client.getPrices(toFetch, markets, levels, options);
      const fetched = prices.map((price): StoredPrice => ({
        ...price,
        region: client.region,
        fetchedAt: now,
      }));
      await store.put(fetched);

      // Older prices of an item that failed to fetch beat no prices at all.
      const failed = new Set(failures.flatMap((failure) => failure.itemIds));
      const used = [
        ...cached.filter(
          (price) => reusable(price.item_id) || failed.has(price.item_id),
        ),
        ...fetched,
      ];
      return {
        prices: used,
        failures,
        fetchedAt: used.reduce<number | undefined>(
          (oldest, { fetchedAt }) =>
            oldest === undefined ? fetchedAt : Math.min(oldest, fetchedAt),
          undefined,
        ),
      };
    },
  };
}
