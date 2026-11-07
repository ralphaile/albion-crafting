import type { AodpPrice } from "./aodp.schema.js";

// One server's prices in one market, at quality 1. A row is an item, its
// lowest sell order and highest buy order, and when AODP saw each.
export type SnapshotRow = [
  itemId: string,
  sellMin: number,
  sellMinDate: string,
  buyMax: number,
  buyMaxDate: string,
];

export interface PriceSnapshot {
  fetchedAt: number;
  rows: SnapshotRow[];
}

// Which sides of a price row came from the snapshot.
interface SnapshotMarks {
  sellFromSnapshot?: boolean;
  buyFromSnapshot?: boolean;
}

export type MarkedPrice = AodpPrice & SnapshotMarks;
