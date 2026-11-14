import { type AodpPrice, type Region, markets } from "@aoc/market-prices";

import type { PriceStore } from "./price-store.types.js";

type GetPrices = (
  itemIds: readonly string[],
  marketIds: readonly string[],
  qualities: readonly number[],
  options: { region: Region; signal?: AbortSignal },
) => Promise<{ prices: AodpPrice[]; failures: { itemIds: string[] }[] }>;

export interface RefreshReport {
  region: Region;
  prices: number;
  failedItems: number;
  seconds: number;
}

// Asks AODP for every item in every market on each server, at Normal quality,
// and saves what comes back. AODP's client keeps to its request limits, so a
// run takes as long as they need. An item AODP doesn't answer for keeps its
// saved prices.
export async function refreshPrices(
  store: PriceStore,
  getPrices: GetPrices,
  itemIds: readonly string[],
  regions: readonly Region[],
  { signal, now = Date.now }: { signal?: AbortSignal; now?: () => number } = {},
): Promise<RefreshReport[]> {
  const marketIds = markets.map(({ id }) => id);
  const reports: RefreshReport[] = [];
  for (const region of regions) {
    if (signal?.aborted === true) {
      break;
    }
    const startedAt = now();
    const { prices, failures } = await getPrices(itemIds, marketIds, [1], {
      region,
      ...(signal && { signal }),
    });
    await store.save(region, prices, startedAt);
    reports.push({
      region,
      prices: prices.length,
      failedItems: failures.reduce(
        (sum, failure) => sum + failure.itemIds.length,
        0,
      ),
      seconds: Math.round((now() - startedAt) / 1000),
    });
  }
  return reports;
}
