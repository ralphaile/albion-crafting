import { createAodpClient } from "./aodp.client.js";
import { DEFAULT_REGION, NO_DATA_DATE } from "./aodp.constants.js";
import type { AodpHistory, AodpPrice } from "./aodp.schema.js";
import type { Region } from "./aodp.types.js";
import { openCacheStore } from "./cache.store.js";
import { cachedRows } from "./cached-rows.helpers.js";
import { summarizeSeries } from "./history.helpers.js";
import type { HistorySummary } from "./history.types.js";
import type { MarketData } from "./market-data.types.js";
import { normalizePrices } from "./prices.helpers.js";
import { type ReadSnapshot, snapshotReader } from "./snapshot.client.js";
import {
  SNAPSHOT_QUALITY,
  fromSnapshotRow,
  withSnapshotRow,
} from "./snapshot.helpers.js";
import type { MarkedPrice } from "./snapshot.types.js";

// AODP matches market names in any case.
function priceKey(itemId: string, marketId: string, quality: number) {
  return JSON.stringify([itemId, marketId.toLowerCase(), quality]);
}

// The items AODP couldn't answer for get the newer of their saved price and the
// snapshot's.
async function withSnapshot(
  readSnapshot: ReadSnapshot,
  rows: readonly MarkedPrice[],
  {
    failed,
    marketIds,
    qualities,
    region,
  }: {
    failed: ReadonlySet<string>;
    marketIds: readonly string[];
    qualities: readonly number[];
    region: Region;
  },
): Promise<{ rows: MarkedPrice[]; oldestSnapshot: number | undefined }> {
  if (failed.size === 0 || !qualities.includes(SNAPSHOT_QUALITY)) {
    return { rows: [...rows], oldestSnapshot: undefined };
  }
  const byKey = new Map<string, MarkedPrice>(
    rows.map((row) => [priceKey(row.item_id, row.city, row.quality), row]),
  );
  let oldestSnapshot: number | undefined;
  const snapshots = await Promise.all(
    [...new Set(marketIds)].map(
      async (marketId) =>
        [marketId, await readSnapshot(region, marketId)] as const,
    ),
  );
  for (const [marketId, snapshot] of snapshots) {
    if (snapshot === undefined) {
      continue;
    }
    for (const row of snapshot.rows) {
      if (!failed.has(row[0])) {
        continue;
      }
      const key = priceKey(row[0], marketId, SNAPSHOT_QUALITY);
      const saved = byKey.get(key);
      const used = withSnapshotRow(saved, fromSnapshotRow(row, marketId));
      if (used !== saved) {
        byKey.set(key, used);
        oldestSnapshot = Math.min(
          oldestSnapshot ?? snapshot.fetchedAt,
          snapshot.fetchedAt,
        );
      }
    }
  }
  return { rows: [...byKey.values()], oldestSnapshot };
}

// `snapshotUrl` is where the site publishes its price snapshot, such as
// `/albion-crafting/prices/`.
export async function openMarketData({
  snapshotUrl,
}: { snapshotUrl?: string } = {}): Promise<MarketData> {
  const readSnapshot =
    snapshotUrl === undefined ? undefined : snapshotReader(snapshotUrl);
  const store = await openCacheStore();
  // One client, so that prices and history share its rate limiter.
  const client = createAodpClient();

  const cachedPrices = cachedRows<AodpPrice>({
    rows: store.prices,
    ttlMinutes: 15,
    fetch: (itemIds, marketIds, qualities, options) =>
      client.getPrices(itemIds, marketIds, qualities, options),
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

  const cachedHistory = cachedRows<AodpHistory>({
    rows: store.history,
    ttlMinutes: 6 * 60,
    fetch: (itemIds, marketIds, qualities, options) =>
      client.getHistory(itemIds, marketIds, qualities, options),
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
    async getPrices(itemIds, marketIds, qualities, options = {}) {
      const { onPartial, ...fetchOptions } = options;
      const { rows, failures, fetchedAt } = await cachedPrices(
        itemIds,
        marketIds,
        qualities,
        {
          ...fetchOptions,
          ...(onPartial && {
            onPartial: (read) => {
              onPartial(() => {
                const partial = read();
                return {
                  prices: normalizePrices(partial.rows, options),
                  fetchedAt: partial.fetchedAt,
                };
              });
            },
          }),
        },
      );
      if (readSnapshot === undefined) {
        return { prices: normalizePrices(rows, options), failures, fetchedAt };
      }
      const used = await withSnapshot(readSnapshot, rows, {
        failed: new Set(failures.flatMap(({ itemIds: failed }) => failed)),
        marketIds,
        qualities,
        region: options.region ?? DEFAULT_REGION,
      });
      return {
        prices: normalizePrices(used.rows, options),
        failures,
        fetchedAt:
          used.oldestSnapshot === undefined
            ? fetchedAt
            : Math.min(fetchedAt ?? used.oldestSnapshot, used.oldestSnapshot),
      };
    },
    async getHistory(itemIds, marketIds, qualities, options = {}) {
      const { onPartial, ...fetchOptions } = options;
      // Each read is of every series so far, so each is summed up only once.
      const summaries = new WeakMap<AodpHistory, HistorySummary>();
      const summarize = (rows: readonly AodpHistory[]) =>
        rows.map((row) => {
          const known = summaries.get(row);
          if (known !== undefined) {
            return known;
          }
          const summary = summarizeSeries(row, options);
          summaries.set(row, summary);
          return summary;
        });
      const { rows, failures, fetchedAt } = await cachedHistory(
        itemIds,
        marketIds,
        qualities,
        {
          ...fetchOptions,
          ...(onPartial && {
            onPartial: (read) => {
              onPartial(() => {
                const partial = read();
                return {
                  history: summarize(partial.rows),
                  fetchedAt: partial.fetchedAt,
                };
              });
            },
          }),
        },
      );
      return { history: summarize(rows), failures, fetchedAt };
    },
    clear: () => store.clear(),
  };
}
