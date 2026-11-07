import type { FetchOptions } from "./aodp.types.js";

export interface CachedFetchOptions extends FetchOptions {
  force?: boolean;
}

export interface CachedRows<T> {
  rows: T[];
  fetchedAt: number | undefined;
}
