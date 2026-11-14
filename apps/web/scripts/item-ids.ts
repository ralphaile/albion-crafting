import { emptyJournalId, fullJournalId } from "@aoc/core";
import {
  consumableRecipes,
  recipes,
  refiningRecipes,
} from "@aoc/crafting-data";

// Every item a recipe makes or uses, alternatives included, and the empty and
// full journals it fills.
export function shownItemIds(): string[] {
  const itemIds = new Set<string>();
  for (const recipe of [...recipes, ...refiningRecipes, ...consumableRecipes]) {
    itemIds.add(recipe.itemId);
    if (recipe.journal) {
      itemIds.add(emptyJournalId(recipe.journal.id));
      itemIds.add(fullJournalId(recipe.journal.id));
    }
    if (recipe.upgrade) {
      itemIds.add(recipe.upgrade.id);
    }
    for (const { materials } of [recipe, ...recipe.alternatives]) {
      for (const { id } of materials) {
        itemIds.add(id);
      }
    }
  }
  return [...itemIds].sort();
}
