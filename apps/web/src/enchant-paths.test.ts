import { describe, expect, it } from "vitest";

import type { Craft, UsedItemPrices } from "./best-crafts.types";
import { withEnchantPaths } from "./enchant-paths.helpers";
import { RECIPES_BY_ID } from "./recipes.constants";

// Only what the paths read: the cost of each level and its journal value.
function craftOf(
  itemId: string,
  {
    materials,
    profit,
    journal,
  }: { materials: number; profit: number; journal: number },
): Craft {
  const recipe = RECIPES_BY_ID.get(itemId);
  if (recipe === undefined) throw new Error(`No recipe for ${itemId}`);
  return {
    itemId,
    recipe,
    alternative: 0,
    status: "complete",
    profit,
    materialCost: { status: "complete", total: materials, lines: [] },
    stationFee: 0,
    silverCost: 0,
    journal: { value: journal },
  } as unknown as Craft;
}

const runes = {
  itemId: "T5_RUNE",
  sellMin: { status: "fresh", value: 10, origin: "api" },
  buyMax: { status: "missing", origin: "api" },
} as unknown as UsedItemPrices;

function profitOf(craft: Craft | undefined): number | undefined {
  return craft?.status === "complete" ? craft.profit : undefined;
}

describe("withEnchantPaths", () => {
  const swordAt1 = craftOf("T5_MAIN_SWORD@1", {
    materials: 20_000,
    profit: 5000,
    journal: 400,
  });
  const swordAt0 = craftOf("T5_MAIN_SWORD", {
    materials: 1000,
    profit: 0,
    journal: 100,
  });

  it("gives a T5 sword .1 both paths, without changing its profit", () => {
    const [craft] = withEnchantPaths([swordAt1], [swordAt0], [runes], {
      buyMode: "instant",
      rank: false,
    });

    expect(craft?.enchantPaths).toMatchObject({
      direct: 20_000,
      upgraded: { from: 0, total: 1000 + 288 * 10 },
      cheaper: "upgraded",
    });
    expect(craft?.upgradeMaterials).toEqual([
      expect.objectContaining({ itemId: "T5_RUNE", count: 288 }),
    ]);
    expect(profitOf(craft)).toBe(5000);
  });

  it("ranks by the cheaper path, with the journal value of the craft it starts from", () => {
    const [craft] = withEnchantPaths([swordAt1], [swordAt0], [runes], {
      buyMode: "instant",
      rank: true,
    });

    const saved = 20_000 - (1000 + 288 * 10);
    expect(profitOf(craft)).toBe(5000 + saved - 400 + 100);
  });
});
