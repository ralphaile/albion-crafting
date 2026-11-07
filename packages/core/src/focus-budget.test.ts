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
    silverPerFocus: 1,
    maxQuantity: 100,
    ...changes,
  };
}

describe("fillFocusBudget", () => {
  it("spends the focus where it adds the most silver first, not on the most profit", () => {
    const picks = fillFocusBudget(
      [
        candidate({ itemId: "LOW", profitPerCraft: 9000, silverPerFocus: 1 }),
        candidate({ itemId: "HIGH", silverPerFocus: 3, maxQuantity: 6 }),
        candidate({ itemId: "MID", silverPerFocus: 2 }),
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
        candidate({ itemId: "DEAR", silverPerFocus: 5, costPerCraft: 4000 }),
        candidate({ itemId: "CHEAP", silverPerFocus: 2, costPerCraft: 500 }),
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

  it("leaves out crafts that lose silver, need no focus, or that focus doesn't help", () => {
    expect(
      fillFocusBudget(
        [
          candidate({ itemId: "LOSS", profitPerCraft: -100 }),
          candidate({ itemId: "FREE", focusPerCraft: 0 }),
          candidate({ itemId: "NO_GAIN", silverPerFocus: 0 }),
        ],
        { focus: 10_000 },
      ),
    ).toEqual([]);
  });
});
