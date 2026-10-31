import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { focusCost, silverPerFocus, specializationFce } from "./index.js";

const fces = fc.double({ min: 0, max: 100_000, noNaN: true });

const levels = fc.integer({ min: 0, max: 100 });

describe("focusCost", () => {
  it.each([
    ["base focus 1000 at FCE 5000", 1000, 5000, 707.107],
    ["Expert's Broadsword .1 at FCE 0", 3939, 0, 3939],
    ["Expert's Broadsword .1 at FCE 10000", 3939, 10_000, 1969.5],
    ["Expert's Broadsword .1 at FCE 20000", 3939, 20_000, 984.75],
    ["a royal item, which costs no focus", 0, 5000, 0],
  ])("%s costs %s", (_case, baseFocus, fce, expected) => {
    expect(focusCost(baseFocus, fce)).toBeCloseTo(expected, 3);
  });

  it("costs the base focus when no FCE is set", () => {
    expect(focusCost(3939)).toBe(3939);
  });

  it("halves with every 10,000 FCE", () => {
    fc.assert(
      fc.property(fces, (fce) => {
        expect(focusCost(3939, fce + 10_000)).toBeCloseTo(
          focusCost(3939, fce) / 2,
          6,
        );
      }),
    );
  });

  it("never rises as FCE rises", () => {
    fc.assert(
      fc.property(fces, fces, (a, b) => {
        const [low, high] = a < b ? [a, b] : [b, a];
        expect(focusCost(3939, high)).toBeLessThanOrEqual(focusCost(3939, low));
      }),
    );
  });

  it.each([-1, Number.NaN, Infinity])("refuses an FCE of %s", (fce) => {
    expect(() => focusCost(3939, fce)).toThrow(RangeError);
  });
});

describe("silverPerFocus", () => {
  it.each([
    ["a craft that's profitable anyway", 60_000, 50_000, 5],
    ["a craft that only pays with focus", 20_000, -10_000, 15],
  ])(
    "divides what focus adds by the focus cost, for %s",
    (_case, withFocus, withoutFocus, expected) => {
      expect(silverPerFocus(withFocus, withoutFocus, 2000)).toBe(expected);
    },
  );

  it("is unknown for a craft that costs no focus", () => {
    expect(silverPerFocus(20_000, 10_000, 0)).toBeUndefined();
  });
});

describe("specializationFce", () => {
  // Sword mastery 100, Broadsword 100, and Claymore 40 among the other swords.
  it("adds 30 a mastery level, 250 a level of the item's own spec and 30 a level of each other spec", () => {
    expect(
      specializationFce({ mastery: 100, spec: 100, otherSpecs: [40, 0, 0] }),
    ).toEqual({ mastery: 3000, spec: 25_000, otherSpecs: 1200, total: 29_200 });
  });

  it("is 0 with no levels", () => {
    expect(
      specializationFce({ mastery: 0, spec: 0, otherSpecs: [] }).total,
    ).toBe(0);
  });

  it("adds the same for a level wherever it comes from in the other specs", () => {
    fc.assert(
      fc.property(levels, levels, levels, (mastery, spec, other) => {
        expect(
          specializationFce({ mastery, spec, otherSpecs: [other, 0] }).total,
        ).toBe(
          specializationFce({ mastery, spec, otherSpecs: [0, other] }).total,
        );
      }),
    );
  });

  it.each([-1, Number.NaN, Infinity])("refuses a level of %s", (level) => {
    expect(() =>
      specializationFce({ mastery: 0, spec: 0, otherSpecs: [level] }),
    ).toThrow(RangeError);
  });
});
