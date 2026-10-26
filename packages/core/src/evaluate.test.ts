import { describe, expect, it, vi } from "vitest";

import {
  type CraftingPlace,
  evaluate,
  type EvaluatePrices,
  type EvaluateSettings,
  type Evaluation,
  type MarketPrice,
  type OrderPrices,
  type Recipe,
} from "./index.js";

const fresh = (value: number): MarketPrice => ({ status: "fresh", value });
const missing: MarketPrice = { status: "missing" };
const instantOnly = (value: number): OrderPrices => ({
  sellMin: fresh(value),
  buyMax: missing,
});

const astralStaff: Recipe = {
  itemId: "T4_2H_ARCANESTAFF_CRYSTAL",
  craftingCategory: "arcanestaff",
  focus: 1715,
  silver: 0,
  amountCrafted: 1,
  materials: [
    { id: "T4_PLANKS", count: 20, returnable: true },
    { id: "T4_METALBAR", count: 12, returnable: true },
    { id: "T4_ARTEFACT_2H_ARCANESTAFF_CRYSTAL", count: 1, returnable: false },
  ],
  alternatives: [],
  itemValue: 2432,
};
const royalRobe: Recipe = {
  itemId: "T4_ARMOR_CLOTH_ROYAL",
  focus: 0,
  silver: 0,
  amountCrafted: 1,
  materials: [
    { id: "T4_ARMOR_CLOTH_SET1", count: 1, returnable: false },
    { id: "QUESTITEM_TOKEN_ROYAL_T4", count: 4, returnable: false },
  ],
  alternatives: [
    {
      focus: 0,
      silver: 0,
      amountCrafted: 1,
      materials: [
        { id: "T4_ARMOR_CLOTH_SET2", count: 1, returnable: false },
        { id: "QUESTITEM_TOKEN_ROYAL_T4", count: 4, returnable: false },
      ],
    },
    {
      focus: 0,
      silver: 0,
      amountCrafted: 1,
      materials: [
        { id: "T4_ARMOR_CLOTH_SET3", count: 1, returnable: false },
        { id: "QUESTITEM_TOKEN_ROYAL_T4", count: 4, returnable: false },
      ],
    },
  ],
  itemValue: 320,
};

// Production bonuses that give round return rates: 25% without focus, 50% with it.
const rrr25: CraftingPlace = {
  location: {
    id: "rrr25",
    name: "25% return rate",
    craftingBonus: 1 / 3,
    specialties: {},
  },
};
const rrr50WithFocus: CraftingPlace = {
  location: {
    id: "rrr50",
    name: "50% return rate with focus",
    craftingBonus: 0.41,
    specialties: {},
  },
};

const settings: EvaluateSettings = {
  focus: false,
  premium: true,
  buyMode: "instant",
  sellMode: "order",
  stationFee: 500,
};
const prices: EvaluatePrices = {
  materials: new Map([
    ["T4_PLANKS", instantOnly(1000)],
    ["T4_METALBAR", instantOnly(1500)],
    ["T4_ARTEFACT_2H_ARCANESTAFF_CRYSTAL", instantOnly(20_000)],
    ["T4_ARMOR_CLOTH_SET1", instantOnly(30_000)],
    ["T4_ARMOR_CLOTH_SET2", instantOnly(25_000)],
    ["QUESTITEM_TOKEN_ROYAL_T4", instantOnly(1000)],
  ]),
  products: new Map([
    ["T4_2H_ARCANESTAFF_CRYSTAL", instantOnly(70_000)],
    ["T4_ARMOR_CLOTH_ROYAL", instantOnly(50_000)],
  ]),
};

function withMaterials(entries: [string, OrderPrices | undefined][]) {
  const materials = new Map(prices.materials);
  for (const [id, price] of entries) {
    if (price === undefined) {
      materials.delete(id);
    } else {
      materials.set(id, price);
    }
  }
  return { ...prices, materials };
}

function complete(result: Evaluation) {
  if (result.status === "incomplete") {
    throw new Error(`Missing prices: ${result.missingPrices.join(", ")}`);
  }
  return result;
}

