import type { OrderPrices } from "./market.types.js";
import { HIGHER_QUALITIES, QUALITY_ODDS } from "./quality.constants.js";
import { revenue } from "./revenue.helpers.js";
import type { QualitySale, Revenue, RevenueOptions } from "./revenue.types.js";

// What a craft sells for on average over the qualities it can come out at.
// A quality without a price takes the next lower one's, marked estimated.
export function qualityWeightedRevenue(
  normal: Revenue,
  higher: ReadonlyMap<number, OrderPrices> | undefined,
  options: RevenueOptions,
): Revenue {
  if (normal.status === "missing") {
    return normal;
  }
  const sales: QualitySale[] = [
    { quality: 1, price: normal.price, net: normal.net, estimated: false },
  ];
  let stale = normal.status === "stale";
  let lower = normal;
  for (const quality of HIGHER_QUALITIES) {
    const sale = revenue(higher?.get(quality), options);
    if (sale.status === "missing") {
      sales.push({
        quality,
        price: lower.price,
        net: lower.net,
        estimated: true,
      });
      continue;
    }
    stale ||= sale.status === "stale";
    lower = sale;
    sales.push({ quality, price: sale.price, net: sale.net, estimated: false });
  }
  const expected = (value: (sale: QualitySale) => number) =>
    sales.reduce(
      (sum, sale, index) => sum + (QUALITY_ODDS[index] ?? 0) * value(sale),
      0,
    );
  const price = expected((sale) => sale.price);
  const net = expected((sale) => sale.net);
  // Tax and setup fee scale with the price, so they keep their share.
  const share = normal.price > 0 ? price / normal.price : 0;
  return {
    status: stale ? "stale" : "fresh",
    source: normal.source,
    price,
    tax: normal.tax * share,
    setupFee: normal.setupFee * share,
    net,
    byQuality: sales,
  };
}
