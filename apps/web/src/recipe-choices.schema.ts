import { z } from "zod";

import { NO_RECIPE_CHOICES } from "./recipe-choices.constants";
import type { RecipeChoices } from "./recipe-choices.types";
import { RECIPES_BY_ID } from "./recipes.constants";

const choicesSchema = z.record(z.string(), z.unknown());
const alternativeSchema = z.int().min(0);

// A choice for an item the app no longer has, or for a recipe it doesn't have,
// is left out.
export function parseRecipeChoices(raw: unknown): RecipeChoices {
  const parsed = choicesSchema.safeParse(raw);
  if (!parsed.success) {
    return NO_RECIPE_CHOICES;
  }
  return Object.fromEntries(
    Object.entries(parsed.data).flatMap(([itemId, value]) => {
      const alternative = alternativeSchema.safeParse(value);
      const recipe = RECIPES_BY_ID.get(itemId);
      return recipe !== undefined &&
        alternative.success &&
        alternative.data <= recipe.alternatives.length
        ? [[itemId, alternative.data]]
        : [];
    }),
  );
}
