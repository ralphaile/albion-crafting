import type { SpecializationOf } from "./crafting-tree.types.js";
import type { GameRecipe } from "./recipe.types.js";

const WHOLE_SHOP_CATEGORIES = new Set(["bags", "capes"]);

// What an item is filtered and specialized by: its shop subcategory, such as
// "sword", except that bags and capes are one each, and gathering items go by
// their crafting category, gatherergear or tools. The game splits bags from
// satchels of insight, though one crafting tree makes both, and gathering's
// subcategories are the resources, such as "ore".
export function categoryOf({
  shopCategory,
  shopSubcategory,
  craftingCategory,
}: Pick<
  GameRecipe,
  "shopCategory" | "shopSubcategory" | "craftingCategory"
>): string {
  if (shopCategory === "gathering") {
    return craftingCategory ?? shopSubcategory;
  }
  return WHOLE_SHOP_CATEGORIES.has(shopCategory)
    ? shopCategory
    : shopSubcategory;
}

// A tree is the item's category, and a specialization is the item at every
// tier: T5_MAIN_SWORD@1 is the Broadsword in the Sword tree. In refining, each
// tier is a specialization of its own: T5_METALBAR@1 is the Titanium Steel Bar
// in the Metal bar tree.
export function specializationOf(
  recipe: Pick<
    GameRecipe,
    | "shopCategory"
    | "shopSubcategory"
    | "craftingCategory"
    | "baseId"
    | "refining"
  >,
): SpecializationOf {
  return {
    treeId: categoryOf(recipe),
    specializationId: recipe.refining
      ? recipe.baseId
      : recipe.baseId.replace(/^T\d+_/, ""),
  };
}

// "Adept's Broadsword 4.0" is the Broadsword specialization.
export function specializationName(itemName: string): string {
  return itemName.replace(/^\S+'s /, "").replace(/ \d\.\d$/, "");
}
