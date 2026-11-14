export interface Hideout {
  biome: { specialties: readonly string[] };
  mapQuality: { specialtyBonus: number };
  powerLevel: { generalBonus: number; specialistBonus: number };
  refiningBonus: number;
  // Only a Roads of Avalon hideout has them, such as hide +0.10.
  refiningSpecialties?: Readonly<Record<string, number>>;
}

export interface HideoutProductionBonus {
  mapQuality: number;
  powerGeneral: number;
  powerSpecialist: number;
  refining: number;
  refiningSpecialty: number;
  daily: number;
  focus: number;
  override?: number;
  total: number;
}
