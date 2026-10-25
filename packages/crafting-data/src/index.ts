import hideoutsJson from "./generated/hideouts.json" with { type: "json" };
import locationsJson from "./generated/locations.json" with { type: "json" };
import recipesJson from "./generated/recipes.json" with { type: "json" };
import type { Hideouts } from "./hideout.js";
import type { CraftingLocation } from "./location.js";
import type { Recipe } from "./recipe.js";

export type { Biome, Hideouts, MapQuality, PowerLevel } from "./hideout.js";
export { iconUrl, itemName, searchItems } from "./items.js";
export type { CraftingLocation } from "./location.js";
export type { Alternative, Recipe, Resource } from "./recipe.js";

export const craftingLocations: readonly CraftingLocation[] = locationsJson;
export const hideouts: Readonly<Hideouts> = hideoutsJson;
export const recipes: readonly Recipe[] = recipesJson;
