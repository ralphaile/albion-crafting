import type { DailyBonus } from "@aoc/core";

import type { RouteChoice } from "./route.types";

// `itemId` is a market ID, so it carries the enchantment: T5_MAIN_SWORD@1.
// `alternative` 0 is the item's usual recipe, and 1 on its alternatives.
export interface PlanEntry {
  id: string;
  itemId: string;
  alternative: number;
  quantity: number;
  focus: boolean;
  dailyBonus: DailyBonus["bonus"] | 0;
}

// Where the entries are crafted, and where their materials are bought and the
// items sold.
interface PlanLocation {
  id: string;
  route: RouteChoice;
  entries: readonly PlanEntry[];
}

export interface CraftingPlan {
  locations: readonly PlanLocation[];
}

// Adds a craft from the ranking to the plan, at the route it was ranked for.
export type AddToPlanHandler = (
  itemId: string,
  alternative: number,
  quantity: number,
) => void;
