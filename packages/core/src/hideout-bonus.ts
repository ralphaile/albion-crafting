import {
  dailyAndFocus,
  type ProductionBonusOptions,
  withTotal,
} from "./production-bonus.js";

export interface Hideout {
  biome: { specialties: readonly string[] };
  mapQuality: { specialtyBonus: number };
  powerLevel: { generalBonus: number; specialistBonus: number };
}

export interface HideoutProductionBonus {
  mapQuality: number;
  powerGeneral: number;
  powerSpecialist: number;
  daily: number;
  focus: number;
  override?: number;
  total: number;
}

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
