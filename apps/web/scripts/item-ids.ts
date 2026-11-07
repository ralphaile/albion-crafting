import { recipes, refiningRecipes } from "@aoc/crafting-data";

// Every item a recipe makes or uses, alternatives included.
export function shownItemIds(): string[] {
  const itemIds = new Set<string>();
  for (const recipe of [...recipes, ...refiningRecipes]) {
    itemIds.add(recipe.itemId);
    for (const { materials } of [recipe, ...recipe.alternatives]) {
      for (const { id } of materials) {
        itemIds.add(id);
      }
    }
  }
  return [...itemIds].sort();
}
