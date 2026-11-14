import type { AodpPrice, Region } from "@aoc/market-prices";

interface StoredPrices {
  rows: AodpPrice[];
  // When the oldest of the rows was fetched, or undefined with no rows.
  fetchedAt: number | undefined;
}

export interface PriceStore {
  save(
    region: Region,
    rows: readonly AodpPrice[],
    fetchedAt: number,
  ): Promise<void>;
  // Markets match in any case, as AODP's do.
  read(
    region: Region,
    itemIds: readonly string[],
    marketIds: readonly string[],
    qualities: readonly number[],
  ): Promise<StoredPrices>;
  // Throws when the database can't be reached.
  ping(): Promise<void>;
  close(): Promise<void>;
}
