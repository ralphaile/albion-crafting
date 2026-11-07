import type { Hideout, HideoutProductionBonus } from "./hideout-bonus.types.js";
import { dailyAndFocus, withTotal } from "./production-bonus.helpers.js";
import type { ProductionBonusOptions } from "./production-bonus.types.js";

// Refining in a hideout gets its flat refining bonus in place of the power
// level and map quality, which only count for crafting.
export function hideoutProductionBonus(
  { biome, mapQuality, powerLevel, refiningBonus }: Hideout,
  craftingCategory: string | undefined,
  options: ProductionBonusOptions = {},
): HideoutProductionBonus {
  const crafting = !options.refining;
  const isSpecialty =
    crafting &&
    craftingCategory !== undefined &&
    biome.specialties.includes(craftingCategory);
  return withTotal(
    {
      mapQuality: isSpecialty ? mapQuality.specialtyBonus : 0,
      powerGeneral: crafting ? powerLevel.generalBonus : 0,
      powerSpecialist: isSpecialty ? powerLevel.specialistBonus : 0,
      refining: crafting ? 0 : refiningBonus,
      ...dailyAndFocus(craftingCategory, options),
    },
    options.override,
  );
}
