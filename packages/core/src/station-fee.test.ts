import { describe, expect, it } from "vitest";

import { stationFee } from "./index.js";

describe("stationFee", () => {
  it.each([
    ["Adept's Broadsword", 384, 500, 216],
    ["Adept's Arcane Staff", 512, 1000, 576],
    ["Master's Clarent Blade, artifact included", 1920, 500, 1080],
    ["Adept's Broadsword at 1 silver", 384, 1, 0.432],
  ])(
    "%s, item value %s, at %s per 100 nutrition costs %s",
    (_item, itemValue, fee, expected) => {
      expect(stationFee(itemValue, fee)).toBeCloseTo(expected, 10);
    },
  );

  it("costs nothing at a free station", () => {
    expect(stationFee(384, 0)).toBe(0);
  });

  it("costs nothing at a free station, even for an item with no item value", () => {
    expect(stationFee(undefined, 0)).toBe(0);
  });

  it("is unknown for an item with no item value at a paid station", () => {
    expect(stationFee(undefined, 500)).toBeUndefined();
  });

  it.each([-1, Number.NaN, Infinity])("refuses a fee of %s", (fee) => {
    expect(() => stationFee(384, fee)).toThrow(RangeError);
  });
});
