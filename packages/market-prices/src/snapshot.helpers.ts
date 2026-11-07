import { NO_DATA_DATE } from "./aodp.constants.js";
import type { AodpPrice } from "./aodp.schema.js";
import type { Region } from "./aodp.types.js";
import type {
  MarkedPrice,
  PriceSnapshot,
  SnapshotRow,
} from "./snapshot.types.js";

export const SNAPSHOT_QUALITY = 1;

// Such as `west/black-market.json`.
export function snapshotPath(region: Region, marketId: string): string {
  return `${region}/${marketId.toLowerCase().replaceAll(" ", "-")}.json`;
}

function hasPrice(row: AodpPrice) {
  return row.sell_price_min > 0 || row.buy_price_max > 0;
}

// One snapshot per market, leaving out the items with no orders.
export function toSnapshots(
  rows: readonly AodpPrice[],
  fetchedAt: number,
): Map<string, PriceSnapshot> {
  const snapshots = new Map<string, PriceSnapshot>();
  for (const row of rows) {
    if (row.quality !== SNAPSHOT_QUALITY || !hasPrice(row)) {
      continue;
    }
    const snapshot = snapshots.get(row.city) ?? { fetchedAt, rows: [] };
    snapshot.rows.push([
      row.item_id,
      row.sell_price_min,
      row.sell_price_min_date,
      row.buy_price_max,
      row.buy_price_max_date,
    ]);
    snapshots.set(row.city, snapshot);
  }
  return snapshots;
}

export function fromSnapshotRow(
  [itemId, sellMin, sellMinDate, buyMax, buyMaxDate]: SnapshotRow,
  marketId: string,
): AodpPrice {
  return {
    item_id: itemId,
    city: marketId,
    quality: SNAPSHOT_QUALITY,
    sell_price_min: sellMin,
    sell_price_min_date: sellMinDate,
    sell_price_max: 0,
    sell_price_max_date: NO_DATA_DATE,
    buy_price_min: 0,
    buy_price_min_date: NO_DATA_DATE,
    buy_price_max: buyMax,
    buy_price_max_date: buyMaxDate,
  };
}

function seen(value: number, date: string) {
  return value === 0 ? NO_DATA_DATE : date;
}

// Each side is the one AODP saw last. The dates are AODP's, all in UTC, so
// they sort as text.
export function withSnapshotRow<Row extends MarkedPrice>(
  saved: Row | undefined,
  snapshot: AodpPrice,
): Row | MarkedPrice {
  if (saved === undefined) {
    return {
      ...snapshot,
      sellFromSnapshot: snapshot.sell_price_min > 0,
      buyFromSnapshot: snapshot.buy_price_max > 0,
    };
  }
  const sell =
    seen(snapshot.sell_price_min, snapshot.sell_price_min_date) >
    seen(saved.sell_price_min, saved.sell_price_min_date);
  const buy =
    seen(snapshot.buy_price_max, snapshot.buy_price_max_date) >
    seen(saved.buy_price_max, saved.buy_price_max_date);
  if (!sell && !buy) {
    return saved;
  }
  return {
    ...saved,
    ...(sell && {
      sell_price_min: snapshot.sell_price_min,
      sell_price_min_date: snapshot.sell_price_min_date,
      sellFromSnapshot: true,
    }),
    ...(buy && {
      buy_price_max: snapshot.buy_price_max,
      buy_price_max_date: snapshot.buy_price_max_date,
      buyFromSnapshot: true,
    }),
  };
}
