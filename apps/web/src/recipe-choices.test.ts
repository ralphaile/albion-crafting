import { describe, expect, it } from "vitest";

import { chooseRecipe } from "./recipe-choices.helpers";
import { parseRecipeChoices } from "./recipe-choices.schema";

// The Mistcaller has 2 recipes, the broadsword 1.
describe("parseRecipeChoices", () => {
  it("keeps a choice of a recipe the item has", () => {
    expect(
      parseRecipeChoices({ T4_OFF_HORN_KEEPER: 1, T4_MAIN_SWORD: 0 }),
    ).toEqual({ T4_OFF_HORN_KEEPER: 1, T4_MAIN_SWORD: 0 });
  });

  it("leaves out unknown items, recipes the item doesn't have, and anything else", () => {
    expect(
      parseRecipeChoices({
        T4_OFF_HORN_KEEPER: 2,
        T4_MAIN_SWORD: 1,
        T9_NOTHING: 0,
        T4_BAG: "0",
        T4_MAIN_AXE: 0.5,
      }),
    ).toEqual({});
    expect(parseRecipeChoices([1])).toEqual({});
    expect(parseRecipeChoices(undefined)).toEqual({});
  });
});

describe("chooseRecipe", () => {
  it("sets, replaces and takes away an item's choice, leaving the others", () => {
    const chosen = chooseRecipe({ T4_MAIN_SWORD: 0 }, "T4_OFF_HORN_KEEPER", 1);

    expect(chosen).toEqual({ T4_MAIN_SWORD: 0, T4_OFF_HORN_KEEPER: 1 });
    expect(chooseRecipe(chosen, "T4_OFF_HORN_KEEPER", 0)).toEqual({
      T4_MAIN_SWORD: 0,
      T4_OFF_HORN_KEEPER: 0,
    });
    expect(chooseRecipe(chosen, "T4_OFF_HORN_KEEPER", undefined)).toEqual({
      T4_MAIN_SWORD: 0,
    });
  });
});
