import type { OrderPrices } from "./market.types.js";

export interface Material {
  id: string;
  count: number;
  returnable: boolean;
}

export type BuyMode = "instant" | "order";

interface LineBase {
  itemId: string;
  count: number;
  effectiveCount: number;
  source: keyof OrderPrices;
}

export type MaterialLine =
  | (LineBase & { status: "missing" })
  | (LineBase & {
      status: "fresh" | "stale";
      unitPrice: number;
      cost: number;
    });

export type MaterialCost =
  | { status: "complete"; lines: MaterialLine[]; total: number }
  | { status: "incomplete"; lines: MaterialLine[] };

export interface MaterialCostOptions {
  returnRate: number;
  buyMode: BuyMode;
}
