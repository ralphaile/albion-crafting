import type { CraftingPlace } from "./evaluate.types.js";
import { hideoutProductionBonus } from "./hideout-bonus.helpers.js";
import { productionBonus } from "./production-bonus.helpers.js";

export function hasSpecialty(
  place: CraftingPlace,
  craftingCategory: string | undefined,
  { refining = false }: { refining?: boolean } = {},
): boolean {
  if ("hideout" in place) {
    const { mapQuality, powerSpecialist } = hideoutProductionBonus(
      place.hideout,
      craftingCategory,
      { refining },
    );
    return mapQuality + powerSpecialist > 0;
  }
  return (
    productionBonus(place.location, craftingCategory, { refining }).specialty >
    0
  );
}
