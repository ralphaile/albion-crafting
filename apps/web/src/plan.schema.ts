import { z } from "zod";

import { MAX_PLAN_QUANTITY, NO_PLAN } from "./plan.constants";
import type { CraftingPlan, PlanEntry } from "./plan.types";
import { RECIPES_BY_ID } from "./recipes.constants";
import { parseRoute } from "./route.schema";

const entrySchema = z.object({
  id: z.string(),
  itemId: z.string().refine((itemId) => RECIPES_BY_ID.has(itemId)),
  alternative: z.int().min(0).catch(0),
  quantity: z.int().min(1).max(MAX_PLAN_QUANTITY),
  focus: z.boolean().catch(true),
  dailyBonus: z.union([z.literal(0), z.literal(0.1), z.literal(0.2)]).catch(0),
});

// An alternative the recipe doesn't have falls back to its usual recipe.
function withKnownAlternative(entry: PlanEntry): PlanEntry {
  const alternatives = RECIPES_BY_ID.get(entry.itemId)?.alternatives ?? [];
  return entry.alternative > alternatives.length
    ? { ...entry, alternative: 0 }
    : entry;
}

// Keeps whatever fits, one entry at a time.
function each<T>(schema: z.ZodType<T>) {
  return z
    .array(z.unknown())
    .transform((values) =>
      values.flatMap((value) => {
        const parsed = schema.safeParse(value);
        return parsed.success ? [parsed.data] : [];
      }),
    )
    .catch([]);
}

const locationSchema = z.object({
  id: z.string(),
  route: z.unknown().transform(parseRoute),
  entries: each(entrySchema).transform((entries) =>
    entries.map(withKnownAlternative),
  ),
});

const planSchema = z.object({ locations: each(locationSchema) });

// An entry for an item the app no longer has, or with no quantity, is left out,
// so an old save never stops the app from opening.
export function parsePlan(raw: unknown): CraftingPlan {
  const parsed = planSchema.safeParse(raw);
  return parsed.success ? parsed.data : NO_PLAN;
}
