import type { BatchFailure } from "./aodp.types.js";
import type { CachedFetchOptions } from "./cached-rows.types.js";
import type { HistorySummary, SummarizeOptions } from "./history.types.js";
import type { ItemPrices } from "./prices.types.js";

// `onPartial` gets the prices known so far: those already fetched, and the
// older ones of what's still to come.
export interface PricesOptions extends CachedFetchOptions {
  staleAfterMinutes?: number;
  onPartial?: (partial: PartialPrices) => void;
}

export type PartialPrices = Omit<PricesResult, "failures">;

export type HistoryOptions = CachedFetchOptions & SummarizeOptions;

export interface PricesResult {
  prices: ItemPrices[];
  failures: BatchFailure[];
  fetchedAt: number | undefined;
}

export interface HistoryResult {
  history: HistorySummary[];
  failures: BatchFailure[];
  fetchedAt: number | undefined;
}

export interface MarketData {
  readonly persistent: boolean;
  getPrices(
    itemIds: readonly string[],
    marketIds: readonly string[],
    qualities: readonly number[],
    options?: PricesOptions,
  ): Promise<PricesResult>;
  getHistory(
    itemIds: readonly string[],
    marketIds: readonly string[],
    qualities: readonly number[],
    options?: HistoryOptions,
  ): Promise<HistoryResult>;
  clear(): Promise<void>;
}
