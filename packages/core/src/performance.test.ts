import { describe, expect, it } from "vitest";

import {
  evaluate,
  type EvaluatePrices,
  type EvaluateSettings,
  type OrderPrices,
  rank,
  type Recipe,
} from "./index.js";

const RECIPES = 6000;

const priced = (value: number): OrderPrices => ({
  sellMin: { status: "fresh", value },
  buyMax: { status: "fresh", value: value * 0.9 },
});

// Shaped like the real recipes: two refined materials and an artifact, which
// half of them can swap for a token.
const recipes: Recipe[] = Array.from({ length: RECIPES }, (_, i) => {
  const alternative = (extra: string) => ({
    focus: 1715,
    silver: 0,
    amountCrafted: 1,
    materials: [
      { id: "T4_PLANKS", count: 20, returnable: true },
      { id: "T4_METALBAR", count: 12, returnable: true },
      { id: extra, count: 1, returnable: false },
    ],
  });
  return {
    itemId: `ITEM_${String(i)}`,
    craftingCategory: i % 2 === 0 ? "sword" : "bow",
    itemValue: 2432,
    ...alternative(`ARTIFACT_${String(i)}`),
    alternatives: i % 2 === 0 ? [alternative(`TOKEN_${String(i)}`)] : [],
  };
});
const prices: EvaluatePrices = {
  materials: new Map([
    ["T4_PLANKS", priced(1000)],
    ["T4_METALBAR", priced(1500)],
    ...recipes.flatMap((_, i): [string, OrderPrices][] => [
      [`ARTIFACT_${String(i)}`, priced(20_000 + i)],
      [`TOKEN_${String(i)}`, priced(25_000 - i)],
    ]),
  ]),
  products: new Map(
    recipes.map(({ itemId }, i) => [itemId, priced(60_000 + i * 3)]),
  ),
};
const settings: EvaluateSettings = {
  focus: true,
  premium: true,
  buyMode: "order",
  sellMode: "order",
  stationFee: 500,
  dailyBonuses: [{ category: "sword", bonus: 0.2 }],
  fce: () => 5000,
};
const lymhurst = {
  location: {
    id: "1000",
    name: "Lymhurst",
    craftingBonus: 0.18,
    specialties: { sword: 0.15, bow: 0.15 },
  },
};

function evaluateAndRank() {
  return rank(
    recipes.map((recipe) => evaluate(recipe, lymhurst, settings, prices)),
    "silverPerFocus",
  );
}

describe("performance", () => {
  it("evaluates and ranks 6,000 recipes in under 200 ms", () => {
    evaluateAndRank();

    const start = Date.now();
    const ranked = evaluateAndRank();
    const elapsed = Date.now() - start;

    expect(ranked).toHaveLength(RECIPES);
    expect(ranked.every(({ status }) => status === "complete")).toBe(true);
    expect(elapsed).toBeLessThan(200);
  });
});
