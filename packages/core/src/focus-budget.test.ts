import { describe, expect, it } from "vitest";

import { fillFocusBudget } from "./focus-budget.helpers.js";
import type { FocusCandidate } from "./focus-budget.types.js";

function candidate(changes: Partial<FocusCandidate>): FocusCandidate {
  return {
    itemId: "T4_MAIN_SWORD",
    alternative: 0,
    amountCrafted: 1,
    focusPerCraft: 1000,
    costPerCraft: 2000,
    profitPerCraft: 3000,
    maxQuantity: 100,
    ...changes,
  };
}

describe("fillFocusBudget", () => {
  it("spends the focus on the most silver per focus first", () => {
    const picks = fillFocusBudget(
      [
        candidate({ itemId: "LOW", profitPerCraft: 1000 }),
        candidate({ itemId: "HIGH", profitPerCraft: 5000, maxQuantity: 6 }),
        candidate({ itemId: "MID", profitPerCraft: 3000 }),
      ],
      { focus: 10_000 },
    );

    expect(picks.map(({ itemId, crafts }) => [itemId, crafts])).toEqual([
      ["HIGH", 6],
      ["MID", 4],
    ]);
    expect(picks.reduce((sum, { focus }) => sum + focus, 0)).toBe(10_000);
  });

  it("stops at the silver budget, and goes on with crafts that still fit it", () => {
    const picks = fillFocusBudget(
      [
        candidate({ itemId: "DEAR", profitPerCraft: 5000, costPerCraft: 4000 }),
        candidate({ itemId: "CHEAP", profitPerCraft: 2000, costPerCraft: 500 }),
      ],
      { focus: 10_000, silver: 9000 },
    );

    expect(picks).toEqual([
      expect.objectContaining({ itemId: "DEAR", crafts: 2, cost: 8000 }),
      expect.objectContaining({ itemId: "CHEAP", crafts: 2, cost: 1000 }),
    ]);
  });

  it("caps each item's quantity in whole crafts", () => {
    const picks = fillFocusBudget(
      [
        candidate({ itemId: "POTION", amountCrafted: 5, maxQuantity: 12 }),
        candidate({ itemId: "BATCH", amountCrafted: 10, maxQuantity: 9 }),
      ],
      { focus: 10_000 },
    );

    expect(picks).toEqual([
      expect.objectContaining({ itemId: "POTION", crafts: 2, quantity: 10 }),
    ]);
  });

  it("leaves out crafts that lose silver or need no focus", () => {
    expect(
      fillFocusBudget(
        [
          candidate({ itemId: "LOSS", profitPerCraft: -100 }),
          candidate({ itemId: "FREE", focusPerCraft: 0 }),
        ],
        { focus: 10_000 },
      ),
    ).toEqual([]);
  });
});
