import { describe, expect, it } from "vitest";

import {
  iconUrl,
  itemName,
  type Recipe,
  recipes,
  searchItems,
} from "./index.js";

describe("recipes", () => {
  it.each<[string, Recipe]>([
    [
      "Expert's Broadsword",
      {
        itemId: "T5_MAIN_SWORD",
        baseId: "T5_MAIN_SWORD",
        tier: 5,
        enchant: 0,
        craftingCategory: "sword",
        shopCategory: "weapons",
        shopSubcategory: "sword",
        isArtifact: false,
        focus: 2251,
        silver: 0,
        amountCrafted: 1,
        resources: [
          { id: "T5_METALBAR", count: 16, returnable: true },
          { id: "T5_LEATHER", count: 8, returnable: true },
        ],
        alternatives: [],
        itemValue: 768,
      },
    ],
    [
      "Expert's Broadsword .1",
      {
        itemId: "T5_MAIN_SWORD@1",
        baseId: "T5_MAIN_SWORD",
        tier: 5,
        enchant: 1,
        craftingCategory: "sword",
        shopCategory: "weapons",
        shopSubcategory: "sword",
        isArtifact: false,
        focus: 3939,
        silver: 0,
        amountCrafted: 1,
        resources: [
          { id: "T5_METALBAR_LEVEL1@1", count: 16, returnable: true },
          { id: "T5_LEATHER_LEVEL1@1", count: 8, returnable: true },
        ],
        alternatives: [],
        itemValue: 1536,
      },
    ],
    [
      "Master's Clarent Blade, an artifact weapon",
      {
        itemId: "T6_MAIN_SCIMITAR_MORGANA",
        baseId: "T6_MAIN_SCIMITAR_MORGANA",
        tier: 6,
        enchant: 0,
        craftingCategory: "sword",
        shopCategory: "weapons",
        shopSubcategory: "sword",
        isArtifact: true,
        focus: 3939,
        silver: 0,
        amountCrafted: 1,
        resources: [
          { id: "T6_METALBAR", count: 16, returnable: true },
          { id: "T6_LEATHER", count: 8, returnable: true },
          {
            id: "T6_ARTEFACT_MAIN_SCIMITAR_MORGANA",
            count: 1,
            returnable: false,
          },
        ],
        alternatives: [
          {
            focus: 3939,
            silver: 0,
            amountCrafted: 1,
            resources: [
              { id: "T6_METALBAR", count: 16, returnable: true },
              { id: "T6_LEATHER", count: 8, returnable: true },
              { id: "T6_ARTEFACT_TOKEN_FAVOR_1", count: 1, returnable: false },
            ],
          },
        ],
        itemValue: 1920,
      },
    ],
  ])("has the known recipe for the %s", (_, expected) => {
    expect(recipes.find((recipe) => recipe.itemId === expected.itemId)).toEqual(
      expected,
    );
  });

  it("values the Adept's Royal Jacket at 320, as the game does", () => {
    expect(
      recipes.find((recipe) => recipe.itemId === "T4_ARMOR_LEATHER_ROYAL")
        ?.itemValue,
    ).toBe(320);
  });
});

describe("itemName", () => {
  it.each([
    ["T5_MAIN_SWORD", "Expert's Broadsword 5.0"],
    ["T5_MAIN_SWORD@1", "Expert's Broadsword 5.1"],
    ["T5_METALBAR_LEVEL1@1", "Uncommon Titanium Steel Bar 5.1"],
  ])("names %s %s", (id, name) => {
    expect(itemName(id)).toBe(name);
  });

  it("falls back to the ID for an item it doesn't know", () => {
    expect(itemName("T4_NOT_AN_ITEM")).toBe("T4_NOT_AN_ITEM");
  });
});

describe("iconUrl", () => {
  it("points at the item's 64-pixel icon on the Albion render service", () => {
    expect(iconUrl("T5_MAIN_SWORD@1")).toBe(
      "https://render.albiononline.com/v1/item/T5_MAIN_SWORD@1.png?quality=1&size=64",
    );
  });
});

describe("searchItems", () => {
  it("finds every enchantment level of the Expert's Broadsword", () => {
    expect(searchItems("expert broadsword")).toEqual([
      "T5_MAIN_SWORD",
      "T5_MAIN_SWORD@1",
      "T5_MAIN_SWORD@2",
      "T5_MAIN_SWORD@3",
      "T5_MAIN_SWORD@4",
    ]);
  });

  it("narrows down to one item with its tier.enchant", () => {
    expect(searchItems("Broadsword 5.1")).toEqual(["T5_MAIN_SWORD@1"]);
  });

  it("leaves out the materials", () => {
    expect(searchItems("titanium steel bar")).toEqual([]);
  });
});
