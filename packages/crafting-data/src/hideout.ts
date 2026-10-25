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

export interface Hideouts {
  biomes: Biome[];
  mapQualities: MapQuality[];
  powerLevels: PowerLevel[];
  refiningBonus: number;
}
