import { describe, expect, it } from "vitest";

import { shownItemIds } from "./shown-items.helpers.js";

describe("shownItemIds", () => {
  it("has each item, its materials, its journals and its runes, once each, sorted", () => {
    const itemIds = shownItemIds();

    expect(itemIds).toEqual(
      expect.arrayContaining([
        "T5_MAIN_SWORD@1",
        "T5_METALBAR_LEVEL1@1",
        "T5_JOURNAL_WARRIOR_EMPTY",
        "T5_JOURNAL_WARRIOR_FULL",
        "T5_RUNE",
        "T4_CAPE",
      ]),
    );
    expect(new Set(itemIds).size).toBe(itemIds.length);
    expect(itemIds).toEqual(itemIds.toSorted());
  });
});
