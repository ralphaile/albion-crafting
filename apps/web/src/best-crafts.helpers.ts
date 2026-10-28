import {
  type CraftingPlace,
  evaluate,
  type EvaluateSettings,
  hasSpecialty,
} from "@aoc/core";
import type { GameRecipe } from "@aoc/crafting-data";
import type { ItemPrices, ObservedPrice } from "@aoc/market-prices";

import type { Craft, CraftPrices } from "./best-crafts.types";

const MISSING: ObservedPrice = { status: "missing" };

export function evaluateCrafts(
  recipes: readonly GameRecipe[],
  place: CraftingPlace,
  settings: EvaluateSettings,
  prices: CraftPrices,
): Craft[] {
  const materials = byItem(prices.materials);
  const products = byItem(prices.products);

  return recipes.map((recipe) => {
    const evaluation = evaluate(recipe, place, settings, {
      materials,
      products,
    });
    const materialPrices = new Map(
      evaluation.materialCost.lines.map(({ itemId, source }) => [
        itemId,
        materials.get(itemId)?.[source] ?? MISSING,
      ]),
    );
    return {
      ...evaluation,
      recipe,
      specialty: hasSpecialty(place, recipe.craftingCategory),
      itemPrice:
        products.get(recipe.itemId)?.[evaluation.revenue.source] ?? MISSING,
      materialPrices,
      oldestMaterialPrice: oldest([...materialPrices.values()]),
    };
  });
}

function byItem(prices: readonly ItemPrices[]) {
  return new Map(prices.map((price) => [price.itemId, price]));
}

function oldest(prices: readonly ObservedPrice[]) {
  let oldestSeen: Craft["oldestMaterialPrice"];
  for (const price of prices) {
    if (
      price.status !== "missing" &&
      (oldestSeen === undefined || price.ageMinutes > oldestSeen.ageMinutes)
    ) {
      oldestSeen = price;
    }
  }
  return oldestSeen;
}
