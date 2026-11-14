import { describe, expect, it } from "vitest";

import {
  type CraftingPlace,
  evaluate,
  type EvaluatePrices,
  type EvaluateSettings,
  type Evaluation,
  type MarketPrice,
  type OrderPrices,
  pricesNeeded,
  type Recipe,
} from "./index.js";

const fresh = (value: number): MarketPrice => ({ status: "fresh", value });
const missing: MarketPrice = { status: "missing" };
const instantOnly = (value: number): OrderPrices => ({
  sellMin: fresh(value),
  buyMax: missing,
});
const buyOrdersOnly = (value: number): OrderPrices => ({
  sellMin: missing,
  buyMax: fresh(value),
});

// A 5.0 broadsword's 24 materials give 90 fame each, 2,160 in all, and a T5
// journal holds 7,200: a craft fills 30% of one.
const broadsword: Recipe = {
  itemId: "T5_MAIN_SWORD",
  craftingCategory: "sword",
  focus: 2251,
  silver: 0,
  amountCrafted: 1,
  materials: [
    { id: "T5_METALBAR", count: 16, returnable: true },
    { id: "T5_LEATHER", count: 8, returnable: true },
  ],
  alternatives: [],
  itemValue: 768,
  journal: { id: "T5_JOURNAL_WARRIOR", capacity: 7200, fame: 2160 },
};

const noBonus: CraftingPlace = {
  location: {
    id: "none",
    name: "No bonus",
    craftingBonus: 0,
    specialties: {},
    refiningBonus: 0,
    refiningSpecialties: {},
  },
};

const settings: EvaluateSettings = {
  focus: false,
  premium: true,
  buyMode: "instant",
  sellMode: "instant",
  stationFee: 0,
  journals: true,
};

const prices: EvaluatePrices = {
  materials: new Map([
    ["T5_METALBAR", instantOnly(300)],
    ["T5_LEATHER", instantOnly(250)],
    ["T5_JOURNAL_WARRIOR_EMPTY", instantOnly(5000)],
  ]),
  products: new Map([
    ["T5_MAIN_SWORD", buyOrdersOnly(10_000)],
    ["T5_JOURNAL_WARRIOR_FULL", buyOrdersOnly(9000)],
  ]),
};

function complete(result: Evaluation) {
  if (result.status === "incomplete") {
    throw new Error(`Missing prices: ${result.missingPrices.join(", ")}`);
  }
  return result;
}

describe("the journal value of a craft", () => {
  it("adds the share of a journal a T5 craft fills to its profit", () => {
    const result = complete(evaluate(broadsword, noBonus, settings, prices));

    // A full journal nets 9,000 less 4% tax, 8,640, and costs 5,000 empty:
    // 30% of the 3,640 gained is 1,092. The sword nets 9,600 and its
    // materials cost 6,800.
    expect(result.journal).toEqual({
      id: "T5_JOURNAL_WARRIOR",
      capacity: 7200,
      fame: 2160,
      emptyCost: 5000,
      fullNet: 8640,
      value: 1092,
    });
    expect(result.profit).toBeCloseTo(9600 - 6800 + 1092);
  });

  it("is left out while the setting is off", () => {
    const result = complete(
      evaluate(broadsword, noBonus, { ...settings, journals: false }, prices),
    );

    expect(result.journal).toBeUndefined();
    expect(result.profit).toBeCloseTo(2800);
  });

  it("adds nothing while a journal price is missing", () => {
    const products = new Map(prices.products);
    products.delete("T5_JOURNAL_WARRIOR_FULL");
    const result = complete(
      evaluate(broadsword, noBonus, settings, { ...prices, products }),
    );

    expect(result.journal).toMatchObject({
      fullNet: undefined,
      value: undefined,
    });
    expect(result.missingPrices).toEqual([]);
    expect(result.profit).toBeCloseTo(2800);
  });

  it("buys an empty journal with a buy order's setup fee", () => {
    const result = complete(
      evaluate(
        broadsword,
        noBonus,
        { ...settings, buyMode: "order" },
        {
          ...prices,
          materials: new Map(
            [...prices.materials].map(([id, { sellMin }]) => [
              id,
              { sellMin: missing, buyMax: sellMin },
            ]),
          ),
        },
      ),
    );

    expect(result.journal?.emptyCost).toBeCloseTo(5125);
  });

  it("asks for the empty and full journal's prices only while it's on", () => {
    expect(pricesNeeded([broadsword])).toEqual({
      products: ["T5_MAIN_SWORD"],
      materials: ["T5_METALBAR", "T5_LEATHER"],
    });
    expect(pricesNeeded([broadsword], { journals: true })).toEqual({
      products: ["T5_MAIN_SWORD", "T5_JOURNAL_WARRIOR_FULL"],
      materials: ["T5_JOURNAL_WARRIOR_EMPTY", "T5_METALBAR", "T5_LEATHER"],
    });
  });
});
