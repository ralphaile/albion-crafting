import { describe, expect, it } from "vitest";

import { type CraftingPlace, placeProductionBonus } from "./index.js";

const lymhurst: CraftingPlace = {
  location: {
    id: "1000",
    name: "Lymhurst",
    craftingBonus: 0.18,
    specialties: { sword: 0.15 },
  },
};
const forestHideout: CraftingPlace = {
  hideout: {
    biome: { specialties: ["sword"] },
    mapQuality: { specialtyBonus: 0.26 },
    powerLevel: { generalBonus: 0.26, specialistBonus: 0.3 },
  },
};

describe("placeProductionBonus", () => {
  it("gives a city's base and specialty bonus", () => {
    expect(placeProductionBonus(lymhurst, "sword")).toMatchObject({
      base: 0.18,
      specialty: 0.15,
    });
    expect(placeProductionBonus(lymhurst, "sword").total).toBeCloseTo(0.33);
  });

  it("gives a hideout's map quality and power level bonuses", () => {
    expect(placeProductionBonus(forestHideout, "sword")).toMatchObject({
      mapQuality: 0.26,
      powerGeneral: 0.26,
      powerSpecialist: 0.3,
    });
    expect(placeProductionBonus(forestHideout, "sword").total).toBeCloseTo(
      0.82,
    );
  });

  it("passes on focus and the daily bonuses", () => {
    expect(
      placeProductionBonus(forestHideout, "bow", {
        focus: true,
        dailyBonuses: [{ category: "bow", bonus: 0.1 }],
      }).total,
    ).toBeCloseTo(0.26 + 0.59 + 0.1);
  });
});
