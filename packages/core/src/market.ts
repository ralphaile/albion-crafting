export type MarketPrice =
  { status: "missing" } | { status: "fresh" | "stale"; value: number };

export interface OrderPrices {
  sellMin: MarketPrice;
  buyMax: MarketPrice;
}

export const SETUP_FEE = 0.025;
