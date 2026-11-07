import type {
  EvaluatePrices,
  PlanEntry as CorePlanEntry,
  PlanLocation as CorePlanLocation,
} from "@aoc/core";

import type { CraftingPlan, PlanEntry } from "./plan.types";
import { RECIPES_BY_ID } from "./recipes.constants";
import { routeFromChoice } from "./route.helpers";
import type { Route } from "./route.types";

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
  pricesAt: (route: Route) => EvaluatePrices,
): CorePlanLocation[] {
  return plan.locations.map(({ route: choice, entries }) => {
    const route = routeFromChoice(choice);
    return {
      place: route.place,
      prices: pricesAt(route),
      entries: entries.flatMap(coreEntry),
    };
  });
}
