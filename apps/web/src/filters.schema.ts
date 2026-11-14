import { z } from "zod";

import {
  ALL_CATEGORIES,
  CONSUMABLE_TIERS,
  ENCHANTS,
  MAX_DAILY_VOLUME,
  MAX_MARGIN_PERCENT,
  MAX_PROFIT,
  MAX_SEARCH_LENGTH,
  MODE_CATEGORIES,
  MODE_TIERS,
  NO_FILTERS,
} from "./filters.constants";
import type { Filters } from "./filters.types";

// Keeps only the values it knows, in their usual order and once each.
function choices<T>(allowed: readonly T[]) {
  return z
    .array(z.unknown())
    .transform((values) => allowed.filter((value) => values.includes(value)))
    .catch([]);
}

const filtersSchema = z.object({
  mode: z.enum(["crafting", "refining", "consumables"]).catch("crafting"),
  tiers: choices(CONSUMABLE_TIERS),
  enchants: choices(ENCHANTS),
  categories: choices(ALL_CATEGORIES.map(({ id }) => id)),
  artifacts: z.enum(["include", "exclude", "only"]).catch("include"),
  minProfit: z
    .int()
    .min(-MAX_PROFIT)
    .max(MAX_PROFIT)
    .optional()
    .catch(undefined),
  // A craft can't lose more than it cost, so no margin is below −100%.
  minMarginPercent: z
    .int()
    .min(-100)
    .max(MAX_MARGIN_PERCENT)
    .optional()
    .catch(undefined),
  minDailyVolume: z
    .int()
    .min(0)
    .max(MAX_DAILY_VOLUME)
    .optional()
    .catch(undefined),
  hideIncomplete: z.boolean().catch(false),
  specialtyOnly: z.boolean().catch(false),
  search: z
    .string()
    .transform((search) => search.slice(0, MAX_SEARCH_LENGTH))
    .catch(""),
});

// Keeps the tiers and categories the mode has. Only crafting has artifacts.
export function inMode(filters: Filters): Filters {
  const tiers = MODE_TIERS[filters.mode];
  const categories = MODE_CATEGORIES[filters.mode].map(({ id }) => id);
  return {
    ...filters,
    tiers: filters.tiers.filter((tier) => tiers.includes(tier)),
    categories: filters.categories.filter((id) => categories.includes(id)),
    artifacts:
      filters.mode === "crafting" ? filters.artifacts : NO_FILTERS.artifacts,
  };
}

// Each field that doesn't fit falls back to no filter, so a bad link or an old
// save never stops the app from opening.
export function parseFilters(raw: unknown): Filters {
  const parsed = filtersSchema.safeParse(raw);
  if (!parsed.success) {
    return NO_FILTERS;
  }
  const { minProfit, minMarginPercent, minDailyVolume, ...rest } = parsed.data;
  return inMode({ ...rest, minProfit, minMarginPercent, minDailyVolume });
}
