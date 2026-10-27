import {
  type CraftingPlace,
  placeProductionBonus,
  returnRate,
} from "@aoc/core";

import type { PlaceReturnRates, ReturnRates } from "./return-rates.types";

function largestSpecialty(place: CraftingPlace): string | undefined {
  if ("hideout" in place) {
    return place.hideout.biome.specialties[0];
  }
  const [largest] = Object.entries(place.location.specialties).sort(
    ([, a], [, b]) => b - a,
  );
  return largest?.[0];
}

function returnRates(
  place: CraftingPlace,
  craftingCategory: string | undefined,
): ReturnRates {
  return {
    withoutFocus: returnRate(
      placeProductionBonus(place, craftingCategory).total,
    ),
    withFocus: returnRate(
      placeProductionBonus(place, craftingCategory, { focus: true }).total,
    ),
  };
}

export function placeReturnRates(place: CraftingPlace): PlaceReturnRates {
  const category = largestSpecialty(place);
  return {
    base: returnRates(place, undefined),
    specialty:
      category === undefined ? undefined : returnRates(place, category),
  };
}
