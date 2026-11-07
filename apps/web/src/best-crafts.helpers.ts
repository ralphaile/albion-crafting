import {
  chosenEvaluation,
  type CraftingPlace,
  evaluateEach,
  type EvaluateSettings,
  type Evaluation,
  hasSpecialty,
} from "@aoc/core";
import type { GameRecipe } from "@aoc/crafting-data";
import type { HistorySummary } from "@aoc/market-prices";

import type {
  Craft,
  CraftAlternative,
  UsedItemPrices,
  UsedPrice,
  UsedPrices,
} from "./best-crafts.types";
import { NO_RECIPE_CHOICES } from "./recipe-choices.constants";
import type { RecipeChoices } from "./recipe-choices.types";

const MISSING: UsedPrice = { status: "missing", origin: "api" };

export function evaluateCrafts(
  recipes: readonly GameRecipe[],
  place: CraftingPlace,
  settings: EvaluateSettings,
  prices: UsedPrices,
  choices: RecipeChoices = NO_RECIPE_CHOICES,
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
    const choice = choices[recipe.itemId];
    const chosen = choice !== undefined && choice < alternatives.length;
    return {
      ...chosenEvaluation(alternatives, chosen ? choice : undefined),
      recipe,
      ...(chosen && { recipeChosen: true as const }),
      specialty: hasSpecialty(place, recipe.craftingCategory, {
        refining: recipe.refining ?? false,
      }),
      dailyVolume: "unknown" as const,
      alternatives,
    };
  });
}

// `history` is the products' history in the sell market.
export function withDailyVolumes(
  crafts: readonly Craft[],
  history: readonly HistorySummary[],
): Craft[] {
  const volumes = new Map(
    history.map(({ itemId, averageDailyVolume, newestDay }) => [
      itemId,
      newestDay === undefined ? ("none" as const) : averageDailyVolume,
    ]),
  );
  return crafts.map((craft) => ({
    ...craft,
    dailyVolume: volumes.get(craft.itemId) ?? "unknown",
  }));
}

// The daily volume to rank or filter by, when there's a number for it.
export function soldPerDay({ dailyVolume }: Craft): number | undefined {
  return typeof dailyVolume === "number" ? dailyVolume : undefined;
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
