import type { OrderPrices } from "@aoc/core";

// `fromSnapshot` is a price from the site's snapshot, used when AODP couldn't
// answer.
export type ObservedPrice =
  | { status: "missing" }
  | {
      status: "fresh" | "stale";
      value: number;
      observedAt: number;
      ageMinutes: number;
      fromSnapshot?: boolean;
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
