import type { Recipe } from "./evaluate.types.js";
import { emptyJournalId, fullJournalId } from "./journal.helpers.js";
import type { PricesNeeded } from "./prices-needed.types.js";

// With journals, the empty ones are bought like a material and the full ones
// sold like an item.
export function pricesNeeded(
  recipes: readonly Recipe[],
  { journals = false }: { journals?: boolean } = {},
): PricesNeeded {
  const products = new Set<string>();
  const materials = new Set<string>();
  for (const recipe of recipes) {
    products.add(recipe.itemId);
    if (journals && recipe.journal !== undefined) {
      materials.add(emptyJournalId(recipe.journal.id));
      products.add(fullJournalId(recipe.journal.id));
    }
    for (const alternative of [recipe, ...recipe.alternatives]) {
      for (const material of alternative.materials) {
        materials.add(material.id);
      }
    }
  }
  return { products: [...products], materials: [...materials] };
}
