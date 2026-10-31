import {
  bestEvaluation,
  type CraftingPlace,
  evaluateEach,
  type EvaluateSettings,
  type Evaluation,
  hasSpecialty,
} from "@aoc/core";
import type { GameRecipe } from "@aoc/crafting-data";

import type {
  Craft,
  CraftAlternative,
  UsedItemPrices,
  UsedPrice,
  UsedPrices,
} from "./best-crafts.types";

const MISSING: UsedPrice = { status: "missing", origin: "api" };

export function evaluateCrafts(
  recipes: readonly GameRecipe[],
  place: CraftingPlace,
  settings: EvaluateSettings,
  prices: UsedPrices,
): Craft[] {
  const materials = byItem(prices.materials);
  const products = byItem(prices.products);

  function withPrices(evaluation: Evaluation): CraftAlternative {
    const materialPrices = new Map(
      evaluation.materialCost.lines.map(({ itemId, source }) => [
        itemId,
        materials.get(itemId)?.[source] ?? MISSING,
      ]),
    );
    return {
      ...evaluation,
      itemPrice:
        products.get(evaluation.itemId)?.[evaluation.revenue.source] ?? MISSING,
      materialPrices,
      oldestMaterialPrice: oldest([...materialPrices.values()]),
    };
  }

  return recipes.map((recipe) => {
    const [first, ...others] = evaluateEach(recipe, place, settings, {
      materials,
      products,
    });
    const alternatives: Craft["alternatives"] = [
      withPrices(first),
      ...others.map(withPrices),
    ];
    return {
      ...bestEvaluation(alternatives),
      recipe,
      specialty: hasSpecialty(place, recipe.craftingCategory),
      alternatives,
    };
  });
}

function byItem(prices: readonly UsedItemPrices[]) {
  return new Map(prices.map((price) => [price.itemId, price]));
}

function oldest(prices: readonly UsedPrice[]) {
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
