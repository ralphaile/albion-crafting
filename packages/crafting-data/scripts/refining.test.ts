import { describe, expect, it } from "vitest";

import type { Dumps } from "./dumps.schema.ts";
import { extractRefiningRecipes } from "./refining.helpers.ts";

type Items = Dumps["items.json"]["items"];
type SimpleItem = Items["simpleitem"][number];

function bar(changes: Partial<SimpleItem> = {}): SimpleItem {
  return {
    "@uniquename": "T5_METALBAR",
    "@tier": 5,
    "@itemvalue": 32,
    "@shopcategory": "crafting",
    "@shopsubcategory1": "refinedresources",
    "@shopsubcategory2": "metalbars",
    "@craftingcategory": "ore",
    craftingrequirements: [
      {
        "@craftingfocus": 94,
        "@silver": 0,
        "@amountcrafted": 1,
        craftresource: [
          { "@uniquename": "T5_ORE", "@count": 3 },
          { "@uniquename": "T4_METALBAR", "@count": 1 },
        ],
      },
      {
        "@craftingfocus": 94,
        craftresource: [
          { "@uniquename": "T5_ORE", "@count": 2 },
          { "@uniquename": "T1_FACTION_MOUNTAIN_TOKEN_1", "@count": 1 },
          { "@uniquename": "T4_METALBAR", "@count": 1 },
        ],
      },
    ],
    ...changes,
  };
}

function refined(...simpleitem: SimpleItem[]) {
  return extractRefiningRecipes({
    weapon: [],
    transformationweapon: [],
    equipmentitem: [],
    simpleitem,
  });
}

describe("extractRefiningRecipes", () => {
  it("makes a refining recipe with the item's own value, and the faction token recipe as an alternative", () => {
    expect(refined(bar())).toEqual([
      {
        itemId: "T5_METALBAR",
        baseId: "T5_METALBAR",
        tier: 5,
        enchant: 0,
        refining: true,
        craftingCategory: "ore",
        shopCategory: "crafting",
        shopSubcategory: "metalbars",
        isArtifact: false,
        focus: 94,
        silver: 0,
        amountCrafted: 1,
        materials: [
          { id: "T5_ORE", count: 3, returnable: true },
          { id: "T4_METALBAR", count: 1, returnable: true },
        ],
        alternatives: [
          {
            focus: 94,
            silver: 0,
            amountCrafted: 1,
            materials: [
              { id: "T5_ORE", count: 2, returnable: true },
              { id: "T1_FACTION_MOUNTAIN_TOKEN_1", count: 1, returnable: true },
              { id: "T4_METALBAR", count: 1, returnable: true },
            ],
          },
        ],
        itemValue: 32,
      },
    ]);
  });

  it("gives an enchanted bar its market ID and the plain bar as its base", () => {
    const [recipe] = refined(
      bar({ "@uniquename": "T5_METALBAR_LEVEL1", "@enchantmentlevel": 1 }),
    );

    expect(recipe).toMatchObject({
      itemId: "T5_METALBAR_LEVEL1@1",
      baseId: "T5_METALBAR",
      enchant: 1,
    });
  });

  it.each<[string, Partial<SimpleItem>]>([
    ["a T1 item", { "@tier": 1 }],
    ["an item that isn't refined", { "@shopsubcategory1": "rawresources" }],
    ["a refined item it doesn't cover", { "@shopsubcategory2": "fabric" }],
    ["an item with no recipe", { craftingrequirements: [] }],
    [
      "an item made without focus",
      {
        craftingrequirements: [
          { craftresource: [{ "@uniquename": "T5_ORE", "@count": 3 }] },
        ],
      },
    ],
  ])("leaves out %s", (_, changes) => {
    expect(refined(bar(changes))).toEqual([]);
  });
});
