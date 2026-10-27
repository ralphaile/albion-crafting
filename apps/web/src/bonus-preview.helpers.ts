import {
  type CraftingPlace,
  placeProductionBonus,
  returnRate,
} from "@aoc/core";

import type { BonusPreview, BonusRow } from "./bonus-preview.types";

function largestSpecialty(place: CraftingPlace): string | undefined {
  if ("hideout" in place) {
    return place.hideout.biome.specialties[0];
  }
  const [largest] = Object.entries(place.location.specialties).sort(
    ([, a], [, b]) => b - a,
  );
  return largest?.[0];
}

function bonusRow(
  place: CraftingPlace,
  craftingCategory: string | undefined,
): BonusRow {
  const bonus = placeProductionBonus(place, craftingCategory).total;
  const bonusWithFocus = placeProductionBonus(place, craftingCategory, {
    focus: true,
  }).total;
  return {
    bonus,
    bonusWithFocus,
    returnRate: returnRate(bonus),
    returnRateWithFocus: returnRate(bonusWithFocus),
  };
}

export function bonusPreview(place: CraftingPlace): BonusPreview {
  const category = largestSpecialty(place);
  return {
    base: bonusRow(place, undefined),
    specialty: category === undefined ? undefined : bonusRow(place, category),
  };
}
