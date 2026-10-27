import type { OrderPrices } from "@aoc/core";

export type ObservedPrice =
  | { status: "missing" }
  | {
      status: "fresh" | "stale";
      value: number;
      observedAt: number;
      ageMinutes: number;
    };

export interface ItemPrices extends OrderPrices {
  itemId: string;
  marketId: string;
  quality: number;
  sellMin: ObservedPrice;
  buyMax: ObservedPrice;
}

export interface NormalizeOptions {
  now?: number;
  staleAfterMinutes?: number;
}
