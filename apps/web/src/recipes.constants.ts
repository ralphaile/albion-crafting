import {
  consumableRecipes,
  type GameRecipe,
  recipes,
  refiningRecipes,
} from "@aoc/crafting-data";

export const RECIPES_BY_ID: ReadonlyMap<string, GameRecipe> = new Map(
  [...recipes, ...refiningRecipes, ...consumableRecipes].map((recipe) => [
    recipe.itemId,
    recipe,
  ]),
);
