import { describe, expect, it } from "vitest";

import type { HistorySummary } from "@aoc/market-prices";
import history from "@aoc/market-prices/fixtures/history.json" with { type: "json" };

import type {
  CraftHistory,
  UsedItemPrices,
  UsedPrice,
} from "./best-crafts.types";
import { withOutliers } from "./outliers.helpers";

function api(value: number): UsedPrice {
  return {
    status: "fresh",
    value,
    observedAt: 0,
    ageMinutes: 30,
    origin: "api",
  };
}

function at(itemId: string, sellMin: UsedPrice, buyMax: UsedPrice) {
  return { itemId, marketId: "Caerleon", quality: 1, sellMin, buyMax };
}

function averaging(itemId: string, averagePrice: number | undefined) {
  return {
    itemId,
    marketId: "Caerleon",
    quality: 1,
    averagePrice,
    averageDailyVolume: 10,
    newestDay: 0,
  } satisfies HistorySummary;
}

// T4_BAG in Caerleon sold for 4,441 on average in the recorded week.
const bagWeek: CraftHistory = {
  materials: [],
  products: [averaging("T4_BAG", 4441.15)],
};

function bagAt(sellMin: number, buyMax = 3505): readonly UsedItemPrices[] {
  return withOutliers(
    { materials: [], products: [at("T4_BAG", api(sellMin), api(buyMax))] },
    bagWeek,
    { ratio: 2, useAverage: false },
  ).products;
}

describe("withOutliers", () => {
  it("averages the recorded week of T4_BAG in Caerleon to about 4,441", () => {
    const [series] = history.body;
    const recent = series?.data.slice(-7) ?? [];
    const sold = recent.reduce((sum, day) => sum + day.item_count, 0);
    const earned = recent.reduce(
      (sum, day) => sum + day.item_count * day.avg_price,
      0,
    );

    expect(earned / sold).toBeCloseTo(4441.15, 1);
  });

  it("flags a T4_BAG at 17,999 in Caerleon, against a 7-day average of about 4,441", () => {
    const [bag] = bagAt(17_999);

    expect(bag?.sellMin).toEqual({
      ...api(17_999),
      outlier: { seen: 17_999, average: 4441.15, usingAverage: false },
    });
    expect(bag?.buyMax).toEqual(api(3505));
  });

  it.each([
    [8882, false],
    [8883, true],
    [2221, false],
    [2220, true],
  ])(
    "judges %d against twice and half the average: outlier %s",
    (value, flagged) => {
      const [bag] = bagAt(value);

      expect(bag?.sellMin.outlier !== undefined).toBe(flagged);
    },
  );

  it("uses the average in place of an outlier when asked", () => {
    const [bag] = withOutliers(
      { materials: [], products: [at("T4_BAG", api(17_999), api(3505))] },
      bagWeek,
      { ratio: 2, useAverage: true },
    ).products;

    expect(bag?.sellMin).toMatchObject({
      value: 4441.15,
      outlier: { seen: 17_999, average: 4441.15, usingAverage: true },
    });
  });

  it("judges material prices against the materials' history", () => {
    const [bar] = withOutliers(
      {
        materials: [at("T4_METALBAR", api(900), api(20))],
        products: [],
      },
      { materials: [averaging("T4_METALBAR", 100)], products: [] },
      { ratio: 3, useAverage: false },
    ).materials;

    expect(bar?.sellMin.outlier?.seen).toBe(900);
    expect(bar?.buyMax.outlier?.seen).toBe(20);
  });

  it("leaves typed prices, missing ones, and items without sales alone", () => {
    const typed: UsedPrice = { ...api(50_000), origin: "manual" };
    const missing: UsedPrice = { status: "missing", origin: "api" };
    const result = withOutliers(
      {
        materials: [],
        products: [
          at("T4_BAG", typed, missing),
          at("T5_BAG", api(90_000), api(1)),
        ],
      },
      {
        materials: [],
        products: [averaging("T4_BAG", 4441), averaging("T5_BAG", undefined)],
      },
      { ratio: 2, useAverage: true },
    ).products;

    expect(result).toEqual([
      at("T4_BAG", typed, missing),
      at("T5_BAG", api(90_000), api(1)),
    ]);
  });
});
