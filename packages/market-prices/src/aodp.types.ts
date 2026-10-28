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
    options?: FetchOptions,
  ): Promise<FetchedPrices>;
  getHistory(
    itemIds: readonly string[],
    marketIds: readonly string[],
    qualities: readonly number[],
    options?: FetchOptions,
  ): Promise<FetchedHistory>;
}
