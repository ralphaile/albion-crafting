import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  type MarketPrice,
  type Material,
  materialCost,
  type MaterialCost,
  type OrderPrices,
} from "./index.js";

const fresh = (value: number): MarketPrice => ({ status: "fresh", value });
const missing: MarketPrice = { status: "missing" };

const astralStaff: Material[] = [
  { id: "T4_PLANKS", count: 20, returnable: true },
  { id: "T4_METALBAR", count: 12, returnable: true },
  { id: "T4_ARTEFACT_2H_ARCANESTAFF_CRYSTAL", count: 1, returnable: false },
];
const prices = new Map<string, OrderPrices>([
  ["T4_PLANKS", { sellMin: fresh(1000), buyMax: fresh(900) }],
  ["T4_METALBAR", { sellMin: fresh(1500), buyMax: fresh(1400) }],
  [
    "T4_ARTEFACT_2H_ARCANESTAFF_CRYSTAL",
    { sellMin: fresh(20_000), buyMax: fresh(18_000) },
  ],
]);

function totalOf(cost: MaterialCost): number {
  if (cost.status === "incomplete") {
    throw new Error("The material cost is incomplete");
  }
  return cost.total;
}

function pricedLines(cost: MaterialCost) {
  return cost.lines.map((line) => {
    if (line.status === "missing") {
      throw new Error(`${line.itemId} has no price`);
    }
    return line;
  });
}

describe("materialCost", () => {
  it("buys instantly at the lowest sell order, and returns only the returnable materials", () => {
    expect(
      materialCost(astralStaff, prices, {
        returnRate: 0.25,
        buyMode: "instant",
      }),
    ).toEqual({
      status: "complete",
      lines: [
        {
          itemId: "T4_PLANKS",
          count: 20,
          effectiveCount: 15,
          source: "sellMin",
          status: "fresh",
          unitPrice: 1000,
          cost: 15_000,
        },
        {
          itemId: "T4_METALBAR",
          count: 12,
          effectiveCount: 9,
          source: "sellMin",
          status: "fresh",
          unitPrice: 1500,
          cost: 13_500,
        },
        {
          itemId: "T4_ARTEFACT_2H_ARCANESTAFF_CRYSTAL",
          count: 1,
          effectiveCount: 1,
          source: "sellMin",
          status: "fresh",
          unitPrice: 20_000,
          cost: 20_000,
        },
      ],
      total: 48_500,
    });
  });

  it("buys by order at the highest buy order plus the 2.5% setup fee", () => {
    const cost = materialCost(astralStaff, prices, {
      returnRate: 0.25,
      buyMode: "order",
    });
    const [planks, bars, artifact] = pricedLines(cost);

    expect(cost.lines.map(({ source }) => source)).toEqual([
      "buyMax",
      "buyMax",
      "buyMax",
    ]);
    expect(cost.lines.map(({ effectiveCount }) => effectiveCount)).toEqual([
      15, 9, 1,
    ]);
    expect(planks?.unitPrice).toBeCloseTo(922.5, 6);
    expect(planks?.cost).toBeCloseTo(13_837.5, 6);
    expect(bars?.unitPrice).toBeCloseTo(1435, 6);
    expect(bars?.cost).toBeCloseTo(12_915, 6);
    expect(artifact?.unitPrice).toBeCloseTo(18_450, 6);
    expect(artifact?.cost).toBeCloseTo(18_450, 6);
    expect(totalOf(cost)).toBeCloseTo(45_202.5, 6);
  });

  it("flags a missing price and gives no total", () => {
    const withoutBars = new Map(prices).set("T4_METALBAR", {
      sellMin: missing,
      buyMax: fresh(1400),
    });

    const cost = materialCost(astralStaff, withoutBars, {
      returnRate: 0.25,
      buyMode: "instant",
    });

    expect(cost).toStrictEqual({
      status: "incomplete",
      lines: [
        cost.lines[0],
        {
          itemId: "T4_METALBAR",
          count: 12,
          effectiveCount: 9,
          source: "sellMin",
          status: "missing",
        },
        cost.lines[2],
      ],
    });
    expect(cost.lines.map(({ status }) => status)).toEqual([
      "fresh",
      "missing",
      "fresh",
    ]);
  });

  it("flags a missing buy order even when there's a sell order", () => {
    const withoutBuyOrder = new Map(prices).set("T4_PLANKS", {
      sellMin: fresh(1000),
      buyMax: missing,
    });

    expect(
      materialCost(astralStaff, withoutBuyOrder, {
        returnRate: 0.25,
        buyMode: "order",
      }),
    ).toMatchObject({
      status: "incomplete",
      lines: [{ itemId: "T4_PLANKS", status: "missing" }, {}, {}],
    });
  });

  it("flags a material with no prices at all", () => {
    const withoutArtifact = new Map(prices);
    withoutArtifact.delete("T4_ARTEFACT_2H_ARCANESTAFF_CRYSTAL");

    expect(
      materialCost(astralStaff, withoutArtifact, {
        returnRate: 0.25,
        buyMode: "instant",
      }),
    ).toMatchObject({
      status: "incomplete",
      lines: [{}, {}, { status: "missing", effectiveCount: 1 }],
    });
  });

  it("counts a stale price, and keeps it flagged", () => {
    const staleBars = new Map(prices).set("T4_METALBAR", {
      sellMin: { status: "stale", value: 1500 },
      buyMax: fresh(1400),
    });

    expect(
      materialCost(astralStaff, staleBars, {
        returnRate: 0.25,
        buyMode: "instant",
      }),
    ).toMatchObject({
      status: "complete",
      lines: [{}, { status: "stale", cost: 13_500 }, {}],
      total: 48_500,
    });
  });

  it("never costs more as the return rate rises, and never reduces the artifact", () => {
    const rates = fc.double({ min: 0, max: 1, maxExcluded: true, noNaN: true });
    fc.assert(
      fc.property(
        rates,
        rates,
        fc.constantFrom("instant" as const, "order" as const),
        (a, b, buyMode) => {
          const [low, high] = a < b ? [a, b] : [b, a];
          const atLow = materialCost(astralStaff, prices, {
            returnRate: low,
            buyMode,
          });
          const atHigh = materialCost(astralStaff, prices, {
            returnRate: high,
            buyMode,
          });

          expect(totalOf(atHigh)).toBeLessThanOrEqual(totalOf(atLow));
          expect(atHigh.lines[2]).toEqual(atLow.lines[2]);
        },
      ),
    );
  });
});
