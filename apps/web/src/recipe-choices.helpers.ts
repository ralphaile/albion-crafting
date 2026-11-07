import type { RecipeChoices } from "./recipe-choices.types";

// Sets the item's recipe, or with `undefined` takes the choice away.
export function chooseRecipe(
  choices: RecipeChoices,
  itemId: string,
  alternative: number | undefined,
): RecipeChoices {
  const others = Object.entries(choices).filter(([other]) => other !== itemId);
  return Object.fromEntries(
    alternative === undefined ? others : [...others, [itemId, alternative]],
  );
}
