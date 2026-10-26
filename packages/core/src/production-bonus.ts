import { bonusForReturnRate } from "./return-rate.js";

export interface CraftingLocation {
  id: string;
  name: string;
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
  location: CraftingLocation,
  craftingCategory: string | undefined,
  options: ProductionBonusOptions = {},
): ProductionBonus {
  return withTotal(
    {
      base: location.craftingBonus,
      specialty:
        craftingCategory === undefined
          ? 0
          : (location.specialties[craftingCategory] ?? 0),
      ...dailyAndFocus(craftingCategory, options),
    },
    options.override,
  );
}

export function dailyAndFocus(
  craftingCategory: string | undefined,
  { focus = false, dailyBonuses = [] }: ProductionBonusOptions,
) {
  return {
    daily: dailyBonuses
      .filter(({ category }) => category === craftingCategory)
      .reduce((sum, { bonus }) => sum + bonus, 0),
    focus: focus ? FOCUS_BONUS : 0,
  };
}

export function withTotal<Parts extends Record<string, number>>(
  parts: Parts,
  override: BonusOverride | undefined,
): Parts & { override?: number; total: number } {
  if (override === undefined) {
    return {
      ...parts,
      total: Object.values(parts).reduce((sum, part) => sum + part, 0),
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
