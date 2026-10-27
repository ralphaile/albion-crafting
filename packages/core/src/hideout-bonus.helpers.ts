import type { Hideout, HideoutProductionBonus } from "./hideout-bonus.types.js";
import { dailyAndFocus, withTotal } from "./production-bonus.helpers.js";
import type { ProductionBonusOptions } from "./production-bonus.types.js";

export function hideoutProductionBonus(
  { biome, mapQuality, powerLevel }: Hideout,
  craftingCategory: string | undefined,
  options: ProductionBonusOptions = {},
): HideoutProductionBonus {
  const isSpecialty =
    craftingCategory !== undefined &&
    biome.specialties.includes(craftingCategory);
  return withTotal(
    {
      mapQuality: isSpecialty ? mapQuality.specialtyBonus : 0,
      powerGeneral: powerLevel.generalBonus,
      powerSpecialist: isSpecialty ? powerLevel.specialistBonus : 0,
      ...dailyAndFocus(craftingCategory, options),
    },
    options.override,
  );
}
