import { describe, expect, it } from "vitest";

import { extractConsumableRecipes } from "./consumables.helpers.ts";
import type { Dumps } from "./dumps.schema.ts";

type Items = Dumps["items.json"]["items"];
type ConsumableItem = Items["consumableitem"][number];

function potion(changes: Partial<ConsumableItem> = {}): ConsumableItem {
  return {
    "@uniquename": "T4_POTION_HEAL",
    "@tier": 4,
    "@shopcategory": "consumables",
    "@shopsubcategory1": "potions",
    "@craftingcategory": "potion",
    craftingrequirements: [
      {
        "@craftingfocus": 210,
        "@amountcrafted": 5,
        craftresource: [
          { "@uniquename": "T4_BURDOCK", "@count": 24 },
          { "@uniquename": "T3_EGG", "@count": 6 },
        ],
      },
    ],
    enchantments: {
      enchantment: [
        {
          "@enchantmentlevel": 1,
          craftingrequirements: [
            {
              "@craftingfocus": 277,
              "@amountcrafted": 5,
              craftresource: [
                { "@uniquename": "T4_BURDOCK", "@count": 24 },
                { "@uniquename": "T3_EGG", "@count": 6 },
                { "@uniquename": "T1_ALCHEMY_EXTRACT_LEVEL1", "@count": 15 },
              ],
            },
          ],
        },
      ],
    },
    ...changes,
  };
}

function consumables(...consumableitem: ConsumableItem[]) {
  return extractConsumableRecipes({
    weapon: [],
    transformationweapon: [],
    trackingitem: [],
    equipmentitem: [],
    simpleitem: [],
    journalitem: [],
    consumableitem,
  });
}

describe("extractConsumableRecipes", () => {
  it("makes a recipe per enchantment level, each making several at once", () => {
    expect(consumables(potion())).toEqual([
      {
        itemId: "T4_POTION_HEAL",
        baseId: "T4_POTION_HEAL",
        tier: 4,
        enchant: 0,
        craftingCategory: "potion",
        shopCategory: "consumables",
        shopSubcategory: "potions",
        isArtifact: false,
        focus: 210,
        silver: 0,
        amountCrafted: 5,
        materials: [
          { id: "T4_BURDOCK", count: 24, returnable: true },
          { id: "T3_EGG", count: 6, returnable: true },
        ],
        alternatives: [],
      },
      expect.objectContaining({
        itemId: "T4_POTION_HEAL@1",
        enchant: 1,
        materials: [
          { id: "T4_BURDOCK", count: 24, returnable: true },
          { id: "T3_EGG", count: 6, returnable: true },
          { id: "T1_ALCHEMY_EXTRACT_LEVEL1", count: 15, returnable: true },
        ],
      }),
    ]);
  });

  it("takes T1 food, below gear's lowest tier", () => {
    expect(
      consumables(
        potion({
          "@uniquename": "T1_MEAL_SOUP",
          "@tier": 1,
          "@shopsubcategory1": "food",
          "@craftingcategory": "food",
          enchantments: undefined,
        }),
      ).map(({ itemId }) => itemId),
    ).toEqual(["T1_MEAL_SOUP"]);
  });

  it("leaves out what the market doesn't show and other consumables", () => {
    expect(
      consumables(
        potion({ "@showinmarketplace": false }),
        potion({ "@shopsubcategory1": "other" }),
      ),
    ).toEqual([]);
  });
});
