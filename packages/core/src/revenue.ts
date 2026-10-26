import { type OrderPrices, SETUP_FEE } from "./market.js";

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

const PREMIUM_TAX = 0.04;
const TAX = 0.08;
const UNDERCUT = 1;

export function revenue(
  prices: OrderPrices | undefined,
  { sellMode, premium, undercut = false }: RevenueOptions,
): Revenue {
  const source: keyof OrderPrices = sellMode === "order" ? "sellMin" : "buyMax";
  const marketPrice = prices?.[source];
  if (marketPrice === undefined || marketPrice.status === "missing") {
    return { status: "missing", source };
  }
  const price =
    sellMode === "order" && undercut
      ? marketPrice.value - UNDERCUT
      : marketPrice.value;
  const tax = price * (premium ? PREMIUM_TAX : TAX);
  const setupFee = sellMode === "order" ? price * SETUP_FEE : 0;
  return {
    status: marketPrice.status,
    source,
    price,
    tax,
    setupFee,
    net: price - tax - setupFee,
  };
}
