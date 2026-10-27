import { z } from "zod";

import {
  CATEGORIES,
  ENCHANTS,
  MAX_MARGIN_PERCENT,
  MAX_PROFIT,
  MAX_SEARCH_LENGTH,
  NO_FILTERS,
  TIERS,
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
  tiers: choices(TIERS),
  enchants: choices(ENCHANTS),
  categories: choices(CATEGORIES.map(({ id }) => id)),
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
  hideIncomplete: z.boolean().catch(false),
  specialtyOnly: z.boolean().catch(false),
  search: z
    .string()
    .transform((search) => search.slice(0, MAX_SEARCH_LENGTH))
    .catch(""),
});

// Each field that doesn't fit falls back to no filter, so a bad link or an old
// save never stops the app from opening.
export function parseFilters(raw: unknown): Filters {
  const parsed = filtersSchema.safeParse(raw);
  if (!parsed.success) {
    return NO_FILTERS;
  }
  const { minProfit, minMarginPercent, ...rest } = parsed.data;
  return { ...rest, minProfit, minMarginPercent };
}
