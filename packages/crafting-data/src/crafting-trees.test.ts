import { describe, expect, it } from "vitest";

import { craftingTrees, recipes, specializationOf } from "./index.js";

function tree(id: string) {
  return craftingTrees.find((candidate) => candidate.id === id);
}

describe("craftingTrees", () => {
  it("has a tree for each weapon type, armor piece and offhand type", () => {
    expect(craftingTrees).toHaveLength(29);
  });

  it("lists a tree's plain items, then its artifacts, each by name", () => {
    expect(tree("sword")?.specializations.map(({ name }) => name)).toEqual([
      "Broadsword",
      "Claymore",
      "Dual Swords",
      "Carving Sword",
      "Clarent Blade",
      "Galatine Pair",
      "Infinity Blade",
      "Kingmaker",
    ]);
  });

  it("names each specialization's lowest tier item, for its icon", () => {
    expect(tree("sword")?.specializations[0]).toEqual({
      id: "MAIN_SWORD",
      name: "Broadsword",
      itemId: "T4_MAIN_SWORD",
    });
  });

  it("leaves out royal items, which cost no focus", () => {
    expect(
      tree("plate_armor")?.specializations.map(({ id }) => id),
    ).not.toContain("ARMOR_PLATE_ROYAL");
  });

  it("has the specialization of every craft that costs focus", () => {
    const missing = recipes
      .filter(({ focus }) => focus > 0)
      .filter((recipe) => {
        const { treeId, specializationId } = specializationOf(recipe);
        return !tree(treeId)?.specializations.some(
          ({ id }) => id === specializationId,
        );
      })
      .map(({ itemId }) => itemId);

    expect(missing).toEqual([]);
  });
});

describe("specializationOf", () => {
  it("is the item at every tier and enchantment, in its shop subcategory", () => {
    expect(
      specializationOf({
        shopSubcategory: "sword",
        baseId: "T5_MAIN_SWORD",
      }),
    ).toEqual({ treeId: "sword", specializationId: "MAIN_SWORD" });
  });
});
