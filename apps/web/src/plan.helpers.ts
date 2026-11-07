import type {
  EvaluatePrices,
  PlanEntry as CorePlanEntry,
  PlanLocation as CorePlanLocation,
  RecipeAlternative,
} from "@aoc/core";
import type { GameRecipe } from "@aoc/crafting-data";

import { MAX_PLAN_QUANTITY } from "./plan.constants";
import type { CraftingPlan, PlanEntry } from "./plan.types";
import { RECIPES_BY_ID } from "./recipes.constants";
import { routeFromChoice, sellsOnlyToBuyOrders } from "./route.helpers";
import type { PlaceChoice, Route, RouteChoice } from "./route.types";
import type { CraftingSettings } from "./settings.types";

// The recipe an entry uses: its usual one, or one of its alternatives.
export function chosenRecipe(
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

type NewEntry = Omit<PlanEntry, "id">;

// A craft added from the ranking: focus and the daily bonus of its own
// category as in Settings.
export function newEntry(
  itemId: string,
  alternative: number,
  quantity: number,
  { focus, dailyBonuses }: Pick<CraftingSettings, "focus" | "dailyBonuses">,
): NewEntry {
  const category = RECIPES_BY_ID.get(itemId)?.craftingCategory;
  const dailyBonus =
    dailyBonuses.find((bonus) => bonus.category === category)?.bonus ?? 0;
  return { itemId, alternative, quantity, focus, dailyBonus };
}

function samePlace(a: PlaceChoice, b: PlaceChoice): boolean {
  if (a.kind === "location") {
    return b.kind === "location" && a.locationId === b.locationId;
  }
  return (
    b.kind === "hideout" &&
    a.biomeId === b.biomeId &&
    a.quality === b.quality &&
    a.level === b.level
  );
}

function sameRoute(a: RouteChoice, b: RouteChoice): boolean {
  return (
    samePlace(a.place, b.place) &&
    a.buyMarketId === b.buyMarketId &&
    a.sellMarketId === b.sellMarketId
  );
}

// How many of the item and recipe the plan already has at the route.
export function plannedQuantity(
  plan: CraftingPlan,
  route: RouteChoice,
  itemId: string,
  alternative: number,
): number {
  return (
    plan.locations
      .find((location) => sameRoute(location.route, route))
      ?.entries.find(
        (entry) => entry.itemId === itemId && entry.alternative === alternative,
      )?.quantity ?? 0
  );
}

// Adds to the location with the same route, made if there's none yet. The same
// item and recipe already there gets the quantity added.
export function addToPlan(
  plan: CraftingPlan,
  route: RouteChoice,
  entry: NewEntry,
): CraftingPlan {
  const index = plan.locations.findIndex((location) =>
    sameRoute(location.route, route),
  );
  const location = plan.locations[index] ?? {
    id: crypto.randomUUID(),
    route,
    entries: [],
  };
  const same = location.entries.find(
    ({ itemId, alternative }) =>
      itemId === entry.itemId && alternative === entry.alternative,
  );
  const entries =
    same === undefined
      ? [...location.entries, { id: crypto.randomUUID(), ...entry }]
      : location.entries.map((other) =>
          other === same
            ? {
                ...other,
                quantity: Math.min(
                  other.quantity + entry.quantity,
                  MAX_PLAN_QUANTITY,
                ),
              }
            : other,
        );
  const added = { ...location, entries };
  return {
    locations:
      index === -1
        ? [...plan.locations, added]
        : plan.locations.map((other, i) => (i === index ? added : other)),
  };
}
