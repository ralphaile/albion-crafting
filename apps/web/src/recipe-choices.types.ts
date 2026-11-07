// The recipe chosen for each item, by item ID with its tier and enchantment.
// An item without one uses its most profitable recipe.
export type RecipeChoices = Readonly<Record<string, number>>;

// `undefined` goes back to the most profitable recipe.
export type ChooseRecipeHandler = (
  itemId: string,
  alternative: number | undefined,
) => void;
