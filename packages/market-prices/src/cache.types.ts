import type { Region } from "./aodp.types.js";

export type RowKey = [
  region: Region,
  itemId: string,
  marketId: string,
  quality: number,
];

export interface RowStore<T> {
  get(keys: readonly RowKey[]): Promise<T[]>;
  put(rows: readonly T[]): Promise<void>;
}
