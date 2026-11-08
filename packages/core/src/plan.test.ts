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
const sellOrders = (value: number): OrderPrices => ({
  sellMin: fresh(value),
  buyMax: { status: "missing" },
});

// 8 cloth and 8 leather, both returned. Its item value of 128 makes a station
// fee of 128 × 0.1125 × 500 / 100 = 72 a craft.
const bag: Recipe = {
  itemId: "T4_BAG",
  craftingCategory: "bag",
  focus: 100,
  silver: 0,
  amountCrafted: 1,
  materials: [
    { id: "T4_CLOTH", count: 8, returnable: true },
    { id: "T4_LEATHER", count: 8, returnable: true },
  ],
  alternatives: [
    {
      focus: 100,
      silver: 0,
      amountCrafted: 4,
      materials: [{ id: "T4_CLOTH", count: 20, returnable: true }],
    },
  ],
  itemValue: 128,
};

// 0.18 + 0.15 for bags, so 1 − 1/1.33 of the materials come back.
const city: CraftingPlace = {
  location: {
    id: "4000",
    name: "Martlock",
    craftingBonus: 0.18,
    specialties: { bag: 0.15 },
    refiningBonus: 0.18,
    refiningSpecialties: {},
  },
};
const CITY_RRR = 1 - 1 / 1.33;

// 0.26 map quality + 0.26 power + 0.30 specialist, so 1 − 1/1.82 come back.
const hideout: CraftingPlace = {
  hideout: {
    biome: { specialties: ["bag"] },
    mapQuality: { specialtyBonus: 0.26 },
    powerLevel: { generalBonus: 0.26, specialistBonus: 0.3 },
    refiningBonus: 0.15,
  },
};
const HIDEOUT_RRR = 1 - 1 / 1.82;

function pricesAt(material: number, sell: number): EvaluatePrices {
  return {
    materials: new Map([
      ["T4_CLOTH", sellOrders(material)],
      ["T4_LEATHER", sellOrders(material)],
    ]),
    products: new Map([["T4_BAG", sellOrders(sell)]]),
  };
}

const settings: PlanSettings = {
  premium: true,
  buyMode: "instant",
  sellMode: "order",
  stationFee: 500,
};

// A sell order pays 4% tax and a 2.5% setup fee.
const NET = 0.935;

function entry(changes: Partial<PlanEntry> = {}): PlanEntry {
  return {
    recipe: bag,
    alternative: 0,
    quantity: 10,
    focus: false,
    dailyBonuses: [],
    ...changes,
  };
}

describe("evaluatePlan", () => {
  it("evaluates the same item at a city and a hideout, each with its own bonus and prices, and adds them up", () => {
    const result = evaluatePlan(
      [
        { place: city, prices: pricesAt(100, 5000), entries: [entry()] },
        {
          place: hideout,
          prices: pricesAt(120, 4000),
          entries: [entry({ quantity: 5 })],
        },
      ],
      settings,
    );

    const cityCost = 2 * Math.ceil(80 * (1 - CITY_RRR)) * 100 + 10 * 72;
    const hideoutCost = 2 * Math.ceil(40 * (1 - HIDEOUT_RRR)) * 120 + 5 * 72;
    const [atCity, atHideout] = result.locations;
    expect(atCity?.entries[0]).toMatchObject({
      status: "complete",
      crafts: 10,
      made: 10,
      materials: [
        { itemId: "T4_CLOTH", count: Math.ceil(80 * (1 - CITY_RRR)) },
        { itemId: "T4_LEATHER", count: Math.ceil(80 * (1 - CITY_RRR)) },
      ],
      focus: 0,
    });
    expect(atCity?.totals.cost).toBeCloseTo(cityCost, 9);
    expect(atCity?.totals.revenue).toBeCloseTo(10 * 5000 * NET, 9);
    expect(atHideout?.totals.cost).toBeCloseTo(hideoutCost, 9);
    expect(atHideout?.totals.revenue).toBeCloseTo(5 * 4000 * NET, 9);
    expect(result.totals).toMatchObject({
      status: "complete",
      focus: 0,
      cost: expect.closeTo(cityCost + hideoutCost, 9) as number,
      revenue: expect.closeTo(70_000 * NET, 9) as number,
      profit: expect.closeTo(
        70_000 * NET - cityCost - hideoutCost,
        9,
      ) as number,
      missingPrices: [],
    });
  });

  it("makes a batch recipe in whole crafts, and spends focus on each craft", () => {
    const result = evaluatePlan(
      [
        {
          place: city,
          prices: pricesAt(100, 5000),
          entries: [entry({ alternative: 1, quantity: 5, focus: true })],
        },
      ],
      settings,
    );

    const planned = result.locations[0]?.entries[0];
    expect(planned).toMatchObject({ crafts: 2, made: 8, focus: 200 });
    expect(planned?.evaluation.alternative).toBe(1);
    expect(planned?.status === "complete" && planned.revenue).toBeCloseTo(
      8 * 5000 * NET,
      9,
    );
  });

  it("sells at a location's own sell mode, such as the Black Market's buy orders", () => {
    const blackMarket: EvaluatePrices = {
      ...pricesAt(100, 5000),
      products: new Map([
        ["T4_BAG", { sellMin: { status: "missing" }, buyMax: fresh(6000) }],
      ]),
    };
    const result = evaluatePlan(
      [
        {
          place: city,
          prices: blackMarket,
          sellMode: "blackMarket",
          entries: [entry()],
        },
      ],
      settings,
    );

    expect(result.locations[0]?.entries[0]?.evaluation.revenue).toMatchObject({
      source: "buyMax",
      price: 6000,
    });
  });

  it("gives each entry its own daily bonus", () => {
    const [plain, boosted] =
      evaluatePlan(
        [
          {
            place: city,
            prices: pricesAt(100, 5000),
            entries: [
              entry(),
              entry({ dailyBonuses: [{ category: "bag", bonus: 0.2 }] }),
            ],
          },
        ],
        settings,
      ).locations[0]?.entries ?? [];

    expect(plain?.evaluation.rrr).toBeCloseTo(CITY_RRR, 9);
    expect(boosted?.evaluation.rrr).toBeCloseTo(1 - 1 / 1.53, 9);
  });

  it("leaves an entry with a missing price out of the silver totals, and lists the missing item once", () => {
    const noLeather: EvaluatePrices = {
      ...pricesAt(100, 5000),
      materials: new Map([["T4_CLOTH", sellOrders(100)]]),
    };
    const result = evaluatePlan(
      [
        { place: city, prices: pricesAt(100, 5000), entries: [entry()] },
        {
          place: hideout,
          prices: noLeather,
          entries: [entry({ focus: true }), entry({ quantity: 1 })],
        },
      ],
      settings,
    );

    expect(result.locations[1]?.entries[0]?.status).toBe("incomplete");
    expect(result.locations[1]?.totals).toMatchObject({
      status: "incomplete",
      focus: 1000,
      cost: 0,
      missingPrices: ["T4_LEATHER"],
    });
    expect(result.totals).toMatchObject({
      status: "incomplete",
      focus: 1000,
      cost: result.locations[0]?.totals.cost,
      missingPrices: ["T4_LEATHER"],
    });
  });
});
