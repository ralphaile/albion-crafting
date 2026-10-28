import type { OrderPrices } from "@aoc/core";
import type { Region } from "@aoc/market-prices";

export interface ManualPriceKey {
  region: Region;
  itemId: string;
  marketId: string;
  quality: number;
  // The API price it replaces: the cheapest sell order or the best buy order.
  source: keyof OrderPrices;
}

export interface ManualPrice extends ManualPriceKey {
  value: number;
  enteredAt: number;
}

export interface ManualPriceStore {
  readonly persistent: boolean;
  list(): Promise<ManualPrice[]>;
  save(price: ManualPrice): Promise<void>;
  remove(key: ManualPriceKey): Promise<void>;
}
