import { createAodpClient } from "./aodp.client.js";
import type { AodpEvent, BatchFailure, Region } from "./aodp.types.js";
import { markets } from "./markets.constants.js";
import type { ReadSnapshot } from "./snapshot.client.js";
import { SNAPSHOT_QUALITY, toSnapshots } from "./snapshot.helpers.js";
import type { PriceSnapshot } from "./snapshot.types.js";

export interface FetchedSnapshots {
  snapshots: Map<string, PriceSnapshot>;
  failures: BatchFailure[];
}

// Fetches one server's prices of every item in every market. The items AODP
// can't answer for keep their rows from the last snapshot, so a bad run leaves
// them as they were.
export async function fetchPriceSnapshots(
  itemIds: readonly string[],
  region: Region,
  {
    lastSnapshot,
    onEvent,
  }: { lastSnapshot?: ReadSnapshot; onEvent?: (event: AodpEvent) => void } = {},
): Promise<FetchedSnapshots> {
  const marketIds = markets.map(({ id }) => id);
  const fetchedAt = Date.now();
  const { prices, failures } = await createAodpClient().getPrices(
    itemIds,
    marketIds,
    [SNAPSHOT_QUALITY],
    { region, ...(onEvent && { onEvent }) },
  );
  const snapshots = toSnapshots(prices, fetchedAt);
  const failed = new Set(failures.flatMap((failure) => failure.itemIds));
  if (failed.size > 0 && lastSnapshot !== undefined) {
    for (const marketId of marketIds) {
      const last = await lastSnapshot(region, marketId);
      const kept = last?.rows.filter(([itemId]) => failed.has(itemId)) ?? [];
      if (kept.length === 0) {
        continue;
      }
      const snapshot = snapshots.get(marketId) ?? { fetchedAt, rows: [] };
      snapshot.rows.push(...kept);
      snapshots.set(marketId, snapshot);
    }
  }
  return { snapshots, failures };
}
