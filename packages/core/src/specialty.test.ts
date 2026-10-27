import { describe, expect, it } from "vitest";

import { type CraftingPlace, hasSpecialty } from "./index.js";

const lymhurst: CraftingPlace = {
  location: {
    id: "1000",
    name: "Lymhurst",
    craftingBonus: 0.18,
    specialties: { sword: 0.15, bow: 0.15 },
  },
};
const island: CraftingPlace = {
  location: { id: "island", name: "Island", craftingBonus: 0, specialties: {} },
};
const forestHideout: CraftingPlace = {
  hideout: {
    biome: { specialties: ["sword"] },
    mapQuality: { specialtyBonus: 0.26 },
    powerLevel: { generalBonus: 0.26, specialistBonus: 0.3 },
  },
};
const bareHideout: CraftingPlace = {
  hideout: {
    biome: { specialties: ["sword"] },
    mapQuality: { specialtyBonus: 0 },
    powerLevel: { generalBonus: 0, specialistBonus: 0 },
  },
};

describe("hasSpecialty", () => {
  it.each([
    [true, "a city's specialty", lymhurst, "sword"],
    [false, "another category in a city", lymhurst, "axe"],
    [false, "an island", island, "sword"],
    [true, "a hideout's biome category", forestHideout, "sword"],
    [false, "another category in a hideout", forestHideout, "axe"],
    [false, "a biome category with no bonus yet", bareHideout, "sword"],
    [false, "an item with no crafting category", lymhurst, undefined],
  ])("is %s for %s", (expected, _case, place, craftingCategory) => {
    expect(hasSpecialty(place, craftingCategory)).toBe(expected);
  });
});
