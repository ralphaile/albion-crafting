export type MarketPrice =
  { status: "missing" } | { status: "fresh" | "stale"; value: number };

export interface OrderPrices {
  sellMin: MarketPrice;
  buyMax: MarketPrice;
}
