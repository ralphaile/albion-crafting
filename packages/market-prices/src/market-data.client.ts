import { createAodpClient } from "./aodp.client.js";
import { NO_DATA_DATE } from "./aodp.constants.js";
import type { AodpHistory, AodpPrice } from "./aodp.schema.js";
import { openCacheStore } from "./cache.store.js";
import { cachedRows } from "./cached-rows.helpers.js";
import { summarizeSeries } from "./history.helpers.js";
import type { HistorySummary } from "./history.types.js";
import type { MarketData } from "./market-data.types.js";
import { normalizePrices } from "./prices.helpers.js";

export async function openMarketData(): Promise<MarketData> {
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
      return { prices: normalizePrices(rows, options), failures, fetchedAt };
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
