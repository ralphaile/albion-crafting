export type PriceOrigin = "api" | "manual";

export interface DatedPrice {
  status: "fresh" | "stale";
  value: number;
  // Milliseconds since 1970, like Date.now().
  observedAt: number;
}

export interface PriceChoiceOptions {
  preferManual: boolean;
}
