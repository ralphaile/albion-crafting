import { z } from "zod";

import type { ManualPrice } from "./manual-prices.types";
import { serverSchema } from "./settings.schema";

const manualPriceSchema = z.object({
  region: serverSchema,
  itemId: z.string().min(1),
  marketId: z.string().min(1),
  quality: z.int().min(1).max(5),
  source: z.enum(["sellMin", "buyMax"]),
  value: z.int().positive(),
  enteredAt: z.int().nonnegative(),
});

// A saved price that doesn't fit is skipped, and the others are kept.
export function parseManualPrices(rows: readonly unknown[]): ManualPrice[] {
  return rows.flatMap((row) => {
    const parsed = manualPriceSchema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
}
