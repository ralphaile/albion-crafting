import type { Dumps } from "./dumps.schema.ts";
import { marketId } from "./recipes.helpers.ts";
import type { GameRecipe } from "../src/recipe.types.ts";

type SimpleItem = Dumps["items.json"]["items"]["simpleitem"][number];

interface ItemValues {
  recipes: GameRecipe[];
  warnings: string[];
}

// `unvalued: "zero"` counts a material with no @itemvalue as 0 rather than
// leaving the recipe without a value. Food and potions take it: the game gives
// fish sauce an explicit 0, and the arcane extracts and beast remains they're
// enchanted with have none.
export function addItemValues(
  recipes: GameRecipe[],
  simpleItems: SimpleItem[],
  { unvalued: whenUnvalued = "warn" }: { unvalued?: "warn" | "zero" } = {},
): ItemValues {
  const simpleItemValues = new Map(
    simpleItems.flatMap((item) =>
      item["@itemvalue"] === undefined
        ? []
        : [
            [
              marketId(item["@uniquename"], item["@enchantmentlevel"] ?? 0),
              item["@itemvalue"],
            ] as const,
          ],
    ),
  );
  // An ingredient such as flour or butter has no @itemvalue, but its own
  // recipe gives it one.
  const simpleRecipes = new Map(
    simpleItems.flatMap((item) => {
      const [requirements] = item.craftingrequirements ?? [];
      return requirements === undefined
        ? []
        : [
            [
              marketId(item["@uniquename"], item["@enchantmentlevel"] ?? 0),
              requirements,
            ] as const,
          ];
    }),
  );
  const simpleValues = new Map<string, number | undefined>();
  const recipesById = new Map(recipes.map((recipe) => [recipe.itemId, recipe]));
  const itemValues = new Map<string, number | undefined>();
  const unvalued = new Map<string, string[]>();

  function itemValue(recipe: GameRecipe): number | undefined {
    if (!itemValues.has(recipe.itemId)) {
      const values = recipe.materials.map(({ id, count }) => {
        const value = materialValue(id, recipe.itemId);
        return value === undefined ? undefined : count * value;
      });
      itemValues.set(
        recipe.itemId,
        values.every((value) => value !== undefined)
          ? values.reduce((total, value) => total + value, 0) /
              recipe.amountCrafted
          : undefined,
      );
    }
    return itemValues.get(recipe.itemId);
  }

  function materialValue(id: string, usedBy: string): number | undefined {
    const ingredient = recipesById.get(id);
    if (ingredient) {
      return itemValue(ingredient);
    }
    const value = simpleItemValues.get(id) ?? simpleRecipeValue(id);
    if (value === undefined) {
      unvalued.set(id, [...(unvalued.get(id) ?? []), usedBy]);
      return whenUnvalued === "zero" ? 0 : undefined;
    }
    return value;
  }

  function simpleRecipeValue(id: string): number | undefined {
    const requirements = simpleRecipes.get(id);
    if (requirements === undefined) {
      return undefined;
    }
    // Bought only with faction points, as the hearts are: no material adds to
    // its value.
    if (requirements.craftresource === undefined) {
      return 0;
    }
    if (!simpleValues.has(id)) {
      // Marked first, so a recipe that leads back to itself has no value.
      simpleValues.set(id, undefined);
      const values = (requirements.craftresource ?? []).map((resource) => {
        const ingredient = marketId(
          resource["@uniquename"],
          resource["@enchantmentlevel"] ?? 0,
        );
        const value =
          simpleItemValues.get(ingredient) ?? simpleRecipeValue(ingredient);
        return value === undefined ? undefined : resource["@count"] * value;
      });
      simpleValues.set(
        id,
        values.length > 0 && values.every((value) => value !== undefined)
          ? values.reduce((total, value) => total + value, 0) /
              (requirements["@amountcrafted"] ?? 1)
          : undefined,
      );
    }
    return simpleValues.get(id);
  }

  const valued = recipes.map((recipe) => {
    const value = itemValue(recipe);
    return value === undefined ? recipe : { ...recipe, itemValue: value };
  });
  return {
    recipes: valued,
    warnings:
      whenUnvalued === "zero"
        ? []
        : [...unvalued].map(
            ([id, itemIds]) =>
              `No @itemvalue for ${id}, so these have no item value: ${itemIds.join(", ")}`,
          ),
  };
}
