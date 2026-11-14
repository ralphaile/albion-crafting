import { describe, expect, it } from "vitest";

import { atCraftCost, baseItems } from "./base-items.helpers";
import type { Craft, UsedItemPrices, UsedPrices } from "./best-crafts.types";
import { RECIPES_BY_ID } from "./recipes.constants";

function recipe(itemId: string) {
  const found = RECIPES_BY_ID.get(itemId);
  if (found === undefined) throw new Error(`No recipe for ${itemId}`);
  return found;
}

function seen(value: number): UsedItemPrices["sellMin"] {
  return {
    status: "fresh",
    value,
    observedAt: 0,
    ageMinutes: 30,
    origin: "api",
  };
}

function row(itemId: string, value: number): UsedItemPrices {
  return {
    itemId,
    marketId: "Martlock",
    quality: 1,
    sellMin: seen(value),
    buyMax: seen(value),
  };
}

describe("baseItems", () => {
  it("finds the cape a faction cape is made from, and each plain item a royal one can be", () => {
    expect(
      baseItems([
        recipe("T4_CAPEITEM_FW_MARTLOCK"),
        recipe("T4_HEAD_CLOTH_ROYAL"),
        recipe("T4_MAIN_SWORD"),
      ]).map(({ itemId }) => itemId),
    ).toEqual([
      "T4_CAPE",
      "T4_HEAD_CLOTH_SET1",
      "T4_HEAD_CLOTH_SET2",
      "T4_HEAD_CLOTH_SET3",
    ]);
  });
});

describe("atCraftCost", () => {
  const prices: UsedPrices = {
    materials: [row("T4_CAPE", 9000), row("T4_CLOTH", 100)],
    products: [],
  };
  const cape = {
    itemId: "T4_CAPE",
    recipe: recipe("T4_CAPE"),
    alternative: 0,
    status: "complete",
    materialCost: { status: "complete", total: 2000.4, lines: [] },
    stationFee: 50,
    silverCost: 0,
    oldestMaterialPrice: seen(100),
  } as unknown as Craft;

  it("prices a base item at its craft cost, as old as its oldest material", () => {
    const [capePrice, cloth] = atCraftCost(prices, [cape]).materials;

    expect(capePrice?.sellMin).toEqual({
      status: "fresh",
      value: 2050,
      observedAt: 0,
      ageMinutes: 30,
      origin: "api",
      crafted: true,
    });
    // With a buy order's 2.5% setup fee, it comes back to the craft cost.
    expect(capePrice?.buyMax).toMatchObject({ value: 2050 / 1.025 });
    expect(cloth).toEqual(row("T4_CLOTH", 100));
  });

  it("keeps the market price when the craft cost can't be worked out", () => {
    const incomplete = {
      ...cape,
      materialCost: { status: "incomplete", lines: [] },
    } as unknown as Craft;

    expect(atCraftCost(prices, [incomplete])).toEqual(prices);
  });
});
