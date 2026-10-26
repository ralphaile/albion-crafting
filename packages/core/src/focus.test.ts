import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { focusCost, silverPerFocus } from "./index.js";

const fces = fc.double({ min: 0, max: 100_000, noNaN: true });

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
  it("divides the profit with focus by the focus cost", () => {
    expect(silverPerFocus(20_000, 2000)).toBe(10);
  });

  it("is negative for a craft that loses silver", () => {
    expect(silverPerFocus(-5000, 2000)).toBe(-2.5);
  });

  it("is unknown for a craft that costs no focus", () => {
    expect(silverPerFocus(20_000, 0)).toBeUndefined();
  });
});
