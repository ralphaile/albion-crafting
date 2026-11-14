import { describe, expect, it } from "vitest";

import { recipes } from "@aoc/crafting-data";

import { chosenRecipes, cityPlace, settingsOf } from "./best-crafts.helpers.js";
import { bestCraftsQuerySchema } from "./query.schema.js";

function query(search: Record<string, string>) {
  return bestCraftsQuerySchema.parse({
    location: "Martlock",
    buy: "Martlock",
    sell: "Caerleon",
    ...search,
  });
}

describe("settingsOf", () => {
  it("sells to the Black Market's buy orders, whatever the sell mode", () => {
    expect(
      settingsOf(query({ sell: "Black Market", sellMode: "order" })),
    ).toMatchObject({ sellMode: "blackMarket" });
  });

  it("takes premium, a 500 station fee and no focus by default", () => {
    expect(settingsOf(query({}))).toEqual({
      focus: false,
      premium: true,
      stationFee: 500,
      buyMode: "instant",
      sellMode: "order",
    });
  });
});

describe("chosenRecipes", () => {
  it("keeps the recipes of the tiers, enchantments and categories asked", () => {
    const chosen = chosenRecipes(
      recipes,
      query({ tiers: "5", enchants: "1", categories: "sword" }),
    );

    expect(chosen.length).toBeGreaterThan(0);
    expect(
      chosen.every(
        (recipe) =>
          recipe.tier === 5 &&
          recipe.enchant === 1 &&
          recipe.craftingCategory === "sword",
      ),
    ).toBe(true);
  });
});

describe("cityPlace", () => {
  it("finds a city in any case", () => {
    expect(cityPlace("martlock")).toMatchObject({
      location: { name: "Martlock" },
    });
  });
});
