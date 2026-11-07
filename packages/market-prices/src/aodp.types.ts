import type { AodpHistory, AodpPrice } from "./aodp.schema.js";

export type Region = "west" | "europe" | "east";

export interface BatchFailure {
  itemIds: string[];
  error: Error;
}

export type AodpEvent =
  | { type: "progress"; done: number; total: number }
  | { type: "waiting"; seconds: number }
  | ({ type: "error" } & BatchFailure);

export interface FetchOptions {
  region?: Region;
  onEvent?: (event: AodpEvent) => void;
  signal?: AbortSignal;
}

// `onBatch` gets each batch's rows as soon as it arrives.
export interface BatchOptions<T> extends FetchOptions {
  onBatch?: (itemIds: string[], rows: T[]) => void;
}

interface FetchedPrices {
  prices: AodpPrice[];
  failures: BatchFailure[];
}

interface FetchedHistory {
  history: AodpHistory[];
  failures: BatchFailure[];
}

export interface AodpClient {
  getPrices(
    itemIds: readonly string[],
    marketIds: readonly string[],
    qualities: readonly number[],
    options?: BatchOptions<AodpPrice>,
  ): Promise<FetchedPrices>;
  getHistory(
    itemIds: readonly string[],
    marketIds: readonly string[],
    qualities: readonly number[],
    options?: BatchOptions<AodpHistory>,
  ): Promise<FetchedHistory>;
}
