import { describe, expect, it } from "vitest";

import {
  type Hideout,
  hideoutProductionBonus,
  type ProductionBonusOptions,
  returnRate,
} from "./index.js";

const asPercent = (rate: number) => `${(rate * 100).toFixed(2)}%`;

const forest = {
  specialties: [
    "sword",
    "bow",
    "arcanestaff",
    "leather_helmet",
    "leather_shoes",
  ],
};
const best: Hideout = {
  biome: forest,
  mapQuality: { specialtyBonus: 0.26 },
  powerLevel: { generalBonus: 0.26, specialistBonus: 0.3 },
};
const worst: Hideout = {
  biome: forest,
  mapQuality: { specialtyBonus: 0.01 },
  powerLevel: { generalBonus: 0, specialistBonus: 0 },
};

describe("hideoutProductionBonus", () => {
  it.each<
    [
      string,
      Hideout,
      string | undefined,
      ProductionBonusOptions,
      number,
      string,
    ]
  >([
    ["Q6 level 9, its specialty", best, "sword", {}, 0.82, "45.05%"],
    [
      "Q6 level 9, its specialty, with focus",
      best,
      "sword",
      { focus: true },
      1.41,
      "58.51%",
    ],
    ["Q6 level 9, another item", best, "plate_armor", {}, 0.26, "20.63%"],
    [
      "Q6 level 9, another item, with focus",
      best,
      "plate_armor",
      { focus: true },
      0.85,
      "45.95%",
    ],
    ["Q1 level 1, its specialty", worst, "sword", {}, 0.01, "0.99%"],
    ["Q1 level 1, another item", worst, "plate_armor", {}, 0, "0.00%"],
    [
      "Q6 level 9, its specialty, with a daily +20%",
      best,
      "sword",
      { dailyBonuses: [{ category: "sword", bonus: 0.2 }] },
      1.02,
      "50.50%",
    ],
    [
      "Q6 level 9, another item, with a daily +20%",
      best,
      "plate_armor",
      { dailyBonuses: [{ category: "plate_armor", bonus: 0.2 }] },
      0.46,
      "31.51%",
    ],
    [
      "Q6 level 9, an item with no crafting category",
      best,
      undefined,
      {},
      0.26,
      "20.63%",
    ],
  ])(
    "%s has a production bonus of %s and a return rate of %s",
    (_case, hideout, category, options, bonus, rate) => {
      const { total } = hideoutProductionBonus(hideout, category, options);

      expect(total).toBeCloseTo(bonus, 10);
      expect(asPercent(returnRate(total))).toBe(rate);
    },
  );

  it("breaks the bonus down into its parts", () => {
    const bonus = hideoutProductionBonus(best, "sword", {
      focus: true,
      dailyBonuses: [{ category: "sword", bonus: 0.1 }],
    });

    expect(bonus).toEqual({
      mapQuality: 0.26,
      powerGeneral: 0.26,
      powerSpecialist: 0.3,
      daily: 0.1,
      focus: 0.59,
      total: bonus.total,
    });
  });

  it("gives an item outside the biome's categories only the general bonus", () => {
    expect(hideoutProductionBonus(best, "plate_armor")).toEqual({
      mapQuality: 0,
      powerGeneral: 0.26,
      powerSpecialist: 0,
      daily: 0,
      focus: 0,
      total: 0.26,
    });
  });

  it("uses the production bonus shown in game instead, and keeps the parts for comparison", () => {
    expect(
      hideoutProductionBonus(best, "sword", {
        override: { productionBonus: 0.9 },
      }),
    ).toEqual({
      mapQuality: 0.26,
      powerGeneral: 0.26,
      powerSpecialist: 0.3,
      daily: 0,
      focus: 0,
      override: 0.9,
      total: 0.9,
    });
  });

  it("turns a return rate shown in game into the production bonus that gives it", () => {
    expect(
      hideoutProductionBonus(best, "sword", {
        override: { returnRate: 0.5 },
      }),
    ).toMatchObject({ override: 1, total: 1 });
  });

  it("refuses an override that isn't a production bonus", () => {
    expect(() =>
      hideoutProductionBonus(best, "sword", {
        override: { productionBonus: -0.1 },
      }),
    ).toThrow(RangeError);
  });
});
