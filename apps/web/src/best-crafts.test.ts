import { describe, expect, it } from "vitest";

import type { CraftingPlace, EvaluateSettings } from "@aoc/core";
import type { GameRecipe } from "@aoc/crafting-data";
import type { ItemPrices, ObservedPrice } from "@aoc/market-prices";

import { evaluateCrafts } from "./best-crafts.helpers";
import type { CraftPrices } from "./best-crafts.types";

function recipe(
  itemId: string,
  craftingCategory: string,
  materials: GameRecipe["materials"],
): GameRecipe {
  return {
    itemId,
    baseId: itemId,
    tier: 4,
    enchant: 0,
    craftingCategory,
    shopCategory: "weapons",
    shopSubcategory: craftingCategory,
    isArtifact: false,
    focus: 1286,
    silver: 0,
    amountCrafted: 1,
    itemValue: 384,
    materials,
    alternatives: [],
  };
}

const broadsword = recipe("T4_MAIN_SWORD", "sword", [
  { id: "T4_METALBAR", count: 16, returnable: true },
  { id: "T4_LEATHER", count: 8, returnable: true },
]);
const axe = recipe("T4_MAIN_AXE", "axe", [
  { id: "T4_METALBAR", count: 16, returnable: true },
  { id: "T4_PLANKS", count: 8, returnable: true },
]);

function seen(value: number, ageMinutes: number): ObservedPrice {
  return {
    status: ageMinutes > 12 * 60 ? "stale" : "fresh",
    value,
    observedAt: Date.UTC(2026, 9, 26) - ageMinutes * 60_000,
    ageMinutes,
  };
}

const missing: ObservedPrice = { status: "missing" };

function prices(
  itemId: string,
  sellMin: ObservedPrice,
  buyMax: ObservedPrice,
): ItemPrices {
  return { itemId, marketId: "Lymhurst", quality: 1, sellMin, buyMax };
}

const island: CraftingPlace = {
  location: { id: "island", name: "Island", craftingBonus: 0, specialties: {} },
};
const lymhurst: CraftingPlace = {
  location: {
    id: "1000",
    name: "Lymhurst",
    craftingBonus: 0.18,
    specialties: { sword: 0.15 },
  },
};
const forestHideout: CraftingPlace = {
  hideout: {
    biome: { specialties: ["sword"] },
    mapQuality: { specialtyBonus: 0.26 },
    powerLevel: { generalBonus: 0.26, specialistBonus: 0.3 },
  },
};

const instantBuyAndSell: EvaluateSettings = {
  focus: false,
  premium: true,
  buyMode: "instant",
  sellMode: "instant",
  stationFee: 0,
};

const pricesOnHand: CraftPrices = {
  materials: [
    prices("T4_METALBAR", seen(100, 30), seen(90, 30)),
    prices("T4_LEATHER", seen(50, 200), seen(45, 5)),
  ],
  products: [prices("T4_MAIN_SWORD", seen(3200, 60), seen(3000, 10))],
};

describe("evaluateCrafts", () => {
  it("evaluates each recipe with the prices of its materials and of the item", () => {
    const [craft] = evaluateCrafts(
      [broadsword],
      island,
      instantBuyAndSell,
      pricesOnHand,
    );

    // 16 bars at 100 and 8 leather at 50 cost 2,000. Selling instantly at
    // 3,000, less the 4% premium tax, brings 2,880.
    expect(craft).toMatchObject({
      itemId: "T4_MAIN_SWORD",
      recipe: broadsword,
      status: "complete",
      profit: 880,
      margin: 0.44,
    });
  });

  it("marks a craft incomplete when a price it needs wasn't fetched", () => {
    const [craft] = evaluateCrafts(
      [axe],
      island,
      instantBuyAndSell,
      pricesOnHand,
    );

    expect(craft).toMatchObject({
      status: "incomplete",
      missingPrices: ["T4_PLANKS", "T4_MAIN_AXE"],
      itemPrice: missing,
    });
  });

  it.each([
    ["a city", lymhurst],
    ["a hideout", forestHideout],
  ])("says whether %s gives the item its specialty bonus", (_place, place) => {
    const crafts = evaluateCrafts(
      [broadsword, axe],
      place,
      instantBuyAndSell,
      pricesOnHand,
    );

    expect(crafts.map(({ specialty }) => specialty)).toEqual([true, false]);
  });

  it.each([
    ["instantly", "instant", seen(3000, 10)],
    ["with a sell order", "order", seen(3200, 60)],
  ] as const)(
    "gives the item's price it sells at %s",
    (_how, sellMode, expected) => {
      const [craft] = evaluateCrafts(
        [broadsword],
        island,
        { ...instantBuyAndSell, sellMode },
        pricesOnHand,
      );

      expect(craft?.itemPrice).toEqual(expected);
    },
  );

  it("gives the oldest of the material prices it buys at", () => {
    const [instant, order] = (["instant", "order"] as const).map(
      (buyMode) =>
        evaluateCrafts(
          [broadsword],
          island,
          { ...instantBuyAndSell, buyMode },
          pricesOnHand,
        )[0],
    );

    expect(instant?.oldestMaterialPrice).toEqual(seen(50, 200));
    expect(order?.oldestMaterialPrice).toEqual(seen(90, 30));
  });

  it("leaves out missing material prices when it finds the oldest", () => {
    const [craft] = evaluateCrafts([broadsword], island, instantBuyAndSell, {
      ...pricesOnHand,
      materials: [
        prices("T4_METALBAR", seen(100, 30), seen(90, 30)),
        prices("T4_LEATHER", missing, missing),
      ],
    });

    expect(craft?.oldestMaterialPrice).toEqual(seen(100, 30));
  });

  it("has no oldest material price when it has none of them", () => {
    const [craft] = evaluateCrafts([broadsword], island, instantBuyAndSell, {
      materials: [],
      products: pricesOnHand.products,
    });

    expect(craft?.oldestMaterialPrice).toBeUndefined();
  });
});
