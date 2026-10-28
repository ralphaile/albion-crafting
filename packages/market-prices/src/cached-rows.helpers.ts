import { DEFAULT_REGION } from "./aodp.constants.js";
import type { BatchFailure, FetchOptions, Region } from "./aodp.types.js";
import type { RowKey, RowStore } from "./cache.types.js";
import type { CachedFetchOptions } from "./cached-rows.types.js";

const MINUTE_MS = 60_000;

interface Stamp {
  region: Region;
  fetchedAt: number;
}

interface CachedRowsOptions<T> {
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

export function cachedRows<T extends { item_id: string; quality: number }>({
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
    const region = options.region ?? DEFAULT_REGION;
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
