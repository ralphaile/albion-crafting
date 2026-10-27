import type { CraftingLocation } from "@aoc/core";

import type { Hideouts } from "../src/hideout.types.ts";
import type { Item } from "../src/item.types.ts";
import type { GameRecipe } from "../src/recipe.types.ts";

export interface GeneratedData {
  recipes: readonly GameRecipe[];
  items: readonly Item[];
  locations: readonly CraftingLocation[];
  hideouts: Hideouts;
}

export interface Totals {
  added: number;
  removed: number;
  changed: number;
}

export interface DataDiff {
  totals: {
    items: Omit<Totals, "changed">;
    recipes: Totals;
    bonuses: Totals;
  };
  bonuses: string[];
  removedItems: string[];
  addedItems: string[];
  recipes: string[];
}
