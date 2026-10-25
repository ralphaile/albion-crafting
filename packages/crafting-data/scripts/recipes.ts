import type { Dumps } from "./validate.ts";
import type { Alternative, Recipe, Resource } from "../src/recipe.ts";

type Items = Dumps["items.json"]["items"];
type GearItem = Items["weapon"][number];
type CraftingRequirements = NonNullable<
  GearItem["craftingrequirements"]
>[number];
type CraftResource = NonNullable<CraftingRequirements["craftresource"]>[number];

export const SHOP_CATEGORIES = new Set([
  "weapons",
  "armors",
  "head",
  "shoes",
  "offhands",
]);
const MIN_TIER = 4;
const MAX_TIER = 8;
const UNRELEASED_SUFFIX = "_PROTOTYPE";

export function extractRecipes(items: Items): Recipe[] {
  return [
    ...items.weapon,
    ...items.transformationweapon,
    ...items.equipmentitem,
  ]
    .filter(isIncluded)
    .flatMap(toRecipes)
    .sort((a, b) => (a.itemId < b.itemId ? -1 : 1));
}

function isIncluded(item: GearItem): boolean {
  return (
    SHOP_CATEGORIES.has(item["@shopcategory"]) &&
    item["@tier"] >= MIN_TIER &&
    item["@tier"] <= MAX_TIER &&
    item["@showinmarketplace"] !== false &&
    !item["@uniquename"].endsWith(UNRELEASED_SUFFIX)
  );
}

function toRecipes(item: GearItem): Recipe[] {
  const levels = [
    { enchant: 0, requirements: item.craftingrequirements ?? [] },
    ...(item.enchantments?.enchantment ?? []).map((enchantment) => ({
      enchant: enchantment["@enchantmentlevel"],
      requirements: enchantment.craftingrequirements,
    })),
  ];
  return levels.flatMap(({ enchant, requirements }) => {
    const [recipe, ...alternatives] = requirements.map(toAlternative);
    if (!recipe) {
      return [];
    }
    return {
      itemId: marketId(item["@uniquename"], enchant),
      baseId: item["@uniquename"],
      tier: item["@tier"],
      enchant,
      ...(item["@craftingcategory"] === undefined
        ? {}
        : { craftingCategory: item["@craftingcategory"] }),
      shopCategory: item["@shopcategory"],
      shopSubcategory: item["@shopsubcategory1"],
      isArtifact: recipe.resources.some(({ id }) => id.includes("_ARTEFACT_")),
      ...recipe,
      alternatives,
    };
  });
}

function toAlternative(requirements: CraftingRequirements): Alternative {
  return {
    focus: requirements["@craftingfocus"],
    silver: requirements["@silver"] ?? 0,
    amountCrafted: requirements["@amountcrafted"] ?? 1,
    resources: (requirements.craftresource ?? []).map(toResource),
  };
}

function toResource(resource: CraftResource): Resource {
  return {
    id: marketId(resource["@uniquename"], resource["@enchantmentlevel"] ?? 0),
    count: resource["@count"],
    returnable: resource["@maxreturnamount"] !== 0,
  };
}

export function marketId(id: string, enchant: number): string {
  return enchant > 0 ? `${id}@${String(enchant)}` : id;
}