describe("evaluate", () => {
  it("works out the profit of a craft without focus", () => {
    const result = complete(evaluate(astralStaff, rrr25, settings, prices));

    expect(result).toMatchObject({
      itemId: "T4_2H_ARCANESTAFF_CRYSTAL",
      alternative: 0,
      missingPrices: [],
      materialCost: { status: "complete", total: 48_500 },
      stationFee: 1368,
      silverCost: 0,
      revenue: { status: "fresh", source: "sellMin", price: 70_000 },
    });
    expect(result.rrr).toBeCloseTo(0.25, 10);
    expect(result.revenue).toHaveProperty("net", expect.closeTo(65_450, 6));
    expect(result.profit).toBeCloseTo(15_582, 6);
    expect(result.margin).toBeCloseTo(15_582 / 49_868, 10);
    expect(result).not.toHaveProperty("focusCost");
    expect(result).not.toHaveProperty("silverPerFocus");
  });

  it("works out the profit with focus, and what each focus point adds", () => {
    const fce = vi.fn(() => 10_000);

    const result = complete(
      evaluate(
        astralStaff,
        rrr50WithFocus,
        { ...settings, focus: true, fce },
        prices,
      ),
    );

    expect(fce).toHaveBeenCalledWith("T4_2H_ARCANESTAFF_CRYSTAL");
    expect(result.rrr).toBeCloseTo(0.5, 10);
    expect(result.materialCost).toMatchObject({ total: 39_000 });
    expect(result.profit).toBeCloseTo(25_082, 6);
    expect(result.focusCost).toBe(857.5);
    // Without focus the return rate is 0.41 / 1.41, so the materials cost 46,950.35.
    expect(result.silverPerFocus).toBeCloseTo(
      (46_950.354_61 - 39_000) / 857.5,
      6,
    );
  });

  it("charges the full base focus when no FCE is set", () => {
    expect(
      evaluate(astralStaff, rrr25, { ...settings, focus: true }, prices)
        .focusCost,
    ).toBe(1715);
  });

  it("uses the hideout's production bonus in a hideout", () => {
    const forestHideout: CraftingPlace = {
      hideout: {
        biome: { specialties: ["sword", "bow", "arcanestaff"] },
        mapQuality: { specialtyBonus: 0.26 },
        powerLevel: { generalBonus: 0.26, specialistBonus: 0.3 },
      },
    };

    const result = evaluate(astralStaff, forestHideout, settings, prices);

    expect(result.bonus).toMatchObject({
      mapQuality: 0.26,
      powerSpecialist: 0.3,
    });
    expect(result.rrr).toBeCloseTo(0.82 / 1.82, 10);
  });

  it("adds a daily bonus for the item's category", () => {
    const result = evaluate(
      astralStaff,
      rrr25,
      { ...settings, dailyBonuses: [{ category: "arcanestaff", bonus: 0.2 }] },
      prices,
    );

    expect(result.bonus).toMatchObject({ daily: 0.2 });
    expect(result.rrr).toBeCloseTo((1 / 3 + 0.2) / (4 / 3 + 0.2), 10);
  });

  it("sells 1 silver under the lowest sell order when undercutting", () => {
    expect(
      evaluate(astralStaff, rrr25, { ...settings, undercut: true }, prices)
        .revenue,
    ).toMatchObject({ price: 69_999 });
  });

  it("is incomplete, and lists the price, when a material has no price", () => {
    const result = evaluate(
      astralStaff,
      rrr25,
      settings,
      withMaterials([["T4_METALBAR", undefined]]),
    );

    expect(result).toMatchObject({
      status: "incomplete",
      missingPrices: ["T4_METALBAR"],
    });
    expect(result).not.toHaveProperty("profit");
  });

  it("is incomplete, and lists the price, when the item has no price where it's sold", () => {
    expect(
      evaluate(astralStaff, rrr25, settings, {
        ...prices,
        products: new Map(),
      }),
    ).toMatchObject({
      status: "incomplete",
      missingPrices: ["T4_2H_ARCANESTAFF_CRYSTAL"],
    });
  });

  it("is incomplete without an item value at a paid station, and complete at a free one", () => {
    const withoutItemValue: Recipe = { ...astralStaff };
    delete withoutItemValue.itemValue;

    expect(evaluate(withoutItemValue, rrr25, settings, prices)).toMatchObject({
      status: "incomplete",
      missingPrices: [],
      stationFee: undefined,
    });
    expect(
      evaluate(withoutItemValue, rrr25, { ...settings, stationFee: 0 }, prices),
    ).toMatchObject({ status: "complete", stationFee: 0 });
  });

  it("works out the profit per item when a craft makes several", () => {
    const twoAtOnce: Recipe = { ...astralStaff, amountCrafted: 2 };

    expect(
      complete(evaluate(twoAtOnce, rrr25, settings, prices)).profit,
    ).toBeCloseTo(65_450 - 49_868 / 2, 6);
  });

  it("has no margin when the craft costs nothing", () => {
    const free: Recipe = { ...astralStaff, materials: [] };

    const result = complete(
      evaluate(free, rrr25, { ...settings, stationFee: 0 }, prices),
    );

    expect(result.profit).toBeCloseTo(65_450, 6);
    expect(result.margin).toBeUndefined();
  });

  describe("with alternatives", () => {
    it("uses the cheapest alternative that has all its prices", () => {
      const result = complete(evaluate(royalRobe, rrr25, settings, prices));

      expect(result.alternative).toBe(1);
      expect(result.materialCost).toMatchObject({ total: 29_000 });
      expect(result.profit).toBeCloseTo(46_750 - 29_000 - 180, 6);
    });

    it("keeps the default recipe when it's the cheapest", () => {
      expect(
        evaluate(
          royalRobe,
          rrr25,
          settings,
          withMaterials([["T4_ARMOR_CLOTH_SET1", instantOnly(20_000)]]),
        ).alternative,
      ).toBe(0);
    });

    it("uses an alternative when the default recipe is missing a price", () => {
      expect(
        evaluate(
          royalRobe,
          rrr25,
          settings,
          withMaterials([
            ["T4_ARMOR_CLOTH_SET1", undefined],
            ["T4_ARMOR_CLOTH_SET2", undefined],
            ["T4_ARMOR_CLOTH_SET3", instantOnly(40_000)],
          ]),
        ),
      ).toMatchObject({ status: "complete", alternative: 2 });
    });

    it("reports the default recipe when none has all its prices", () => {
      expect(
        evaluate(
          royalRobe,
          rrr25,
          settings,
          withMaterials([
            ["T4_ARMOR_CLOTH_SET1", undefined],
            ["T4_ARMOR_CLOTH_SET2", undefined],
          ]),
        ),
      ).toMatchObject({
        status: "incomplete",
        alternative: 0,
        missingPrices: ["T4_ARMOR_CLOTH_SET1"],
      });
    });

    it("has no silver per focus for a royal item, which costs no focus", () => {
      const result = complete(
        evaluate(royalRobe, rrr25, { ...settings, focus: true }, prices),
      );

      expect(result.focusCost).toBe(0);
      expect(result).not.toHaveProperty("silverPerFocus");
    });
  });
});
