import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  type MarketPrice,
  type OrderPrices,
  revenue,
  type Revenue,
  type RevenueOptions,
  type SellMode,
} from "./index.js";

const fresh = (value: number): MarketPrice => ({ status: "fresh", value });
const missing: MarketPrice = { status: "missing" };

const sellMarket: OrderPrices = {
  sellMin: fresh(10_000),
  buyMax: fresh(9000),
};
const blackMarket: OrderPrices = { sellMin: missing, buyMax: fresh(12_000) };

function priced(result: Revenue) {
  if (result.status === "missing") {
    throw new Error(`There's no ${result.source} price`);
  }
  return result;
}

describe("revenue", () => {
  it.each<{
    case: string;
    prices: OrderPrices;
    options: RevenueOptions;
    source: keyof OrderPrices;
    price: number;
    tax: number;
    setupFee: number;
    net: number;
  }>([
    {
      case: "a sell order, with premium",
      prices: sellMarket,
      options: { sellMode: "order", premium: true },
      source: "sellMin",
      price: 10_000,
      tax: 400,
      setupFee: 250,
      net: 9350,
    },
    {
      case: "a sell order, without premium",
      prices: sellMarket,
      options: { sellMode: "order", premium: false },
      source: "sellMin",
      price: 10_000,
      tax: 800,
      setupFee: 250,
      net: 8950,
    },
    {
      case: "a sell order 1 silver under the lowest one, with premium",
      prices: sellMarket,
      options: { sellMode: "order", premium: true, undercut: true },
      source: "sellMin",
      price: 9999,
      tax: 399.96,
      setupFee: 249.975,
      net: 9349.065,
    },
    {
      case: "an instant sale, with premium",
      prices: sellMarket,
      options: { sellMode: "instant", premium: true },
      source: "buyMax",
      price: 9000,
      tax: 360,
      setupFee: 0,
      net: 8640,
    },
    {
      case: "an instant sale, without premium",
      prices: sellMarket,
      options: { sellMode: "instant", premium: false },
      source: "buyMax",
      price: 9000,
      tax: 720,
      setupFee: 0,
      net: 8280,
    },
    {
      case: "an instant sale ignores the undercut",
      prices: sellMarket,
      options: { sellMode: "instant", premium: true, undercut: true },
      source: "buyMax",
      price: 9000,
      tax: 360,
      setupFee: 0,
      net: 8640,
    },
    {
      case: "a Black Market sale, with premium",
      prices: blackMarket,
      options: { sellMode: "blackMarket", premium: true },
      source: "buyMax",
      price: 12_000,
      tax: 480,
      setupFee: 0,
      net: 11_520,
    },
    {
      case: "a Black Market sale, without premium",
      prices: blackMarket,
      options: { sellMode: "blackMarket", premium: false },
      source: "buyMax",
      price: 12_000,
      tax: 960,
      setupFee: 0,
      net: 11_040,
    },
  ])("$case", ({ prices, options, source, price, tax, setupFee, net }) => {
    const result = priced(revenue(prices, options));

    expect(result.status).toBe("fresh");
    expect(result.source).toBe(source);
    expect(result.price).toBeCloseTo(price, 6);
    expect(result.tax).toBeCloseTo(tax, 6);
    expect(result.setupFee).toBeCloseTo(setupFee, 6);
    expect(result.net).toBeCloseTo(net, 6);
  });

  it("is missing without a sell order to match, even with a buy order", () => {
    expect(
      revenue(
        { sellMin: missing, buyMax: fresh(9000) },
        { sellMode: "order", premium: true },
      ),
    ).toStrictEqual({ status: "missing", source: "sellMin" });
  });

  it("is missing without a buy order to sell to, even with a sell order", () => {
    expect(
      revenue(
        { sellMin: fresh(10_000), buyMax: missing },
        { sellMode: "instant", premium: true },
      ),
    ).toStrictEqual({ status: "missing", source: "buyMax" });
  });

  it("is missing when the market has no prices for the item", () => {
    expect(
      revenue(undefined, { sellMode: "blackMarket", premium: true }),
    ).toStrictEqual({ status: "missing", source: "buyMax" });
  });

  it("counts a stale price, and keeps it flagged", () => {
    expect(
      revenue(
        { sellMin: { status: "stale", value: 10_000 }, buyMax: fresh(9000) },
        { sellMode: "order", premium: true },
      ),
    ).toMatchObject({ status: "stale", price: 10_000 });
  });

  it("always nets less than the price, and more with premium", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 1_000_000_000 }),
        fc.constantFrom<SellMode>("order", "instant", "blackMarket"),
        fc.boolean(),
        (value, sellMode, undercut) => {
          const prices = { sellMin: fresh(value), buyMax: fresh(value) };
          const withPremium = priced(
            revenue(prices, { sellMode, premium: true, undercut }),
          );
          const without = priced(
            revenue(prices, { sellMode, premium: false, undercut }),
          );

          expect(withPremium.net).toBeLessThan(withPremium.price);
          expect(without.net).toBeGreaterThan(0);
          expect(withPremium.net).toBeGreaterThan(without.net);
        },
      ),
    );
  });
});
