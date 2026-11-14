import type { OrderPrices } from "./market.types.js";

export type SellMode = "order" | "instant" | "blackMarket";

export interface RevenueOptions {
  sellMode: SellMode;
  premium: boolean;
  undercut?: boolean;
}

// One quality's sale; an estimated one has no price of its own and takes the
// next lower quality's.
export interface QualitySale {
  quality: number;
  price: number;
  net: number;
  estimated: boolean;
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
      // Only when quality-weighted: Normal to Masterpiece.
      byQuality?: readonly QualitySale[];
    };
