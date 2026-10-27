import type { CraftingLocation } from "@aoc/core";

import hideoutsJson from "./generated/hideouts.json" with { type: "json" };
import locationsJson from "./generated/locations.json" with { type: "json" };
import recipesJson from "./generated/recipes.json" with { type: "json" };
import type { Hideouts } from "./hideout.types.js";
import type { GameRecipe } from "./recipe.types.js";

export const craftingLocations: readonly CraftingLocation[] = locationsJson;
export const hideouts: Readonly<Hideouts> = hideoutsJson;
export const recipes: readonly GameRecipe[] = recipesJson;
