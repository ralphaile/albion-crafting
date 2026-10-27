import type { Dumps } from "./dumps.schema.ts";
import { marketId } from "./recipes.helpers.ts";
import type { GameRecipe } from "../src/recipe.types.ts";

type SimpleItem = Dumps["items.json"]["items"]["simpleitem"][number];

interface ItemValues {
  recipes: GameRecipe[];
  warnings: string[];
}

export function addItemValues(
  recipes: GameRecipe[],
  simpleItems: SimpleItem[],
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
    const value = simpleItemValues.get(id);
    if (value === undefined) {
      unvalued.set(id, [...(unvalued.get(id) ?? []), usedBy]);
    }
    return value;
  }

  const valued = recipes.map((recipe) => {
    const value = itemValue(recipe);
    return value === undefined ? recipe : { ...recipe, itemValue: value };
  });
  return {
    recipes: valued,
    warnings: [...unvalued].map(
      ([id, itemIds]) =>
        `No @itemvalue for ${id}, so these have no item value: ${itemIds.join(", ")}`,
    ),
  };
}
