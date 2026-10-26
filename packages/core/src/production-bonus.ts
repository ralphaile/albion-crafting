import { bonusForReturnRate } from "./return-rate.js";

export interface CraftingSite {
  craftingBonus: number;
  specialties: Readonly<Record<string, number>>;
}

export interface DailyBonus {
  category: string;
  bonus: 0.1 | 0.2;
}

export type BonusOverride =
  { productionBonus: number } | { returnRate: number };

export interface ProductionBonusOptions {
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

const FOCUS_BONUS = 0.59;

export function productionBonus(
  site: CraftingSite,
  craftingCategory: string | undefined,
  { focus = false, dailyBonuses = [], override }: ProductionBonusOptions = {},
): ProductionBonus {
  const parts = {
    base: site.craftingBonus,
    specialty:
      craftingCategory === undefined
        ? 0
        : (site.specialties[craftingCategory] ?? 0),
    daily: dailyBonuses
      .filter(({ category }) => category === craftingCategory)
      .reduce((sum, { bonus }) => sum + bonus, 0),
    focus: focus ? FOCUS_BONUS : 0,
  };
  if (override === undefined) {
    return {
      ...parts,
      total: parts.base + parts.specialty + parts.daily + parts.focus,
    };
  }
  const total =
    "returnRate" in override
      ? bonusForReturnRate(override.returnRate)
      : override.productionBonus;
  if (!(total >= 0) || !Number.isFinite(total)) {
    throw new RangeError(
      `A production bonus must be 0 or more, but the override gives ${String(total)}`,
    );
  }
  return { ...parts, override: total, total };
}
