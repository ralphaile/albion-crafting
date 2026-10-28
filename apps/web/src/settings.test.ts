import { describe, expect, it } from "vitest";

import { recipes } from "@aoc/crafting-data";

import { DAILY_BONUS_GROUPS, DEFAULT_SETTINGS } from "./settings.constants";
import { parseSettings } from "./settings.schema";

describe("parseSettings", () => {
  it("keeps settings that fit", () => {
    const settings = {
      focus: false,
      premium: false,
      stationFee: 1200,
      buyMode: "order",
      sellMode: "instant",
      dailyBonuses: [
        { category: "sword", bonus: 0.2 },
        { category: "offhand", bonus: 0.1 },
      ],
      staleAfterHours: 24,
      server: "europe",
    };

    expect(parseSettings(settings)).toEqual(settings);
  });

  it.each([undefined, null, "settings", []])(
    "falls back to the defaults for %j",
    (raw) => {
      expect(parseSettings(raw)).toEqual(DEFAULT_SETTINGS);
    },
  );

  it("falls back one setting at a time", () => {
    expect(
      parseSettings({
        ...DEFAULT_SETTINGS,
        focus: false,
        premium: "yes",
        stationFee: -1,
        staleAfterHours: 0,
        server: "mars",
      }),
    ).toEqual({ ...DEFAULT_SETTINGS, focus: false });
  });

  it.each([12.5, 100_001])("refuses a station fee of %d", (stationFee) => {
    expect(parseSettings({ stationFee }).stationFee).toBe(
      DEFAULT_SETTINGS.stationFee,
    );
  });

  it("refuses the Black Market as a way of selling", () => {
    expect(parseSettings({ sellMode: "blackMarket" }).sellMode).toBe("order");
  });

  it("keeps up to two daily bonuses it knows", () => {
    expect(
      parseSettings({
        dailyBonuses: [
          { category: "sword", bonus: 0.3 },
          { category: "pickaxe", bonus: 0.1 },
          { category: "bow", bonus: 0.1 },
          { category: "bow", bonus: 0.2 },
          { category: "axe", bonus: 0.2 },
        ],
      }).dailyBonuses,
    ).toEqual([
      { category: "bow", bonus: 0.1 },
      { category: "bow", bonus: 0.2 },
    ]);
  });
});

describe("the daily bonus list", () => {
  it("offers every crafting category the recipes have", () => {
    const offered = DAILY_BONUS_GROUPS.flatMap(({ options }) =>
      options.map(({ id }) => id),
    );
    const crafted = new Set(
      recipes.flatMap(({ craftingCategory }) =>
        craftingCategory === undefined ? [] : [craftingCategory],
      ),
    );

    expect([...offered].sort()).toEqual([...crafted].sort());
  });
});
