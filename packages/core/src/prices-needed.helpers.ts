import type { Recipe } from "./evaluate.types.js";
import type { PricesNeeded } from "./prices-needed.types.js";

export function pricesNeeded(recipes: readonly Recipe[]): PricesNeeded {
  const products = new Set<string>();
  const materials = new Set<string>();
  for (const recipe of recipes) {
    products.add(recipe.itemId);
    for (const alternative of [recipe, ...recipe.alternatives]) {
      for (const material of alternative.materials) {
        materials.add(material.id);
      }
    }
  }
  return { products: [...products], materials: [...materials] };
}
