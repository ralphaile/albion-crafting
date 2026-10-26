import { describe, expect, it } from "vitest";

import {
  type CraftingLocation,
  productionBonus,
  type ProductionBonusOptions,
  returnRate,
} from "./index.js";

const asPercent = (rate: number) => `${(rate * 100).toFixed(2)}%`;

const lymhurst: CraftingLocation = {
  id: "1000",
  name: "Lymhurst",
  craftingBonus: 0.18,
  specialties: { sword: 0.15, bow: 0.15, meat_goose: 0.1 },
};
const island: CraftingLocation = {
  id: "island",
  name: "Island",
  craftingBonus: 0,
  specialties: {},
};

describe("productionBonus", () => {
  it.each<
    [
      string,
      CraftingLocation,
      string | undefined,
      ProductionBonusOptions,
      string,
    ]
  >([
    ["city", lymhurst, "plate_armor", {}, "15.25%"],
    ["city, its specialty", lymhurst, "sword", {}, "24.81%"],
    ["city, with focus", lymhurst, "plate_armor", { focus: true }, "43.50%"],
    [
      "city, its specialty, with focus",
      lymhurst,
      "sword",
      { focus: true },
      "47.92%",
    ],
    ["island", island, "sword", {}, "0.00%"],
    ["island, with focus", island, "sword", { focus: true }, "37.11%"],
    [
      "city, with a daily +20%",
      lymhurst,
      "plate_armor",
      { dailyBonuses: [{ category: "plate_armor", bonus: 0.2 }] },
      "27.54%",
    ],
    [
      "city, its specialty, with a daily +20% and focus",
      lymhurst,
      "sword",
      { focus: true, dailyBonuses: [{ category: "sword", bonus: 0.2 }] },
      "52.83%",
    ],
    [
      "city, with a daily bonus for another category",
      lymhurst,
      "plate_armor",
      { dailyBonuses: [{ category: "sword", bonus: 0.2 }] },
      "15.25%",
    ],
    [
      "city, an item with no crafting category",
      lymhurst,
      undefined,
      {},
      "15.25%",
    ],
  ])(
    "%s gives a return rate of %s",
    (_case, location, category, options, expected) => {
      expect(
        asPercent(
          returnRate(productionBonus(location, category, options).total),
        ),
      ).toBe(expected);
    },
  );

  it("breaks the bonus down into its parts", () => {
    const bonus = productionBonus(lymhurst, "sword", {
      focus: true,
      dailyBonuses: [
        { category: "sword", bonus: 0.1 },
        { category: "bow", bonus: 0.2 },
      ],
    });

    expect(bonus).toEqual({
      base: 0.18,
      specialty: 0.15,
      daily: 0.1,
      focus: 0.59,
      total: bonus.total,
    });
    expect(bonus.total).toBeCloseTo(1.02, 10);
  });

  it("adds up two daily bonuses for the same category", () => {
    const { daily } = productionBonus(lymhurst, "sword", {
      dailyBonuses: [
        { category: "sword", bonus: 0.1 },
        { category: "sword", bonus: 0.2 },
      ],
    });

    expect(daily).toBeCloseTo(0.3, 10);
  });

  it("uses the production bonus shown in game instead, and keeps the parts for comparison", () => {
    expect(
      productionBonus(lymhurst, "sword", {
        focus: true,
        override: { productionBonus: 0.95 },
      }),
    ).toEqual({
      base: 0.18,
      specialty: 0.15,
      daily: 0,
      focus: 0.59,
      override: 0.95,
      total: 0.95,
    });
  });

  it("turns a return rate shown in game into the production bonus that gives it", () => {
    const bonus = productionBonus(lymhurst, "sword", {
      override: { returnRate: 0.5 },
    });

    expect(bonus).toMatchObject({ override: 1, total: 1 });
    expect(asPercent(returnRate(bonus.total))).toBe("50.00%");
  });

  it.each([
    {
      case: "a negative production bonus",
      override: { productionBonus: -0.1 },
    },
    {
      case: "an endless production bonus",
      override: { productionBonus: Infinity },
    },
    { case: "a return rate of 100%", override: { returnRate: 1 } },
    { case: "a negative return rate", override: { returnRate: -0.1 } },
  ])("refuses $case", ({ override }) => {
    expect(() => productionBonus(lymhurst, "sword", { override })).toThrow(
      RangeError,
    );
  });
});
