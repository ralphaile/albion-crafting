import { describe, expect, it } from "vitest";

import { type GeneratedData, diffData } from "./diff.ts";
import type { GameRecipe } from "../src/recipe.ts";

function recipe(itemId: string, changes: Partial<GameRecipe> = {}): GameRecipe {
  const [baseId = itemId, enchant = "0"] = itemId.split("@");
  return {
    itemId,
    baseId,
    tier: 4,
    enchant: Number(enchant),
    craftingCategory: "sword",
    shopCategory: "weapons",
    shopSubcategory: "sword",
    isArtifact: false,
    focus: 1286,
    silver: 0,
    amountCrafted: 1,
    materials: [
      { id: "T4_METALBAR", count: 16, returnable: true },
      { id: "T4_LEATHER", count: 8, returnable: true },
    ],
    alternatives: [],
    itemValue: 384,
    ...changes,
  };
}

const data: GeneratedData = {
  recipes: [recipe("T4_MAIN_SWORD"), recipe("T4_MAIN_SWORD@1")],
  items: [
    { id: "T4_MAIN_AXE", name: "Adept's Battleaxe 4.0", crafted: true },
    { id: "T4_MAIN_SWORD", name: "Adept's Broadsword 4.0", crafted: true },
    { id: "T4_MAIN_SWORD@1", name: "Adept's Broadsword 4.1", crafted: true },
  ],
  locations: [
    {
      id: "0000",
      name: "Thetford",
      craftingBonus: 0.18,
      specialties: { mace: 0.15 },
    },
  ],
  hideouts: {
    biomes: [
      {
        id: "SWAMP",
        name: "Swamp",
        cityId: "0000",
        specialties: ["mace", "firestaff"],
      },
    ],
    mapQualities: [{ quality: 1, specialtyBonus: 0.01 }],
    powerLevels: [{ level: 2, generalBonus: 0.06, specialistBonus: 0.0375 }],
    refiningBonus: 0.15,
  },
};

describe("diffData", () => {
  it("finds nothing when the data is the same", () => {
    expect(diffData(data, data)).toEqual({
      totals: {
        items: { added: 0, removed: 0 },
        recipes: { added: 0, removed: 0, changed: 0 },
        bonuses: { added: 0, removed: 0, changed: 0 },
      },
      bonuses: [],
      removedItems: [],
      addedItems: [],
      recipes: [],
    });
  });

  it("lists the items added and removed, and only counts their recipes", () => {
    const diff = diffData(data, {
      ...data,
      recipes: [recipe("T4_MAIN_AXE"), recipe("T4_MAIN_AXE@1")],
    });

    expect(diff.removedItems).toEqual([
      "`T4_MAIN_SWORD` Adept's Broadsword 4.0",
    ]);
    expect(diff.addedItems).toEqual(["`T4_MAIN_AXE` Adept's Battleaxe 4.0"]);
    expect(diff.recipes).toEqual([]);
    expect(diff.totals.items).toEqual({ added: 1, removed: 1 });
    expect(diff.totals.recipes).toEqual({ added: 2, removed: 2, changed: 0 });
  });

  it("describes what changed in a recipe", () => {
    const changed = recipe("T4_MAIN_SWORD", {
      focus: 1200,
      materials: [
        { id: "T4_METALBAR", count: 20, returnable: true },
        { id: "T4_CLOTH", count: 8, returnable: true },
      ],
    });
    delete changed.itemValue;
    delete changed.craftingCategory;

    const diff = diffData(data, {
      ...data,
      recipes: [changed, recipe("T4_MAIN_SWORD@1")],
    });

    expect(diff.recipes).toEqual([
      "`T4_MAIN_SWORD` Adept's Broadsword 4.0: focus 1286 → 1200, `T4_METALBAR` 16 → 20, `T4_LEATHER` 8 → none, item value 384 → none, crafting category sword → none, `T4_CLOTH` none → 8",
    ]);
    expect(diff.totals.recipes).toEqual({ added: 0, removed: 0, changed: 1 });
  });

  it("describes what changed in an alternative recipe", () => {
    const withToken = (count: number) =>
      recipe("T4_MAIN_SWORD", {
        isArtifact: true,
        alternatives: [
          {
            focus: 1286,
            silver: 0,
            amountCrafted: 1,
            materials: [
              { id: "T4_ARTEFACT_TOKEN_FAVOR_1", count, returnable: false },
            ],
          },
        ],
      });

    expect(
      diffData(
        { ...data, recipes: [withToken(1)] },
        { ...data, recipes: [withToken(2)] },
      ).recipes,
    ).toEqual([
      "`T4_MAIN_SWORD` Adept's Broadsword 4.0: alternative 1, `T4_ARTEFACT_TOKEN_FAVOR_1` 1 (not returned) → 2 (not returned)",
    ]);
  });

  it("lists a recipe added to or removed from an item that stays", () => {
    const diff = diffData(data, {
      ...data,
      recipes: [recipe("T4_MAIN_SWORD"), recipe("T4_MAIN_SWORD@2")],
    });

    expect(diff.recipes).toEqual([
      "`T4_MAIN_SWORD@2`: new recipe",
      "`T4_MAIN_SWORD@1` Adept's Broadsword 4.1: recipe removed",
    ]);
    expect(diff.totals.items).toEqual({ added: 0, removed: 0 });
    expect(diff.totals.recipes).toEqual({ added: 1, removed: 1, changed: 0 });
  });

  it("lists each crafting bonus that changed", () => {
    const diff = diffData(data, {
      ...data,
      locations: [
        {
          id: "0000",
          name: "Thetford",
          craftingBonus: 0.18,
          specialties: { mace: 0.2, firestaff: 0.15 },
        },
      ],
      hideouts: {
        biomes: [
          { id: "SWAMP", name: "Swamp", cityId: "1000", specialties: ["mace"] },
        ],
        mapQualities: [{ quality: 1, specialtyBonus: 0.02 }],
        powerLevels: [],
        refiningBonus: 0.15,
      },
    });

    expect(diff.bonuses).toEqual([
      "Thetford, mace: 0.15 → 0.2",
      "Swamp biome, royal city: Thetford → 1000",
      "Swamp biome, categories: mace, firestaff → mace",
      "Hideout map quality Q1: 0.01 → 0.02",
      "Hideout power level 2, general: 0.06 → none",
      "Hideout power level 2, specialist: 0.0375 → none",
      "Thetford, firestaff: none → 0.15",
    ]);
    expect(diff.totals.bonuses).toEqual({ added: 1, removed: 2, changed: 4 });
  });
});
