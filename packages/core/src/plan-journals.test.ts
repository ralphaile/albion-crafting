import { describe, expect, it } from "vitest";

import {
  type CraftingPlace,
  type EvaluatePrices,
  type MarketPrice,
  type OrderPrices,
  type PlanEntry,
  type PlanSettings,
  type Recipe,
  evaluatePlan,
} from "./index.js";

const fresh = (value: number): MarketPrice => ({ status: "fresh", value });
const instantOnly = (value: number): OrderPrices => ({
  sellMin: fresh(value),
  buyMax: { status: "missing" },
});
const buyOrdersOnly = (value: number): OrderPrices => ({
  sellMin: { status: "missing" },
  buyMax: fresh(value),
});

// A T5 broadsword's 24 materials give 2,160 fame, 30% of a T5 Blacksmith's
// journal. A T5 bow's 32 give 2,880, 40% of a T5 Fletcher's.
const broadsword: Recipe = {
  itemId: "T5_MAIN_SWORD",
  focus: 0,
  silver: 0,
  amountCrafted: 1,
  materials: [{ id: "T5_METALBAR", count: 24, returnable: false }],
  alternatives: [],
  itemValue: 768,
  journal: { id: "T5_JOURNAL_WARRIOR", capacity: 7200, fame: 2160 },
};
const bow: Recipe = {
  itemId: "T5_2H_BOW",
  focus: 0,
  silver: 0,
  amountCrafted: 1,
  materials: [{ id: "T5_PLANKS", count: 32, returnable: false }],
  alternatives: [],
  itemValue: 1024,
  journal: { id: "T5_JOURNAL_HUNTER", capacity: 7200, fame: 2880 },
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

const prices: EvaluatePrices = {
  materials: new Map([
    ["T5_METALBAR", instantOnly(100)],
    ["T5_PLANKS", instantOnly(100)],
    ["T5_JOURNAL_WARRIOR_EMPTY", instantOnly(5000)],
    ["T5_JOURNAL_HUNTER_EMPTY", instantOnly(4000)],
  ]),
  products: new Map([
    ["T5_MAIN_SWORD", buyOrdersOnly(10_000)],
    ["T5_2H_BOW", buyOrdersOnly(12_000)],
    ["T5_JOURNAL_WARRIOR_FULL", buyOrdersOnly(9000)],
    ["T5_JOURNAL_HUNTER_FULL", buyOrdersOnly(8000)],
  ]),
};

const settings: PlanSettings = {
  premium: true,
  buyMode: "instant",
  sellMode: "instant",
  stationFee: 0,
  journals: true,
};

function entry(recipe: Recipe, quantity: number): PlanEntry {
  return { recipe, alternative: 0, quantity, focus: false, dailyBonuses: [] };
}

describe("the journals a plan fills", () => {
  it("counts each journal type the entries fill, and adds their value to the profit", () => {
    const result = evaluatePlan(
      [
        {
          place: noBonus,
          prices,
          entries: [entry(broadsword, 9), entry(bow, 5)],
        },
        { place: noBonus, prices, entries: [entry(broadsword, 1)] },
      ],
      settings,
    );

    // A full Blacksmith's journal nets 8,640 after 4% tax and an empty one
    // costs 5,000: 3,640 a journal. A Fletcher's nets 7,680 less 4,000: 3,680.
    const [first] = result.locations;
    expect(first?.entries[0]).toMatchObject({
      journal: { id: "T5_JOURNAL_WARRIOR", filled: 2.7 },
      journalValue: expect.closeTo(2.7 * 3640, 6) as number,
    });
    expect(first?.entries[1]).toMatchObject({
      journal: { id: "T5_JOURNAL_HUNTER", filled: 2 },
      journalValue: expect.closeTo(2 * 3680, 6) as number,
    });
    expect(result.totals.journals).toEqual([
      { id: "T5_JOURNAL_WARRIOR", filled: expect.closeTo(3, 9) as number },
      { id: "T5_JOURNAL_HUNTER", filled: 2 },
    ]);
    const journalValue = 3 * 3640 + 2 * 3680;
    expect(result.totals.journalValue).toBeCloseTo(journalValue, 6);
    expect(result.totals.profit).toBeCloseTo(
      result.totals.revenue + journalValue - result.totals.cost,
      6,
    );
  });

  it("leaves journals out while the setting is off", () => {
    const result = evaluatePlan(
      [{ place: noBonus, prices, entries: [entry(broadsword, 9)] }],
      { ...settings, journals: false },
    );

    expect(result.locations[0]?.entries[0]?.journal).toBeUndefined();
    expect(result.totals).toMatchObject({ journals: [], journalValue: 0 });
  });

  it("still counts the journals filled while their prices are missing", () => {
    const result = evaluatePlan(
      [
        {
          place: noBonus,
          prices: {
            ...prices,
            products: new Map([...prices.products].slice(0, 2)),
          },
          entries: [entry(broadsword, 9)],
        },
      ],
      settings,
    );

    expect(result.locations[0]?.entries[0]).toMatchObject({
      journal: { filled: 2.7, value: undefined },
      journalValue: 0,
    });
  });
});
