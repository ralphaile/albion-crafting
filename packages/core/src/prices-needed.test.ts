import { describe, expect, it } from "vitest";

import { pricesNeeded, type Recipe } from "./index.js";

function recipe(
  itemId: string,
  materials: string[],
  alternatives: string[][] = [],
): Recipe {
  const alternative = (ids: string[]) => ({
    focus: 0,
    silver: 0,
    amountCrafted: 1,
    materials: ids.map((id) => ({ id, count: 1, returnable: true })),
  });
  return {
    itemId,
    ...alternative(materials),
    alternatives: alternatives.map(alternative),
  };
}

describe("pricesNeeded", () => {
  it("lists what each recipe makes as products and what it uses as materials", () => {
    expect(
      pricesNeeded([
        recipe("T4_2H_ARCANESTAFF_HELL", [
          "T4_PLANKS",
          "T4_METALBAR",
          "T4_ARTEFACT_2H_ARCANESTAFF_HELL",
        ]),
      ]),
    ).toEqual({
      products: ["T4_2H_ARCANESTAFF_HELL"],
      materials: [
        "T4_PLANKS",
        "T4_METALBAR",
        "T4_ARTEFACT_2H_ARCANESTAFF_HELL",
      ],
    });
  });

  it("includes the materials of alternative recipes, which evaluate also tries", () => {
    expect(
      pricesNeeded([
        recipe(
          "T4_2H_ARCANESTAFF_HELL",
          ["T4_PLANKS", "T4_METALBAR", "T4_ARTEFACT_2H_ARCANESTAFF_HELL"],
          [["T4_PLANKS", "T4_METALBAR", "T4_ARTEFACT_TOKEN_FAVOR_2"]],
        ),
      ]).materials,
    ).toEqual([
      "T4_PLANKS",
      "T4_METALBAR",
      "T4_ARTEFACT_2H_ARCANESTAFF_HELL",
      "T4_ARTEFACT_TOKEN_FAVOR_2",
    ]);
  });

  it("lists an item once, however many recipes need it", () => {
    expect(
      pricesNeeded([
        recipe("T4_MAIN_SWORD", ["T4_METALBAR", "T4_LEATHER"]),
        recipe("T4_2H_CLAYMORE", ["T4_METALBAR", "T4_LEATHER"]),
        recipe("T4_MAIN_SWORD", ["T4_METALBAR", "T4_LEATHER"]),
      ]),
    ).toEqual({
      products: ["T4_MAIN_SWORD", "T4_2H_CLAYMORE"],
      materials: ["T4_METALBAR", "T4_LEATHER"],
    });
  });

  it("needs no prices for no recipes", () => {
    expect(pricesNeeded([])).toEqual({ products: [], materials: [] });
  });
});
