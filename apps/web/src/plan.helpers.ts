import type {
  EvaluatePrices,
  PlanEntry as CorePlanEntry,
  PlanLocation as CorePlanLocation,
  RecipeAlternative,
} from "@aoc/core";
import type { GameRecipe } from "@aoc/crafting-data";

import type { CraftingPlan, PlanEntry } from "./plan.types";
import { RECIPES_BY_ID } from "./recipes.constants";
import { routeFromChoice, sellsOnlyToBuyOrders } from "./route.helpers";
import type { Route } from "./route.types";

// The recipe an entry uses: its usual one, or one of its alternatives.
function chosenRecipe(
  recipe: GameRecipe,
  alternative: number,
): RecipeAlternative {
  return alternative === 0
    ? recipe
    : (recipe.alternatives[alternative - 1] ?? recipe);
}

// The items each market needs prices for: the entries' materials where they're
// bought, and the items where they're sold. Each list is sorted, once each.
export function planMarkets(plan: CraftingPlan): Map<string, string[]> {
  const needed = new Map<string, Set<string>>();
  const add = (marketId: string, itemId: string) => {
    const items = needed.get(marketId) ?? new Set<string>();
    items.add(itemId);
    needed.set(marketId, items);
  };
  for (const { route, entries } of plan.locations) {
    for (const entry of entries) {
      const recipe = RECIPES_BY_ID.get(entry.itemId);
      if (recipe === undefined) {
        continue;
      }
      for (const { id } of chosenRecipe(recipe, entry.alternative).materials) {
        add(route.buyMarketId, id);
      }
      add(route.sellMarketId, entry.itemId);
    }
  }
  return new Map(
    [...needed].map(([marketId, items]) => [marketId, [...items].sort()]),
  );
}

// The daily bonus applies to the entry's own crafting category.
function coreEntry(entry: PlanEntry): CorePlanEntry[] {
  const recipe = RECIPES_BY_ID.get(entry.itemId);
  if (recipe === undefined) {
    return [];
  }
  const { craftingCategory } = recipe;
  return [
    {
      recipe,
      alternative: entry.alternative,
      quantity: entry.quantity,
      focus: entry.focus,
      dailyBonuses:
        entry.dailyBonus === 0 || craftingCategory === undefined
          ? []
          : [{ category: craftingCategory, bonus: entry.dailyBonus }],
    },
  ];
}

// The plan as core evaluates it. `pricesAt` gives each location the prices of
// its own buy and sell markets.
export function planLocations(
  plan: CraftingPlan,
  pricesAt: (route: Route, index: number) => EvaluatePrices,
): CorePlanLocation[] {
  return plan.locations.map(({ route: choice, entries }, index) => {
    const route = routeFromChoice(choice);
    return {
      place: route.place,
      prices: pricesAt(route, index),
      ...(sellsOnlyToBuyOrders(route.sellMarketId) && {
        sellMode: "blackMarket" as const,
      }),
      entries: entries.flatMap(coreEntry),
    };
  });
}
