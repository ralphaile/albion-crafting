import { describe, expect, it } from "vitest";

import type { CraftingPlace, EvaluateSettings } from "@aoc/core";

import { evaluateCrafts } from "./best-crafts.helpers";
import type { UsedItemPrices, UsedPrice } from "./best-crafts.types";
import { fillPlan, focusCandidates } from "./fill-plan.helpers";
import { MAX_PLAN_QUANTITY, NO_PLAN } from "./plan.constants";
import { addToPlan, newEntry } from "./plan.helpers";
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

  it("counts what a craft makes with the recipe it ranks, such as 8 stone blocks", () => {
    const recipe = RECIPES_BY_ID.get("T4_STONEBLOCK");
    if (recipe === undefined) {
      throw new Error("No stone block recipe");
    }
    const [craft] = evaluateCrafts([recipe], island, settings, {
      materials: [
        prices("T4_ROCK", 1000),
        prices("T1_FACTION_HIGHLAND_TOKEN_1", 1000),
        prices("T3_STONEBLOCK", 1000),
        prices("T4_ROCK_LEVEL1@1", 1000),
        prices("T4_ROCK_LEVEL2@2", 1000),
        prices("T4_ROCK_LEVEL3@3", 10),
      ],
      products: [prices("T4_STONEBLOCK", 2000)],
    });
    if (craft?.status !== "complete") {
      throw new Error("No priced stone block");
    }

    expect(craft.alternative).toBe(4);
    expect(focusCandidates([craft], 100)[0]).toMatchObject({
      amountCrafted: 8,
      profitPerCraft: craft.profit * 8,
    });
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

  it("fills only the room left under the plan's cap for an item it already has", () => {
    const full = addToPlan(
      NO_PLAN,
      DEFAULT_ROUTE_CHOICE,
      newEntry("T4_MAIN_SWORD", 0, MAX_PLAN_QUANTITY - 2, {
        focus: true,
        dailyBonuses: [],
      }),
    );

    const { plan } = fillPlan(
      full,
      DEFAULT_ROUTE_CHOICE,
      crafts(5000),
      { focus: 30_000, maxQuantity: 100 },
      { dailyBonuses: [] },
    );

    expect(plan.locations[0]?.entries[0]?.quantity).toBe(MAX_PLAN_QUANTITY);
  });

  it("adds a row of its own next to the same item without focus", () => {
    const withoutFocus = addToPlan(
      NO_PLAN,
      DEFAULT_ROUTE_CHOICE,
      newEntry("T4_MAIN_SWORD", 0, MAX_PLAN_QUANTITY, {
        focus: false,
        dailyBonuses: [],
      }),
    );

    const { plan } = fillPlan(
      withoutFocus,
      DEFAULT_ROUTE_CHOICE,
      crafts(5000),
      { focus: 10_000, maxQuantity: 100 },
      { dailyBonuses: [] },
    );

    expect(plan.locations[0]?.entries).toEqual([
      expect.objectContaining({ quantity: MAX_PLAN_QUANTITY, focus: false }),
      expect.objectContaining({ itemId: "T4_MAIN_SWORD", focus: true }),
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
