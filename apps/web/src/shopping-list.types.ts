import type { OrderPrices } from "@aoc/core";

// `expected` is what the crafts are expected to use after returns, and `toBuy`
// is that rounded up to whole items. Without a unit price there's no cost.
export interface ShoppingLine {
  itemId: string;
  source: keyof OrderPrices;
  expected: number;
  toBuy: number;
  unitPrice?: number;
  cost?: number;
}

// `total` only adds up the lines with a price.
export interface ShoppingMarket {
  marketId: string;
  lines: ShoppingLine[];
  total: number;
  complete: boolean;
}
