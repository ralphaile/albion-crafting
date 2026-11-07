import { describe, expect, it } from "vitest";

import type { CraftingPlace, EvaluateSettings } from "@aoc/core";

import { evaluateCrafts } from "./best-crafts.helpers";
import type { UsedItemPrices, UsedPrice } from "./best-crafts.types";
import { fillPlan, focusCandidates } from "./fill-plan.helpers";
import { NO_PLAN } from "./plan.constants";
import { RECIPES_BY_ID } from "./recipes.constants";
import { DEFAULT_ROUTE_CHOICE } from "./route.constants";

const island: CraftingPlace = {
  location: {
    id: "island",
    name: "Island",
    craftingBonus: 0,
    specialties: {},
    refiningBonus: 0,
    refiningSpecialties: {},
  },
};

const settings: EvaluateSettings = {
  focus: true,
  premium: true,
  buyMode: "instant",
  sellMode: "instant",
  stationFee: 0,
};

function fresh(value: number): UsedPrice {
  return {
    status: "fresh",
    value,
    observedAt: 0,
    ageMinutes: 10,
    origin: "api",
  };
}

function prices(itemId: string, value: number): UsedItemPrices {
  return {
    itemId,
    marketId: "Lymhurst",
    quality: 1,
    sellMin: fresh(value),
    buyMax: fresh(value),
  };
}

function crafts(swordPrice: number, focus = true) {
  const recipe = RECIPES_BY_ID.get("T4_MAIN_SWORD");
  if (recipe === undefined) {
    throw new Error("No broadsword recipe");
  }
  return evaluateCrafts(
    [recipe],
    island,
    { ...settings, focus },
    {
      materials: [prices("T4_METALBAR", 100), prices("T4_LEATHER", 50)],
      products: [prices("T4_MAIN_SWORD", swordPrice)],
    },
  );
}

describe("focusCandidates", () => {
  it("caps a craft at what sells in a day when that's lower", () => {
    const [craft] = crafts(5000);
    if (craft === undefined) {
      throw new Error("No craft");
    }

    expect(focusCandidates([craft], 100)[0]).toMatchObject({
      itemId: "T4_MAIN_SWORD",
      amountCrafted: 1,
      focusPerCraft: craft.focusCost,
      maxQuantity: 100,
    });
    expect(
      focusCandidates([{ ...craft, dailyVolume: 7.6 }], 100)[0]?.maxQuantity,
    ).toBe(7);
  });

  it("leaves out crafts without focus or a price", () => {
    expect(focusCandidates(crafts(5000, false), 100)).toEqual([]);
    expect(
      focusCandidates(
        evaluateCrafts(
          [...RECIPES_BY_ID.values()].slice(0, 1),
          island,
          settings,
          { materials: [], products: [] },
        ),
        100,
      ),
    ).toEqual([]);
  });
});

describe("fillPlan", () => {
  it("adds the crafts that fit the focus to the route's location, with focus", () => {
    const { plan, added } = fillPlan(
      NO_PLAN,
      DEFAULT_ROUTE_CHOICE,
      crafts(5000),
      { focus: 10_000, maxQuantity: 100 },
      { dailyBonuses: [{ category: "sword", bonus: 0.1 }] },
    );

    expect(added).toBe(1);
    expect(plan.locations).toEqual([
      expect.objectContaining({
        route: DEFAULT_ROUTE_CHOICE,
        entries: [
          expect.objectContaining({
            itemId: "T4_MAIN_SWORD",
            quantity: Math.floor(10_000 / (crafts(5000)[0]?.focusCost ?? 1)),
            focus: true,
            dailyBonus: 0.1,
          }),
        ],
      }),
    ]);
  });

  it("adds nothing when nothing fits the budget", () => {
    const { plan, added } = fillPlan(
      NO_PLAN,
      DEFAULT_ROUTE_CHOICE,
      crafts(5000),
      { focus: 10, maxQuantity: 100 },
      { dailyBonuses: [] },
    );

    expect(added).toBe(0);
    expect(plan).toBe(NO_PLAN);
  });
});
