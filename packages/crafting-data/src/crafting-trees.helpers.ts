import type { SpecializationOf } from "./crafting-tree.types.js";
import type { GameRecipe } from "./recipe.types.js";

// A tree is the item's shop subcategory, and a specialization is the item at
// every tier: T5_MAIN_SWORD@1 is the Broadsword in the Sword tree.
export function specializationOf({
  shopSubcategory,
  baseId,
}: Pick<GameRecipe, "shopSubcategory" | "baseId">): SpecializationOf {
  return {
    treeId: shopSubcategory,
    specializationId: baseId.replace(/^T\d+_/, ""),
  };
}

// "Adept's Broadsword 4.0" is the Broadsword specialization.
export function specializationName(itemName: string): string {
  return itemName.replace(/^\S+'s /, "").replace(/ \d\.\d$/, "");
}
