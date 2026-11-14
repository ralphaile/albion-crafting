import { CONSUMABLE_SUBCATEGORIES } from "./consumables.constants.ts";
import type { Dumps } from "./dumps.schema.ts";
import { toRecipes } from "./recipes.helpers.ts";
import type { GameRecipe } from "../src/recipe.types.ts";

type Items = Dumps["items.json"]["items"];
type ConsumableItem = Items["consumableitem"][number];

const MIN_TIER = 1;
const MAX_TIER = 8;

// Food and potions, each enchantment level a recipe of its own, such as
// T4_POTION_HEAL@1. A recipe makes several at once, such as 5 potions or 10
// stews. Event items, which have no crafting category, are left out.
export function extractConsumableRecipes(items: Items): GameRecipe[] {
  return items.consumableitem
    .filter(isIncluded)
    .flatMap(toRecipes)
    .sort((a, b) => (a.itemId < b.itemId ? -1 : 1));
}

function isIncluded(item: ConsumableItem): boolean {
  return (
    item["@shopcategory"] === "consumables" &&
    CONSUMABLE_SUBCATEGORIES.has(item["@shopsubcategory1"]) &&
    item["@craftingcategory"] !== undefined &&
    item["@tier"] >= MIN_TIER &&
    item["@tier"] <= MAX_TIER &&
    item["@showinmarketplace"] !== false
  );
}
