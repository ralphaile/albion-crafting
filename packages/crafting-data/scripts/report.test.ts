import { describe, expect, it } from "vitest";

import type { DataDiff } from "./diff.ts";
import { formatReport } from "./report.ts";

const noChanges: DataDiff = {
  totals: {
    items: { added: 0, removed: 0 },
    recipes: { added: 0, removed: 0, changed: 0 },
    bonuses: { added: 0, removed: 0, changed: 0 },
  },
  bonuses: [],
  removedItems: [],
  addedItems: [],
  recipes: [],
};

const commits = {
  repository: "ao-data/ao-bin-dumps",
  before: "1a469e53de",
  after: "2b57af64ef",
};

function numbered(what: string, n: number) {
  return Array.from({ length: n }, (_, i) => `${what} ${String(i + 1)}`);
}

describe("formatReport", () => {
  it("says when nothing changed", () => {
    expect(formatReport(noChanges, { ...commits, after: commits.before })).toBe(
      [
        "## Game data changes",
        "",
        "`ao-data/ao-bin-dumps` at 1a469e53de",
        "",
        "No changes.",
        "",
      ].join("\n"),
    );
  });

  it("shows the totals, then the changes with the bonuses first", () => {
    const diff: DataDiff = {
      totals: {
        items: { added: 1, removed: 1 },
        recipes: { added: 5, removed: 5, changed: 1200 },
        bonuses: { added: 0, removed: 0, changed: 1 },
      },
      bonuses: ["Lymhurst, sword: 0.15 → 0.2"],
      removedItems: ["`T4_MAIN_SWORD` Adept's Broadsword 4.0"],
      addedItems: ["`T4_MAIN_AXE` Adept's Battleaxe 4.0"],
      recipes: ["`T5_MAIN_SWORD@1` Expert's Broadsword 5.1: focus 3939 → 3800"],
    };

    expect(formatReport(diff, commits)).toBe(
      [
        "## Game data changes",
        "",
        "`ao-data/ao-bin-dumps` 1a469e53de → 2b57af64ef",
        "",
        "|                  | Added | Removed | Changed |",
        "| ---------------- | ----: | ------: | ------: |",
        "| Items | 1 | 1 |  |",
        "| Recipes | 5 | 5 | 1,200 |",
        "| Crafting bonuses | 0 | 0 | 1 |",
        "",
        "### Crafting bonuses",
        "",
        "- Lymhurst, sword: 0.15 → 0.2",
        "",
        "### Removed items",
        "",
        "- `T4_MAIN_SWORD` Adept's Broadsword 4.0",
        "",
        "### Added items",
        "",
        "- `T4_MAIN_AXE` Adept's Battleaxe 4.0",
        "",
        "### Changed recipes",
        "",
        "- `T5_MAIN_SWORD@1` Expert's Broadsword 5.1: focus 3939 → 3800",
        "",
      ].join("\n"),
    );
  });

  it("lists at most 50 changes, then counts the rest", () => {
    const report = formatReport(
      {
        ...noChanges,
        bonuses: numbered("bonus", 48),
        addedItems: numbered("item", 5),
        recipes: numbered("recipe", 2),
      },
      commits,
    );

    expect(report.split("\n").filter((line) => line.startsWith("- "))).toEqual([
      ...numbered("- bonus", 48),
      "- item 1",
      "- item 2",
    ]);
    expect(report).not.toContain("### Changed recipes");
    expect(report).toMatch(/\n…and 5 more\.\n$/);
  });
});
