import type { FetchOptions } from "./aodp.types.js";

// `force` fetches every item again, and `refetch` only the items it lists,
// even when they're recent.
export interface CachedFetchOptions extends FetchOptions {
  force?: boolean;
  refetch?: readonly string[];
}

export interface CachedRows<T> {
  rows: T[];
  fetchedAt: number | undefined;
}
