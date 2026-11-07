// Refining has a base bonus and specialties of its own, such as Thetford's
// +0.40 for ore.
export interface CraftingLocation {
  id: string;
  name: string;
  craftingBonus: number;
  specialties: Readonly<Record<string, number>>;
  refiningBonus: number;
  refiningSpecialties: Readonly<Record<string, number>>;
}

export interface DailyBonus {
  category: string;
  bonus: 0.1 | 0.2;
}

export type BonusOverride =
  { productionBonus: number } | { returnRate: number };

export interface ProductionBonusOptions {
  refining?: boolean;
  focus?: boolean;
  dailyBonuses?: readonly DailyBonus[];
  override?: BonusOverride;
}

export interface ProductionBonus {
  base: number;
  specialty: number;
  daily: number;
  focus: number;
  override?: number;
  total: number;
}
