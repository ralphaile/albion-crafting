import { describe, expect, it } from "vitest";

import { enchantPaths } from "./index.js";

// A T5 broadsword: 288 runes, souls or relics per level, from the game files.
const UPGRADES = ["T5_RUNE", "T5_SOUL", "T5_RELIC"];

function sword(
  crafts: Record<number, number | undefined>,
  unitPrices: Record<string, number | undefined>,
) {
  return {
    craft: (level: number) => crafts[level],
    upgrade: (level: number) => {
      const materialId = UPGRADES[level - 1];
      if (materialId === undefined) {
        return undefined;
      }
      const price = unitPrices[materialId];
      return {
        materialId,
        count: 288,
        cost: price === undefined ? undefined : price * 288,
      };
    },
  };
}

describe("enchantPaths", () => {
  it("prefers crafting a T5 sword .1 directly when the runes cost more than the enchanted materials", () => {
    const paths = enchantPaths(
      1,
      sword({ 0: 10_000, 1: 30_000 }, { T5_RUNE: 100 }),
    );

    expect(paths).toEqual({
      level: 1,
      direct: 30_000,
      upgraded: {
        from: 0,
        craftCost: 10_000,
        steps: [{ to: 1, materialId: "T5_RUNE", count: 288, cost: 28_800 }],
        total: 38_800,
      },
      cheaper: "direct",
    });
  });

  it("chains runes and souls from .0 to .2 when that's cheaper", () => {
    const paths = enchantPaths(
      2,
      sword(
        { 0: 10_000, 1: 60_000, 2: 200_000 },
        { T5_RUNE: 50, T5_SOUL: 200 },
      ),
    );

    expect(paths.upgraded).toMatchObject({
      from: 0,
      total: 10_000 + 288 * 50 + 288 * 200,
    });
    expect(paths.upgraded?.steps.map(({ materialId }) => materialId)).toEqual([
      "T5_RUNE",
      "T5_SOUL",
    ]);
    expect(paths.cheaper).toBe("upgraded");
  });

  it("starts from the cheapest lower level", () => {
    const paths = enchantPaths(
      2,
      sword(
        { 0: 10_000, 1: 12_000, 2: 200_000 },
        { T5_RUNE: 500, T5_SOUL: 200 },
      ),
    );

    expect(paths.upgraded).toMatchObject({
      from: 1,
      total: 12_000 + 288 * 200,
    });
  });

  it("has no upgraded path without the upgrade material's price", () => {
    const paths = enchantPaths(1, sword({ 0: 10_000, 1: 30_000 }, {}));

    expect(paths.upgraded).toBeUndefined();
    expect(paths.cheaper).toBe("direct");
  });

  it("can only be upgraded when crafting it directly has no price", () => {
    const paths = enchantPaths(1, sword({ 0: 10_000 }, { T5_RUNE: 10 }));

    expect(paths.cheaper).toBe("upgraded");
  });
});
