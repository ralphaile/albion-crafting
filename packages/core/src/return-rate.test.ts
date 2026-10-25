import { describe, expect, it } from "vitest";

import { returnRate } from "./return-rate.js";

const asPercent = (rate: number) => `${(rate * 100).toFixed(2)}%`;

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
});
