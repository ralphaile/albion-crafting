import type { FetchOptions } from "./aodp.types.js";

export interface CachedFetchOptions extends FetchOptions {
  force?: boolean;
}
