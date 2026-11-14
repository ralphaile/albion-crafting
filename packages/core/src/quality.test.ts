import { describe, expect, it } from "vitest";

import {
  type OrderPrices,
  QUALITY_ODDS,
  qualityWeightedRevenue,
  revenue,
} from "./index.js";

const sellOrder = (value: number): OrderPrices => ({
  sellMin: { status: "fresh", value },
  buyMax: { status: "missing" },
});

const options = { sellMode: "order", premium: true } as const;

function weighted(
  normal: number,
  higher: Record<number, number> = {},
): ReturnType<typeof qualityWeightedRevenue> {
  return qualityWeightedRevenue(
    revenue(sellOrder(normal), options),
    new Map(
      Object.entries(higher).map(([quality, value]) => [
        Number(quality),
        sellOrder(value),
      ]),
    ),
    options,
  );
}

// Premium tax 4% and setup fee 2.5% leave 93.5% of the price.
const NET = 0.935;

describe("qualityWeightedRevenue", () => {
  it("has base odds that add up to 1", () => {
    expect(QUALITY_ODDS.reduce((sum, odds) => sum + odds, 0)).toBeCloseTo(
      1,
      10,
    );
  });

  it("adds up each quality's net price times its odds", () => {
    const sale = weighted(1000, { 2: 2000, 3: 4000, 4: 8000, 5: 16_000 });

    if (sale.status === "missing") throw new Error("Expected a sale");
    const expected =
      0.689 * 1000 + 0.25 * 2000 + 0.05 * 4000 + 0.01 * 8000 + 0.001 * 16_000;
    expect(sale.price).toBeCloseTo(expected, 6);
    expect(sale.net).toBeCloseTo(expected * NET, 6);
    expect(sale.tax + sale.setupFee).toBeCloseTo(expected * (1 - NET), 6);
    expect(sale.byQuality?.every(({ estimated }) => !estimated)).toBe(true);
  });

  it("gives a quality without a price the next lower known one's, marked estimated", () => {
    const sale = weighted(1000, { 3: 4000 });

    if (sale.status === "missing") throw new Error("Expected a sale");
    expect(
      sale.byQuality?.map(({ quality, price, estimated }) => [
        quality,
        price,
        estimated,
      ]),
    ).toEqual([
      [1, 1000, false],
      [2, 1000, true],
      [3, 4000, false],
      [4, 4000, true],
      [5, 4000, true],
    ]);
    expect(sale.price).toBeCloseTo(
      0.689 * 1000 + 0.25 * 1000 + 0.05 * 4000 + 0.011 * 4000,
      6,
    );
  });

  it("is the normal sale's price when no higher quality has one", () => {
    const sale = weighted(1000);

    if (sale.status === "missing") throw new Error("Expected a sale");
    expect(sale.net).toBeCloseTo(1000 * NET, 6);
  });

  it("is missing when the normal quality is", () => {
    expect(
      qualityWeightedRevenue(
        revenue(undefined, options),
        new Map([[2, sellOrder(2000)]]),
        options,
      ),
    ).toEqual({ status: "missing", source: "sellMin" });
  });
});
