import type { CraftRecipe } from "./evaluate.js";

export interface PricesNeeded {
  products: string[];
  materials: string[];
}

export function pricesNeeded(recipes: readonly CraftRecipe[]): PricesNeeded {
  const products = new Set<string>();
  const materials = new Set<string>();
  for (const recipe of recipes) {
    products.add(recipe.itemId);
    for (const variant of [recipe, ...recipe.alternatives]) {
      for (const resource of variant.resources) {
        materials.add(resource.id);
      }
    }
  }
  return { products: [...products], materials: [...materials] };
}
