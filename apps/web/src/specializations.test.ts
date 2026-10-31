import { describe, expect, it } from "vitest";

import { craftingTrees } from "@aoc/crafting-data";

import { TREE_GROUPS } from "./specializations.constants";
import { withLevel } from "./specializations.helpers";
import { parseSpecializations } from "./specializations.schema";

describe("parseSpecializations", () => {
  it("keeps the levels that fit", () => {
    const profile = {
      sword: {
        mastery: 100,
        specializations: { MAIN_SWORD: 100, "2H_CLAYMORE": 40 },
      },
      plate_armor: { mastery: 0, specializations: { ARMOR_PLATE_SET1: 20 } },
    };

    expect(parseSpecializations(profile)).toEqual(profile);
  });

  it("leaves out levels of 0, and trees with no level above 0", () => {
    expect(
      parseSpecializations({
        sword: { mastery: 50, specializations: { MAIN_SWORD: 0 } },
        axe: { mastery: 0, specializations: { MAIN_AXE: 0 } },
      }),
    ).toEqual({ sword: { mastery: 50, specializations: {} } });
  });

  it("drops the trees and specializations it doesn't know", () => {
    expect(
      parseSpecializations({
        sword: {
          mastery: 10,
          specializations: { MAIN_AXE: 30, NOT_AN_ITEM: 30 },
        },
        bagtype: { mastery: 100, specializations: {} },
      }),
    ).toEqual({ sword: { mastery: 10, specializations: {} } });
  });

  it.each([101, -1, 12.5, "50", null])("counts a level of %j as 0", (level) => {
    expect(
      parseSpecializations({
        sword: { mastery: level, specializations: { MAIN_SWORD: 30 } },
        axe: { mastery: 30, specializations: { MAIN_AXE: level } },
      }),
    ).toEqual({
      sword: { mastery: 0, specializations: { MAIN_SWORD: 30 } },
      axe: { mastery: 30, specializations: {} },
    });
  });

  it.each([undefined, null, "sword", [1, 2], { sword: "max" }])(
    "is empty for %j",
    (raw) => {
      expect(parseSpecializations(raw)).toEqual({});
    },
  );
});

describe("withLevel", () => {
  const profile = {
    sword: { mastery: 100, specializations: { MAIN_SWORD: 100 } },
  };

  it("sets a tree's mastery", () => {
    expect(withLevel(profile, "sword", undefined, 60)).toEqual({
      sword: { mastery: 60, specializations: { MAIN_SWORD: 100 } },
    });
  });

  it("sets a specialization, in a tree it doesn't have yet", () => {
    expect(withLevel(profile, "axe", "MAIN_AXE", 20)).toEqual({
      ...profile,
      axe: { mastery: 0, specializations: { MAIN_AXE: 20 } },
    });
  });

  it("leaves out a level set to 0, and a tree with none left", () => {
    const noBroadsword = withLevel(profile, "sword", "MAIN_SWORD", 0);

    expect(noBroadsword).toEqual({
      sword: { mastery: 100, specializations: {} },
    });
    expect(withLevel(noBroadsword, "sword", undefined, 0)).toEqual({});
  });
});

describe("the tree groups", () => {
  it("have every crafting tree once", () => {
    expect(
      TREE_GROUPS.flatMap(({ options }) => options.map(({ id }) => id)).sort(),
    ).toEqual(craftingTrees.map(({ id }) => id).sort());
  });
});
