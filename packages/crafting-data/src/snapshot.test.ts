import { describe, expect, it } from "vitest";

import { craftingLocations, recipes } from "./index.js";

function countBy(key: (recipe: (typeof recipes)[number]) => string) {
  const counts: Record<string, { items: number; recipes: number }> = {};
  const seen = new Set<string>();
  for (const recipe of recipes) {
    const count = (counts[key(recipe)] ??= { items: 0, recipes: 0 });
    count.recipes += 1;
    if (!seen.has(recipe.baseId)) {
      seen.add(recipe.baseId);
      count.items += 1;
    }
  }
  return counts;
}

describe("the generated data", () => {
  it("has the same number of items and recipes in each shop category", () => {
    expect(countBy(({ shopCategory }) => shopCategory)).toMatchSnapshot();
  });

  it("has the same number of items and recipes in each crafting category", () => {
    expect(
      countBy(({ craftingCategory }) => craftingCategory ?? "none"),
    ).toMatchSnapshot();
  });

  it.each([
    "T4_MAIN_SWORD",
    "T8_2H_BOW@4",
    "T6_MAIN_SCIMITAR_MORGANA@2",
    "T5_ARMOR_PLATE_SET1",
    "T6_HEAD_CLOTH_SET2@1",
    "T7_SHOES_LEATHER_SET3@3",
    "T4_OFF_SHIELD",
    "T4_ARMOR_LEATHER_ROYAL",
    "T5_2H_SHAPESHIFTER_SET1@1",
  ])("has the same recipe for %s", (itemId) => {
    expect(
      recipes.find((recipe) => recipe.itemId === itemId),
    ).toMatchSnapshot();
  });

  it("has the same crafting locations", () => {
    expect(craftingLocations).toMatchSnapshot();
  });
});
