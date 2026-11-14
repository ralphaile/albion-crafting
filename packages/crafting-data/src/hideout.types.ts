export interface Biome {
  id: string;
  name: string;
  cityId: string;
  specialties: string[];
}

export interface MapQuality {
  quality: number;
  specialtyBonus: number;
}

export interface PowerLevel {
  level: number;
  generalBonus: number;
  specialistBonus: number;
}

// A Roads of Avalon zone. Its crafting categories get `specialtyBonus` plus
// the power level's specialist bonus, like a Black Zone biome's.
export interface RoadsZone {
  id: string;
  name: string;
  specialties: string[];
  specialtyBonus: number;
  refiningBonus: number;
  refiningSpecialties: Record<string, number>;
}

export interface Hideouts {
  biomes: readonly Biome[];
  roadsZones: readonly RoadsZone[];
  mapQualities: readonly MapQuality[];
  powerLevels: readonly PowerLevel[];
  refiningBonus: number;
}
