import type { BatchFailure, Region } from "./aodp.types.js";
import type { CachedFetchOptions } from "./cached-rows.types.js";
import type {
  HistorySummary,
  PricePoint,
  SummarizeOptions,
} from "./history.types.js";
import type { ItemPrices } from "./prices.types.js";

// `onPartial` is called as prices arrive. `read` gets the prices known by
// then: those already fetched, and the older ones of what's still to come.
// It's work, so a caller that shows them can read only when it shows them.
export interface PricesOptions extends CachedFetchOptions {
  staleAfterMinutes?: number;
  onPartial?: (read: () => PartialPrices) => void;
}

export type PartialPrices = Omit<PricesResult, "failures">;

export type HistoryOptions = CachedFetchOptions &
  SummarizeOptions & {
    onPartial?: (read: () => PartialHistory) => void;
  };

export type PartialHistory = Omit<HistoryResult, "failures">;

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
  // One item's history in one market, by the hour or by the day, for a chart.
  // Not saved, so each is asked for again after a reload.
  getSeries(
    itemId: string,
    marketId: string,
    quality: number,
    options: SeriesOptions,
  ): Promise<PricePoint[]>;
  clear(): Promise<void>;
}

export interface SeriesOptions {
  hourly: boolean;
  region?: Region;
  signal?: AbortSignal;
}
