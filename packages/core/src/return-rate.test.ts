import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { returnRate } from "./return-rate.js";

const asPercent = (rate: number) => `${(rate * 100).toFixed(2)}%`;

const productionBonuses = fc.double({ min: 0, max: 10, noNaN: true });
const bonusIncreases = fc.double({ min: 0.0001, max: 10, noNaN: true });

describe("returnRate", () => {
  it.each([
    ["royal city", 0.18, "15.25%"],
    ["royal city specialty", 0.33, "24.81%"],
    ["royal city with focus", 0.77, "43.50%"],
    ["royal city specialty with focus", 0.92, "47.92%"],
    ["Q6 level 9 hideout specialty", 0.82, "45.05%"],
    ["Q6 level 9 hideout specialty with focus", 1.41, "58.51%"],
  ])(
    "%s: production bonus %s gives %s",
    (_location, productionBonus, expected) => {
      expect(asPercent(returnRate(productionBonus))).toBe(expected);
    },
  );

  it("is at least 0 and always below 1", () => {
    fc.assert(
      fc.property(productionBonuses, (bonus) => {
        const rate = returnRate(bonus);
        expect(rate).toBeGreaterThanOrEqual(0);
        expect(rate).toBeLessThan(1);
      }),
    );
  });

  it("rises as the production bonus rises", () => {
    fc.assert(
      fc.property(productionBonuses, bonusIncreases, (bonus, increase) => {
        expect(returnRate(bonus + increase)).toBeGreaterThan(returnRate(bonus));
      }),
    );
  });
});
