import { describe, expect, it } from "vitest";

import type { CraftingPlace, EvaluateSettings } from "@aoc/core";
import type { GameRecipe } from "@aoc/crafting-data";

import { evaluateCrafts } from "./best-crafts.helpers";
import type { UsedItemPrices, UsedPrices } from "./best-crafts.types";
import type { ManualPriceKey } from "./manual-prices.types";
import { missingPrices } from "./missing-prices.helpers";

function recipe(itemId: string, materials: string[]): GameRecipe {
  return {
    itemId,
    baseId: itemId,
    tier: 4,
    enchant: 0,
    craftingCategory: "sword",
    shopCategory: "weapons",
    shopSubcategory: "sword",
    isArtifact: false,
    focus: 1286,
    silver: 0,
    amountCrafted: 1,
    itemValue: 384,
    materials: materials.map((id) => ({ id, count: 8, returnable: true })),
    alternatives: [],
  };
}

const broadsword = recipe("T4_MAIN_SWORD", ["T4_METALBAR", "T4_LEATHER"]);
const axe = recipe("T4_MAIN_AXE", ["T4_METALBAR", "T4_PLANKS"]);

const island: CraftingPlace = {
  location: { id: "island", name: "Island", craftingBonus: 0, specialties: {} },
};

const instantBuyAndSell: EvaluateSettings = {
  focus: false,
  premium: true,
  buyMode: "instant",
  sellMode: "instant",
  stationFee: 0,
};

const at = {
  region: "west",
  buyMarketId: "Martlock",
  sellMarketId: "Arthurs Rest Smugglers Network",
  quality: 1,
} as const;

function priced(itemId: string, marketId: string): UsedItemPrices {
  const price = {
    status: "fresh",
    value: 100,
    observedAt: 0,
    ageMinutes: 30,
    origin: "api",
  } as const;
  return { itemId, marketId, quality: 1, sellMin: price, buyMax: price };
}

function key(
  itemId: string,
  marketId: string,
  source: ManualPriceKey["source"],
): ManualPriceKey {
  return { region: "west", itemId, marketId, quality: 1, source };
}

function missingFor(
  prices: UsedPrices,
  settings: EvaluateSettings = instantBuyAndSell,
) {
  return missingPrices(
    evaluateCrafts([broadsword, axe], island, settings, prices),
    at,
  );
}

describe("missingPrices", () => {
  it("lists each missing price once, the one the most crafts need first", () => {
    const missing = missingFor({
      materials: [priced("T4_LEATHER", "Martlock")],
      products: [],
    });

    expect(missing).toEqual([
      { key: key("T4_METALBAR", "Martlock", "sellMin"), craftCount: 2 },
      {
        key: key("T4_MAIN_SWORD", at.sellMarketId, "buyMax"),
        craftCount: 1,
      },
      { key: key("T4_PLANKS", "Martlock", "sellMin"), craftCount: 1 },
      { key: key("T4_MAIN_AXE", at.sellMarketId, "buyMax"), craftCount: 1 },
    ]);
  });

  it("asks for the order the settings buy and sell with", () => {
    const missing = missingFor(
      {
        materials: [priced("T4_METALBAR", "Martlock")],
        products: [priced("T4_MAIN_AXE", at.sellMarketId)],
      },
      { ...instantBuyAndSell, buyMode: "order", sellMode: "order" },
    );

    expect(missing.map(({ key }) => key)).toEqual([
      key("T4_LEATHER", "Martlock", "buyMax"),
      key("T4_MAIN_SWORD", at.sellMarketId, "sellMin"),
      key("T4_PLANKS", "Martlock", "buyMax"),
    ]);
  });

  it("lists nothing when every craft has its prices", () => {
    const missing = missingFor({
      materials: ["T4_METALBAR", "T4_LEATHER", "T4_PLANKS"].map((itemId) =>
        priced(itemId, "Martlock"),
      ),
      products: ["T4_MAIN_SWORD", "T4_MAIN_AXE"].map((itemId) =>
        priced(itemId, at.sellMarketId),
      ),
    });

    expect(missing).toEqual([]);
  });
});
