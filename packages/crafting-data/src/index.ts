import recipesJson from "./generated/recipes.json" with { type: "json" };
import type { Recipe } from "./recipe.js";

export { iconUrl, itemName, searchItems } from "./items.js";
export type { Alternative, Recipe, Resource } from "./recipe.js";

export const recipes: readonly Recipe[] = recipesJson;
