import type { CraftingPlace } from "./evaluate.types.js";
import { hideoutProductionBonus } from "./hideout-bonus.helpers.js";
import { productionBonus } from "./production-bonus.helpers.js";

export function hasSpecialty(
  place: CraftingPlace,
  craftingCategory: string | undefined,
): boolean {
  if ("hideout" in place) {
    const { mapQuality, powerSpecialist } = hideoutProductionBonus(
      place.hideout,
      craftingCategory,
    );
    return mapQuality + powerSpecialist > 0;
  }
  return productionBonus(place.location, craftingCategory).specialty > 0;
}
