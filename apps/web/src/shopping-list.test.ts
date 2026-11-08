import { describe, expect, it } from "vitest";

import { type EvaluatePrices, type OrderPrices, evaluatePlan } from "@aoc/core";

import { planLocations } from "./plan.helpers";
import type { CraftingPlan, PlanEntry } from "./plan.types";
import type { RouteChoice } from "./route.types";
import { shoppingList, shoppingListText } from "./shopping-list.helpers";

function route(place: RouteChoice["place"], buyMarketId: string): RouteChoice {
  return { place, buyMarketId, sellMarketId: buyMarketId };
}

const lymhurst = { kind: "location", locationId: "1000" } as const;
const forestHideout = {
  kind: "hideout",
  biomeId: "FOREST",
  quality: 6,
  level: 9,
} as const;

function entry(itemId: string, quantity: number): PlanEntry {
  return {
    id: `${itemId}-${String(quantity)}`,
    itemId,
    alternative: 0,
    quantity,
    focus: false,
    dailyBonus: 0,
  };
}

const fresh = (value: number): OrderPrices => ({
  sellMin: { status: "fresh", value },
  buyMax: { status: "fresh", value },
});

function pricesFor(marketId: string): EvaluatePrices {
  return {
    materials: new Map(
      marketId === "Martlock"
        ? [["T4_METALBAR", fresh(120)]]
        : [
            ["T4_METALBAR", fresh(100)],
            ["T4_LEATHER", fresh(50)],
            ["T4_PLANKS", fresh(80)],
          ],
    ),
    products: new Map(),
  };
}

function listFor(plan: CraftingPlan) {
  const result = evaluatePlan(
    planLocations(plan, ({ buyMarketId }) => pricesFor(buyMarketId)),
    { premium: true, buyMode: "instant", sellMode: "order", stationFee: 0 },
  );
  const expected = (location: number, itemId: string) =>
    (result.locations[location]?.entries ?? [])
      .flatMap(({ materials }) => materials)
      .filter((material) => material.itemId === itemId)
      .reduce((sum, { count }) => sum + count, 0);
  return { markets: shoppingList(plan, result), expected };
}

describe("shoppingList", () => {
  it("adds up the same material across entries and locations bought in the same market", () => {
    const { markets, expected } = listFor({
      locations: [
        {
          id: "city",
          route: route(lymhurst, "Lymhurst"),
          entries: [entry("T4_MAIN_SWORD", 10), entry("T4_2H_CLAYMORE", 3)],
        },
        {
          id: "hideout",
          route: route(forestHideout, "Lymhurst"),
          entries: [entry("T4_MAIN_SWORD", 5)],
        },
      ],
    });

    const bars = expected(0, "T4_METALBAR") + expected(1, "T4_METALBAR");
    expect(markets).toHaveLength(1);
    expect(markets[0]?.marketId).toBe("Lymhurst");
    expect(markets[0]?.lines.map(({ itemId }) => itemId)).toEqual([
      "T4_METALBAR",
      "T4_LEATHER",
    ]);
    expect(markets[0]?.lines[0]).toEqual({
      itemId: "T4_METALBAR",
      source: "sellMin",
      expected: bars,
      toBuy: Math.ceil(bars),
      unitPrice: 100,
      cost: Math.ceil(bars) * 100,
    });
    expect(markets[0]?.complete).toBe(true);
    expect(markets[0]?.total).toBe(
      (markets[0]?.lines[0]?.cost ?? 0) + (markets[0]?.lines[1]?.cost ?? 0),
    );
  });

  it("keeps each market apart, at its own prices", () => {
    const { markets } = listFor({
      locations: [
        {
          id: "city",
          route: route(lymhurst, "Lymhurst"),
          entries: [entry("T4_MAIN_SWORD", 1)],
        },
        {
          id: "hideout",
          route: route(forestHideout, "Martlock"),
          entries: [entry("T4_MAIN_SWORD", 1)],
        },
      ],
    });

    expect(markets.map(({ marketId }) => marketId)).toEqual([
      "Lymhurst",
      "Martlock",
    ]);
    expect(markets[1]?.lines[0]?.unitPrice).toBe(120);
  });

  it("lists a material with no price without a cost, and leaves the market's total incomplete", () => {
    const { markets } = listFor({
      locations: [
        {
          id: "hideout",
          route: route(forestHideout, "Martlock"),
          entries: [entry("T4_MAIN_SWORD", 1)],
        },
      ],
    });

    const leather = markets[0]?.lines.find(
      ({ itemId }) => itemId === "T4_LEATHER",
    );
    expect(leather).not.toHaveProperty("cost");
    expect(markets[0]?.complete).toBe(false);
    expect(markets[0]?.total).toBe(markets[0]?.lines[0]?.cost);
  });

  it("leaves out a market with nothing to buy", () => {
    const { markets } = listFor({
      locations: [
        { id: "empty", route: route(lymhurst, "Lymhurst"), entries: [] },
      ],
    });

    expect(markets).toEqual([]);
  });
});

describe("shoppingListText", () => {
  it("lists each market with its items, prices and total", () => {
    expect(
      shoppingListText([
        {
          marketId: "Lymhurst",
          lines: [
            {
              itemId: "T4_METALBAR",
              source: "sellMin",
              expected: 83.3,
              toBuy: 84,
              unitPrice: 100,
              cost: 8400,
            },
          ],
          total: 8400,
          complete: true,
        },
        {
          marketId: "Martlock",
          lines: [
            {
              itemId: "T4_LEATHER",
              source: "sellMin",
              expected: 4.2,
              toBuy: 5,
            },
          ],
          total: 0,
          complete: false,
        },
      ]),
    ).toBe(
      [
        "Lymhurst",
        "  84 × Steel Bar 4.0 at 100 = 8,400",
        "  Total: 8,400",
        "",
        "Martlock",
        "  5 × Worked Leather 4.0 (no price)",
        "  Total: 0 and the items with no price",
      ].join("\n"),
    );
  });
});
