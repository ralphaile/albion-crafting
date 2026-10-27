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
