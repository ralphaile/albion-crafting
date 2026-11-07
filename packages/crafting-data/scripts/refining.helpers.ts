import type { Dumps } from "./dumps.schema.ts";
import { marketId, toAlternative } from "./recipes.helpers.ts";
import { REFINED_SUBCATEGORIES } from "./refining.constants.ts";
import type { GameRecipe } from "../src/recipe.types.ts";

type Items = Dumps["items.json"]["items"];
type SimpleItem = Items["simpleitem"][number];

const MIN_TIER = 2;
const MAX_TIER = 8;

export function extractRefiningRecipes(items: Items): GameRecipe[] {
  return items.simpleitem
    .flatMap(toRecipe)
    .sort((a, b) => (a.itemId < b.itemId ? -1 : 1));
}

// Each enchantment level is an item of its own, such as T5_METALBAR_LEVEL1,
// and its specialization is the plain item's. Its first recipe is the
// default, and the others, with a faction token or enchanted stone, are kept
// in `alternatives`.
function toRecipe(item: SimpleItem): GameRecipe[] {
  const subcategory = item["@shopsubcategory2"];
  const requirements = item.craftingrequirements ?? [];
  if (!requirements.every(hasFocus)) {
    return [];
  }
  const [recipe, ...alternatives] = requirements.map(toAlternative);
  if (
    item["@shopsubcategory1"] !== "refinedresources" ||
    subcategory === undefined ||
    !REFINED_SUBCATEGORIES.has(subcategory) ||
    item["@tier"] < MIN_TIER ||
    item["@tier"] > MAX_TIER ||
    recipe === undefined
  ) {
    return [];
  }
  const enchant = item["@enchantmentlevel"] ?? 0;
  return [
    {
      itemId: marketId(item["@uniquename"], enchant),
      baseId: item["@uniquename"].replace(/_LEVEL\d+$/, ""),
      tier: item["@tier"],
      enchant,
      refining: true,
      ...(item["@craftingcategory"] === undefined
        ? {}
        : { craftingCategory: item["@craftingcategory"] }),
      shopCategory: item["@shopcategory"] ?? "crafting",
      shopSubcategory: subcategory,
      isArtifact: false,
      ...recipe,
      alternatives,
      ...(item["@itemvalue"] === undefined
        ? {}
        : { itemValue: item["@itemvalue"] }),
    },
  ];
}

function hasFocus<
  Requirements extends { "@craftingfocus"?: number | undefined },
>(
  requirements: Requirements,
): requirements is Requirements & { "@craftingfocus": number } {
  return requirements["@craftingfocus"] !== undefined;
}
