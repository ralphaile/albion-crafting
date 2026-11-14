import {
  type CraftingPlace,
  type EvaluateSettings,
  type Evaluation,
  bestEvaluation,
  evaluateEach,
  rank,
} from "@aoc/core";
import {
  type GameRecipe,
  categoryOf,
  craftingLocations,
  itemName,
} from "@aoc/crafting-data";
import type { ItemPrices } from "@aoc/market-prices";

import type { BestCraftsQuery } from "./query.schema.js";

export type BestCraft = Evaluation & { name: string };

export function cityPlace(name: string): CraftingPlace | undefined {
  const location = craftingLocations.find(
    (city) => city.name.toLowerCase() === name.toLowerCase(),
  );
  return location && { location };
}

export function chosenRecipes(
  recipes: readonly GameRecipe[],
  { tiers, enchants, categories }: BestCraftsQuery,
): GameRecipe[] {
  return recipes.filter(
    (recipe) =>
      (tiers?.includes(recipe.tier) ?? true) &&
      (enchants?.includes(recipe.enchant) ?? true) &&
      (categories?.includes(categoryOf(recipe)) ?? true),
  );
}

export function settingsOf(query: BestCraftsQuery): EvaluateSettings {
  return {
    focus: query.focus,
    premium: query.premium,
    stationFee: query.stationFee,
    buyMode: query.buyMode,
    // The Black Market only buys, so it's always sold to its buy orders.
    sellMode:
      query.sell.toLowerCase() === "black market"
        ? "blackMarket"
        : query.sellMode,
  };
}

// Each recipe's most profitable way to craft it, the best first.
export function bestCrafts(
  recipes: readonly GameRecipe[],
  place: CraftingPlace,
  settings: EvaluateSettings,
  prices: { materials: readonly ItemPrices[]; products: readonly ItemPrices[] },
  { sort, limit }: Pick<BestCraftsQuery, "sort" | "limit">,
): BestCraft[] {
  const byItem = (rows: readonly ItemPrices[]) =>
    new Map(rows.map((row) => [row.itemId, row]));
  const evaluatePrices = {
    materials: byItem(prices.materials),
    products: byItem(prices.products),
  };
  const crafts = recipes.map((recipe): BestCraft => ({
    ...bestEvaluation(evaluateEach(recipe, place, settings, evaluatePrices)),
    name: itemName(recipe.itemId),
  }));
  return rank(crafts, sort).slice(0, limit);
}
