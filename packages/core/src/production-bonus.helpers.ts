import type {
  BonusOverride,
  CraftingLocation,
  ProductionBonus,
  ProductionBonusOptions,
} from "./production-bonus.types.js";
import { bonusForReturnRate } from "./return-rate.helpers.js";

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
