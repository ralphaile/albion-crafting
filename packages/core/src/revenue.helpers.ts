import { SETUP_FEE } from "./market.constants.js";
import type { OrderPrices } from "./market.types.js";
import type { Revenue, RevenueOptions } from "./revenue.types.js";

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
