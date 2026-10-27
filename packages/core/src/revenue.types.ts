import type { OrderPrices } from "./market.types.js";

export type SellMode = "order" | "instant" | "blackMarket";

export interface RevenueOptions {
  sellMode: SellMode;
  premium: boolean;
  undercut?: boolean;
}

export type Revenue =
  | { status: "missing"; source: keyof OrderPrices }
  | {
      status: "fresh" | "stale";
      source: keyof OrderPrices;
      price: number;
      tax: number;
      setupFee: number;
      net: number;
    };
